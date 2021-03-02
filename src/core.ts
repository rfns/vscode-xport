import * as vscode from 'vscode'
import * as output from './shared/output'
import * as message from './shared/message'
import * as events from './events'
import * as commands from './commands'
import { to } from 'await-to-js'
import { API } from './api'
import { getWorkspaceConfiguration, getActiveWorkspaceFolder } from './shared/workspace'
import { Configuration } from './types'
import { ProjectExplorerProvider } from './explorer'
import { XRFDocumentProvider, XRF_SCHEME } from './xrf'
import { HealthCheck } from './healthCheck'
import { DocumentLocker } from './shared/locker'
import finder from './xrf/finder'
import xmlExporter from './quickpickers/xmlExporter'

export class Core {
  public readonly api: API
  public readonly output: any
  public readonly message: any
  public readonly projectExplorerProvider: ProjectExplorerProvider = new ProjectExplorerProvider(this)
  public readonly xrfDocumentProvider: XRFDocumentProvider = new XRFDocumentProvider(this)
  public readonly documentLocker = new DocumentLocker()
  public readonly finder = finder.build(this)
  public readonly exporter = xmlExporter.build(this)
  public readonly statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
  public workspaceFolder?: vscode.WorkspaceFolder

  public configuration: Configuration = getWorkspaceConfiguration()

  private _healthCheck?: HealthCheck
  private _internalDisposables: vscode.Disposable[] = []
  private _disposables: vscode.Disposable[] = []
  private _coldBoot: boolean = true
  private _nextWorkspaceFolder?: vscode.WorkspaceFolder
  private _busy: boolean = false
  private _shouldForce: boolean = false

  constructor () {
    this.api = new API(this.configuration, output)
    this._disposables = []

    this.output = output
    this.message = message

    this._registerInternalDiposables()
  }

  isSameWorkspace (workspaceFolder: vscode.WorkspaceFolder) {
    return this.workspaceFolder === workspaceFolder
  }

  dispose () {
    this.disposables.forEach(disposable => disposable.dispose())
  }

  private _registerInternalDiposables () {
    this._internalDisposables.push(commands.disableExtension.register())
    this._internalDisposables.push(commands.enableExtension.register(this))
    this._internalDisposables.push(events.onDidChangeActiveTextEditor.listen(this))
    this._internalDisposables.push(events.onDidChangeConfiguration.listen(this))
  }

  private _softDispose () {
    if (this._healthCheck) {
      this._healthCheck.stopHealthCheck()
      this._healthCheck = undefined
    }

    this._disposables.forEach(disposable => disposable.dispose())
    this._disposables = []
  }

  get disposables () {
    return [
      ...this._disposables,
      ...this._internalDisposables
    ]
  }

  private _safelyGetWorkspaceFolderName (workspaceFolder?: vscode.WorkspaceFolder): string {
    return workspaceFolder && workspaceFolder.name || 'WORKSPACE'
  }

  private async _describeVersion (workspaceFolder?: vscode.WorkspaceFolder) : Promise<boolean> {
    if (!this._coldBoot) return true
    const name = this._safelyGetWorkspaceFolderName(workspaceFolder)

    if (this._coldBoot) this.output.display(`Extension version: ${require('../package.json').version}.`, name)
    const validAPI = this._describeAPIVersion(workspaceFolder)
    this._coldBoot = false
    return validAPI
  }

  private async _describeAPIVersion (workspaceFolder?: vscode.WorkspaceFolder): Promise<boolean> {
    const [err, version] = await to(this.api.version())
    const name = this._safelyGetWorkspaceFolderName(workspaceFolder)

    if (err) {
      this.disable()
      this.output.display(`Failed to retrieve the API version. This is caused mostly because the host is unachievable or the API is not installed correctly.`, name)
      this.output.display(`Error: ${err.message}`, name)
      message.displayError(this.output, 'Unable to connect to the API.', name)
      return false
    }

    this.output.display(`Using API version: ${version}.`, workspaceFolder && workspaceFolder.name || name)
    return true
  }

  private _refresh (workspaceFolder?: vscode.WorkspaceFolder, force?: boolean): boolean {
    if (this._coldBoot) {
      this.init()
      return true
    }

    if (!workspaceFolder || this._coldBoot || (this.isSameWorkspace(workspaceFolder) && !force)) {
      return false
    }

    this.workspaceFolder = workspaceFolder

    this.configuration = getWorkspaceConfiguration(this.workspaceFolder)
    this._updateStatus(this.workspaceFolder)
    this.api.setup(this.configuration)

    if (!this.configuration.enabled) return false
    setTimeout(() => this.projectExplorerProvider.refresh(), 200)

    this.output.display('Refreshing configuration.', workspaceFolder.name)
    this._describeAPIVersion(workspaceFolder)
    this._describeConfiguration(workspaceFolder)
    this._registerExternalDisposables()

    vscode.commands.executeCommand('setContext', 'projectExplorerEnabled', this.configuration.enabled)
    return true
  }

  private _updateStatus (workspaceFolder?: vscode.WorkspaceFolder) {
    if (!workspaceFolder) return

    let status = 'Disconnected'
    const config = getWorkspaceConfiguration(workspaceFolder)

    if (config && config.enabled) status = 'Connected'
    this.statusBar.text = `XPort (${workspaceFolder.name}): ${status}`
    this.statusBar.show()
  }

