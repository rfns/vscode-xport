import * as vscode from 'vscode'
import { publishProjectItems } from '../shared/project'
import { groupDocumentsByProject } from '../shared/project'
import { Core } from '../core'

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.commands.publishDocument', async () => {
    const { activeTextEditor } = vscode.window
    if (!activeTextEditor || !core.configuration) return

    const doc = activeTextEditor.document
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri)
    if (!workspaceFolder) return

    if (!core.isSameWorkspace(workspaceFolder)) {
      core.refresh(workspaceFolder)
    }

    const { flags } = core.configuration

    return vscode.window.withProgress({
      location: vscode.ProgressLocation.Window,
      cancellable: true
    }, async (progress: any, token: vscode.CancellationToken) => {
      const { [workspaceFolder.name]: { items } } = await groupDocumentsByProject([doc], token)

      await publishProjectItems({
        core,
        workspaceFolder,
        items,
        range: 1,
        progress,
        token,
        flags
      })

      core.projectExplorerProvider.refresh()
    })
  })
}
