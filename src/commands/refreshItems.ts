import * as vscode from 'vscode'
import { Core } from '../core'

export function register(core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.projectExplorer.refreshItems', () => {
    return core.projectExplorerProvider.refresh()
  })
}
