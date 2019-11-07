import * as vscode from 'vscode'

export function register (): vscode.Disposable {
  return vscode.commands.registerCommand('xport.commands.enableExtension', async () => {
    const configurationManager = vscode.workspace.getConfiguration('xport')
    await configurationManager.update('core.enabled', true)
  })
}
