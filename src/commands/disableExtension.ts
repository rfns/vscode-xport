import * as vscode from 'vscode'

export function register (): vscode.Disposable {
  return vscode.commands.registerCommand('xport.commands.disableExtension', async () => {
    const uri = vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri
    const configurationManager = vscode.workspace.getConfiguration('xport', uri)
    await configurationManager.update('core.enabled', false)
  })
}
