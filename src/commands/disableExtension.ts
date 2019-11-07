import * as vscode from 'vscode'

export function register (): vscode.Disposable {
  return vscode.commands.registerCommand('xport.commands.disableExtension', async () => {
    const configurationManager = vscode.workspace.getConfiguration('xport')
    await configurationManager.update('core.enabled', false)
    await vscode.commands.executeCommand('setContext', 'projectExplorerEnabled', false)
  })
}
