import * as vscode from 'vscode'
import * as output from './shared/output'
import * as message from './shared/message'
import * as events from './events'
import * as commands from './commands'
import { API } from './api'
import { getWorkspaceConfiguration } from './shared/workspace'
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

  public configuration: Configuration | null = null
  public disposables: vscode.Disposable[]

  private _healthCheck?: HealthCheck
  private _onDidChangeConfiguration: vscode.Disposable = events.onDidChangeConfiguration.listen(this)

  constructor () {
    this.api = new API(this.configuration, output)
    this.disposables = []

    this.output = output
    this.message = message
  }

  dispose () {
    this._onDidChangeConfiguration.dispose()
    this._softDispose()
  }

  private _softDispose () {
    if (this._healthCheck) {
      this._healthCheck.stopHealthCheck()
      this._healthCheck = undefined
    }

    this.disposables.forEach(disposable => disposable.dispose())
    this.disposables = []
  }

  init () {
    this.configuration = getWorkspaceConfiguration()
    this.projectExplorerProvider.refresh()

    if (!this.configuration || !this.configuration.enabled) {
      this.disable()
      if (!this.configuration) this.output.display('Warning: No configuration found.', 'root')
      else this.output.display(`Warning: Extension is disabled. in this state there's no communication with the server. Set the configuration 'xport.core.enabled' to true in order to enable it.`, 'root')
    } else {
      this.output.display('Found a valid configuration.', 'root')
      this.output.display('Configuration is as follows:', 'root')
      this.output.display(`Endpoint is set to ${this.configuration.host}.`, 'root')
      this.output.display(`Using namespace ${this.configuration.namespace}.`, 'root')

      if (this.configuration.authentication) {
        this.output.display(`Logging as ${this.configuration.authentication.username}.`, 'root')
      } else {
        this.output.display('Warning: No credentials were provided. The client API will not be able to communicate with the server.', 'root')
      }

      const headerEntries = this.configuration.headers && Object.entries(this.configuration.headers) || []

      if (headerEntries.length) {
        this.output.display(`Using custom headers: ${headerEntries.map(([k, v]) => `${k}: ${v}`).join(', ')}`, 'root')
      } else {
        this.output.display('No custom headers were provided.', 'root')
      }
      this.output.display('Watching for configuration changes.', 'root')

      this.api.setup(this.configuration)
      this._configureHealthCheck()
      vscode.commands.executeCommand('setContext', 'projectExplorerEnabled', true)

      if (this.disposables.length === 0) {
        this.registerProviders()
        this.registerListenersAndWatchers()
        this.registerCommands()
      }
    }
  }

  registerListenersAndWatchers () {
    this.disposables.push(events.onDidSaveTextDocument.listen(this))
    this.disposables.push(events.onDidChangeActiveTextEditor.listen(this))
    this.disposables.push(events.onWillSaveTextDocument.listen(this))
    this.output.display('Watching for text document changes.', 'root')
  }

  registerCommands () {
    this.disposables.push(commands.deleteProject.register(this))
    this.disposables.push(commands.downloadItem.register(this))
    this.disposables.push(commands.downloadProject.register(this))
    this.disposables.push(commands.compileProject.register(this))
    this.disposables.push(commands.removeItem.register(this))
    this.disposables.push(commands.deleteItem.register(this))
    this.disposables.push(commands.previewDocument.register(this))
    this.disposables.push(commands.compareDocumentVersions.register(this))
    this.disposables.push(commands.refreshItems.register(this))
    this.disposables.push(commands.findDocuments.register(this))
    this.disposables.push(commands.importDocument.register(this))
    this.disposables.push(commands.publishDocument.register(this))
    this.disposables.push(commands.publishFolder.register(this))
    this.disposables.push(commands.publishWorkspaceFolder.register(this))
    this.disposables.push(commands.repairProject.register(this))
    this.disposables.push(commands.previewBinary.register(this))

    this.output.display('Registered commands.', 'root')
  }

  registerProviders () {
    this.disposables.push(vscode.workspace.registerTextDocumentContentProvider(XRF_SCHEME, this.xrfDocumentProvider))
    this.disposables.push(vscode.window.createTreeView('projectExplorer', { treeDataProvider: this.projectExplorerProvider, showCollapseAll: true }))
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
