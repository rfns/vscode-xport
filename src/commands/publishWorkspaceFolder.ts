import * as vscode from 'vscode'
import { Core } from '../core'

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.commands.publishWorkspaceFolder', async () => {
    if (!vscode.workspace.workspaceFolders) return

    const choices = vscode.workspace.workspaceFolders.map(workspaceFolder => {
      return { label: workspaceFolder.name, description: workspaceFolder.uri.fsPath, workspaceFolder }
    })

    const selection = await vscode.window.showQuickPick(choices, { placeHolder: 'Select the workspace folder you want to publish:' })
    if (selection) return vscode.commands.executeCommand('xport.commands.publishFolder', selection.workspaceFolder.uri)
  })
}
