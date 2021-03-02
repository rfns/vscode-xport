import * as vscode from 'vscode'
import { Core } from '../core'

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.commands.enableExtension', async () => {
    const uri = vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri
    const configurationManager = vscode.workspace.getConfiguration('xport', uri)
    await configurationManager.update('core.enabled', true)
  })
}
