import * as vscode from 'vscode'
import { Core } from '../core'

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.commands.findDocuments', () => {
    core.finder.show()
  })
}
