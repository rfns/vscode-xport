import * as vscode from 'vscode'
import { Core } from '../core'

export function listen (core: Core): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration(async (e: vscode.ConfigurationChangeEvent) => {
    core.output.display('Refreshed context because detected changes in the current workspace settings.', 'WORKSPACE')
    const workspaceFolder = vscode.window.activeTextEditor && vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)

    if (workspaceFolder) {
      core.refresh(workspaceFolder)
    } else {
      core.init()
    }
  })
}
