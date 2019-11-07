import * as vscode from 'vscode'
import { Core } from '../core'

export function listen (core: Core): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration(async (e: any) => {
    core.output.display('Refreshed context because detected changes in the current workspace settings.', 'WORKSPACE')
    core.init()
  })
}
