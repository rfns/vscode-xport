import * as vscode from 'vscode'
import * as output from './shared/output'
import * as message from './shared/message'
import * as events from './events'
import * as commands from './commands'
import { API } from './api'
import { getWorkspaceConfiguration, getWorkspaceFolderByName } from './shared/workspace'
import { Configuration } from './types'
import { ProjectExplorerProvider } from './explorer/projectExplorer'
import { XRFDocumentProvider, XRF_SCHEME } from './xrf'
import { HealthCheck } from './healthCheck'
import { DocumentLocker } from './shared/locker'

export class Core {
  public readonly api: API
  public readonly output: any
  public readonly message: any
  public readonly projectExplorerProvider: ProjectExplorerProvider = new ProjectExplorerProvider(this)
  public readonly xrfDocumentProvider: XRFDocumentProvider = new XRFDocumentProvider(this)
  public readonly documentLocker = new DocumentLocker()

  public configuration: Configuration = getWorkspaceConfiguration()

  private _healthCheck?: HealthCheck
  private _onDidChangeConfiguration: vscode.Disposable = events.onDidChangeConfiguration.listen(this)
  private _internalDisposables: vscode.Disposable[] = []
  private _disposables: vscode.Disposable[] = []

  constructor () {
    this.api = new API(this.configuration, output)
    this._disposables = []

    this.output = output
    this.message = message

    this._registerInternalDiposables()
  }

  dispose () {
    this._onDidChangeConfiguration.dispose()
    this._softDispose()
  }

  private _registerInternalDiposables () {
    this._internalDisposables.push(commands.disableExtension.register())
    this._internalDisposables.push(commands.enableExtension.register())
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

  init () {
    this.configuration = getWorkspaceConfiguration()
    this.projectExplorerProvider.refresh()

    if (!this.configuration || !this.configuration.enabled) {
      this.disable()
      if (!this.configuration) this.output.display('WARNING: No configuration found.', 'WORKSPACE')
      else this.output.display(`WARNING: Extension is disabled. in this state there's no communication with the server. Set the configuration 'xport.core.enabled' to true in order to enable it.`, 'WORKSPACE')
    } else {
      this.output.display('Found a valid configuration.', 'WORKSPACE')
      this._describeConfiguration()

      this.api.setup(this.configuration)
      this._configureHealthCheck()

      vscode.commands.executeCommand('setContext', 'projectExplorerEnabled', true)
      vscode.commands.executeCommand('setContext', 'busy', false)

      if (this._disposables.length === 0) {
        this.registerProviders()
        this.registerListenersAndWatchers(this.configuration)
        this.registerCommands()
      }
    }
  }

  private _describeConfiguration () {
    const { configuration } = this
    const headerEntries = configuration.headers && Object.entries(configuration.headers) || []
    this.output.display(`Host: ${configuration.host} Namespace: ${configuration.namespace}, User: ${configuration.authentication.username}. Headers: ${headerEntries.map(([k, v]) => `${k}: ${v}`).join(', ') || 'none'}.`, 'WORKSPACE')
  }

  registerListenersAndWatchers (configuration: Configuration) {
    this._disposables.push(events.onDidSaveTextDocument.listen(this))
    this._disposables.push(events.onDidChangeActiveTextEditor.listen(this))
    this._disposables.push(events.onWillSaveTextDocument.listen(this))
    this.output.display(`Watching the following folders: ${configuration.watchFolders}.`, 'WORKSPACE')
  }

  registerCommands () {
    this._disposables.push(commands.deleteProject.register(this))
    this._disposables.push(commands.pickItem.register(this))
    this._disposables.push(commands.fetchProject.register(this))
    this._disposables.push(commands.compileProject.register(this))
    this._disposables.push(commands.removeItem.register(this))
    this._disposables.push(commands.deleteItem.register(this))
    this._disposables.push(commands.previewDocument.register())
    this._disposables.push(commands.compareDocumentVersions.register(this))
    this._disposables.push(commands.refreshItems.register(this))
    this._disposables.push(commands.findDocuments.register(this))
    this._disposables.push(commands.fetchDocument.register(this))
    this._disposables.push(commands.publishDocument.register(this))
    this._disposables.push(commands.publishFolder.register(this))
    this._disposables.push(commands.publishWorkspaceFolder.register(this))
    this._disposables.push(commands.repairProject.register(this))
    this._disposables.push(commands.previewBinary.register(this))

    this.output.display('All commands have been registered.', 'WORKSPACE')
  }

  registerProviders () {
    this._disposables.push(vscode.workspace.registerTextDocumentContentProvider(XRF_SCHEME, this.xrfDocumentProvider))
    this._disposables.push(vscode.window.createTreeView('projectExplorer', { treeDataProvider: this.projectExplorerProvider, showCollapseAll: true }))
  }

  disable () {
    this._softDispose()
    vscode.commands.executeCommand('setContext', 'projectExplorerEnabled', false)
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
