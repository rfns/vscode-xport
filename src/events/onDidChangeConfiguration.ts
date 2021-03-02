import * as vscode from 'vscode'
import { Core } from '../core'
import { getWorkspaceConfiguration } from '../shared/workspace'

export function listen (core: Core): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration(async (e: vscode.ConfigurationChangeEvent) => {
    core.output.display('Refreshed context because detected changes in the current workspace settings.', 'WORKSPACE')
    const workspaceFolder = vscode.window.activeTextEditor && vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)
    const configuration = getWorkspaceConfiguration(workspaceFolder)

    if (configuration.enabled) {
      core.refresh(workspaceFolder, true)
    } else {
      core.disable()
    }
  })
}
