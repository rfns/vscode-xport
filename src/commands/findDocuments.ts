import * as vscode from 'vscode'
import { Core } from '../core'
import { XRFDocumentFinder } from '../xrf'

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.commands.findDocuments', () => {
    const finder = new XRFDocumentFinder(core)
    finder.show()
  })
}
