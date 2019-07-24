import * as vscode from 'vscode'

export function register () {
  return vscode.commands.registerCommand('xport.commands.previewDocument', (uri: vscode.Uri) => {
    return vscode.window.showTextDocument(uri)
  })
}
