import * as vscode from 'vscode'
import { Core } from '../core'

export function register (core: Core) {
  return vscode.commands.registerCommand('xport.commands.previewDocument', (uri: vscode.Uri) => {
    return vscode.window.showTextDocument(uri)
  })
}
