import * as vscode from 'vscode'
import { Core } from '../core'
import { getWorkspaceConfiguration } from '../shared/workspace'

export function listen (core: Core): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration(async (e?: vscode.ConfigurationChangeEvent) => {
    const workspaceFolder = vscode.window.activeTextEditor && vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)

    if (e && e.affectsConfiguration('xport', workspaceFolder.uri)) {
      const configuration = getWorkspaceConfiguration(workspaceFolder)
      core.output.display('Refreshing settings context.', workspaceFolder.name)

      if (configuration.enabled) {
        core.refresh(workspaceFolder, true)
      } else {
        core.disable()
      }
    }
  })
}