  refresh (workspaceFolder?: vscode.WorkspaceFolder, force: boolean = false): boolean {
    if (this.busy) {
      this._nextWorkspaceFolder = workspaceFolder
      this._shouldForce = force
      return false
    }
    return this._refresh(workspaceFolder, force)
  }

  set busy (value: boolean) {
    this._busy = value

    if (!this._busy) {
      this._refresh(this._nextWorkspaceFolder, this._shouldForce)
    }
  }

  get busy () {
    return this._busy
  }

  async init () {
    vscode.window.withProgress({
      title: 'XPort',
      location: vscode.ProgressLocation.Notification
    }, async (progress) => {
      progress.report({ message: 'Attempting to connect to your Caché/IRIS instance. Please wait.'})

      const uri = vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri
      const workspaceFolder = uri && vscode.workspace.getWorkspaceFolder(uri)

      const name = this._safelyGetWorkspaceFolderName(workspaceFolder)

      this.workspaceFolder = workspaceFolder
      this.configuration = getWorkspaceConfiguration(workspaceFolder)
      this.projectExplorerProvider.refresh()

      this._updateStatus(workspaceFolder)

      if (!this.configuration || !this.configuration.enabled) {
        this.disable()
        if (!this.configuration) this.output.display('WARNING: No configuration found.', name)
        else this.output.display(`WARNING: Extension is disabled. in this state there's no communication with the server. Set the configuration 'xport.core.enabled' to true in order to enable it.`, name)
      } else {
        this.output.display('Found a valid configuration.', name)
        this.api.setup(this.configuration)

        const gotAllVersions = await this._describeVersion(workspaceFolder)
        if (!gotAllVersions) return

        this._describeConfiguration(workspaceFolder)
        this._configureHealthCheck()

        vscode.commands.executeCommand('setContext', 'projectExplorerEnabled', true)
        vscode.commands.executeCommand('setContext', 'busy', false)

        this._busy = false
        this._registerExternalDisposables()
      }
    })
  }

  _registerExternalDisposables () {
    if (this._disposables.length === 0) {
      this.registerProviders()
      this.registerListenersAndWatchers()
      this.registerCommands()
    }
  }

  private _describeConfiguration (workspaceFolder?: vscode.WorkspaceFolder) {
    const { configuration } = this
    const name = this._safelyGetWorkspaceFolderName(workspaceFolder)
    const headerEntries = configuration.headers && Object.entries(configuration.headers) || []
    this.output.display(`Host: ${configuration.host} Namespace: ${configuration.namespace}, User: ${configuration.authentication.username}. Headers: ${headerEntries.map(([k, v]) => `${k}: ${v}`).join(', ') || 'none'}.`, name)
  }

  registerListenersAndWatchers () {
    const name = this._safelyGetWorkspaceFolderName(this.workspaceFolder)
    this._disposables.push(events.onDidSaveTextDocument.listen(this))
    this._disposables.push(events.onDidChangeActiveTextEditor.listen(this))
    this._disposables.push(events.onWillSaveTextDocument.listen(this))
    this.output.display(`Watching the following folders: ${this.configuration.watchFolders}.`, name)
  }

  registerCommands () {
    this._disposables.push(commands.deleteProject.register(this))
    this._disposables.push(commands.fetchItems.register(this))
    this._disposables.push(commands.fetchProject.register(this))
    this._disposables.push(commands.compileProject.register(this))
    this._disposables.push(commands.removeItem.register(this))
    this._disposables.push(commands.deleteItem.register(this))
    this._disposables.push(commands.previewDocument.register(this))
    this._disposables.push(commands.compareDocumentVersions.register(this))
    this._disposables.push(commands.refreshItems.register(this))
    this._disposables.push(commands.findDocuments.register(this))
    this._disposables.push(commands.fetchDocument.register(this))
    this._disposables.push(commands.publishDocument.register(this))
    this._disposables.push(commands.publishFolder.register(this))
    this._disposables.push(commands.publishWorkspaceFolder.register(this))
    this._disposables.push(commands.repairProject.register(this))
    this._disposables.push(commands.previewBinary.register(this))
    this._disposables.push(commands.openXMLExportSelector.register(this))

    this.output.display('All commands have been registered.', 'WORKSPACE')
  }

  registerProviders () {
    this._disposables.push(vscode.workspace.registerTextDocumentContentProvider(XRF_SCHEME, this.xrfDocumentProvider))
    this._disposables.push(vscode.window.createTreeView('projectExplorer', { treeDataProvider: this.projectExplorerProvider, showCollapseAll: true }))
    this._disposables.push(this.exporter)
    this._disposables.push(this.finder)
  }

  disable () {
    if (this._coldBoot) return
    const workspaceFolder = getActiveWorkspaceFolder() || undefined
    const name = this._safelyGetWorkspaceFolderName(workspaceFolder)

    this._softDispose()
    this.busy = false

    vscode.commands.executeCommand('setContext', 'projectExplorerEnabled', false)
    this.output.display('The extension has been disabled.', name)
  }

  private _configureHealthCheck () {
    if (!this.configuration) return
    const ms = parseInt(this.configuration.healthCheck)

    if (ms) {
      if (this._healthCheck) this._healthCheck.configureInterval(ms)
      else this._healthCheck = new HealthCheck(this, ms, true)
    } else if (!ms && this._healthCheck) {
      this._healthCheck.stopHealthCheck()
    }
  }
}
