import * as vscode from 'vscode'
import { Core } from '../core'

export function listen (core: Core): vscode.Disposable {
  return vscode.workspace.onWillSaveTextDocument(event => {
    const path = event.document.uri.fsPath
    event.waitUntil(core.documentLocker.provideLockReason(path))
  })
}
