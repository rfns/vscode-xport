import * as vscode from 'vscode'
import { expandPaths } from '../shared/document'
import { groupDocumentsByProject, publishProjectItems } from '../shared/project'
import { getDocumentFromUri } from '../shared/document'
import { Core } from '../core'

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.commands.publishFolder', (uri: vscode.Uri) => {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)
    if (!workspaceFolder) return

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Window
    }, async (progress: any) => {
      const uris = await expandPaths([uri])
      const documents = await Promise.all(uris.map(async uri => getDocumentFromUri(uri)))
      const groups = groupDocumentsByProject(documents)
      return publishProjectItems(core, workspaceFolder, groups[workspaceFolder.name].items, progress)
    })
  })
}
