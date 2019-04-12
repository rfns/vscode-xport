import * as vscode from 'vscode'
import * as path from 'path'
import { XRFRepository } from './repository'

export class XRFSourceControlProvider {
  private xrfScm: vscode.SourceControl
  private changedResources: vscode.SourceControlResourceGroup
  private xrfRepository: XRFRepository
  private _onRepositoryChange = new vscode.EventEmitter<any>()
  private _fsWatcher?: vscode.FileSystemWatcher

  constructor (workspaceFolder: vscode.WorkspaceFolder) {
    this.xrfScm = vscode.scm.createSourceControl('xrf', 'XPort Source Control', workspaceFolder.uri)
    this.changedResources = this.xrfScm.createResourceGroup('workingTree', 'Changes')
    this.xrfRepository = new XRFRepository(workspaceFolder)

    this._createFileWatchers(workspaceFolder)
  }

  private _createFileWatchers (workspaceFolder: vscode.WorkspaceFolder) {
    const pattern = new vscode.RelativePattern(workspaceFolder, `{cls,web,inc,mac,int}/**/*`)
    this._fsWatcher = vscode.workspace.createFileSystemWatcher(pattern)
  }

  get repository () {
    vscode.TextDocumentSaveReason.AfterDelay
    return this.xrfRepository
  }

  get sourceControl () {
    return this.xrfScm
  }
}

