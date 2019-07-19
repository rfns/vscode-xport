import * as vscode from 'vscode'
import { publishProjectItems } from '../shared/project'
import { groupDocumentsByProject } from '../shared/project'
import { Core } from '../core'

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.commands.publishDocument', async () => {
    const { activeTextEditor } = vscode.window
    if (!activeTextEditor) return

    const doc = activeTextEditor.document
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri)

    if (workspaceFolder) {
      return vscode.window.withProgress({
        location: vscode.ProgressLocation.Window
      }, async (progress: any) => {
        const { [workspaceFolder.name]: { items } } = groupDocumentsByProject([doc])

        await publishProjectItems(core, workspaceFolder, items, 1, progress)
        core.projectExplorerProvider.refresh()
      })
    }
  })
}
