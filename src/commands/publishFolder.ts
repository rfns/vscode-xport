import * as vscode from 'vscode'
import { expandPaths } from '../shared/document'
import { groupDocumentsByProject, publishProjectItems } from '../shared/project'
import { getDocumentText } from '../shared/document'
import { Core } from '../core'

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.commands.publishFolder', async (uri: vscode.Uri) => {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)
    if (!workspaceFolder) return

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      cancellable: true
    }, async (progress: any, token: vscode.CancellationToken) => {
      progress.report({ message: 'Discovering files (0 files found).' })

      const uris = await expandPaths([uri], progress)
      const documents = await Promise.all(uris.map(async uri => getDocumentText(uri)))

      progress.report({ message: 'Grouping matches by project ...' })
      const groups = await groupDocumentsByProject(documents)

      await publishProjectItems(core, workspaceFolder, groups[workspaceFolder.name].items, 5, progress, token)
    })
  })
}
