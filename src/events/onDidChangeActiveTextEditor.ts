import * as vscode from 'vscode'
import debounce = require('lodash.debounce')
import { Core } from '../core'
import { XRF_SCHEME } from '../xrf'

export function listen (core: Core): vscode.Disposable {
  const debouncedRefresh = debounce((uri: vscode.Uri) => core.xrfDocumentProvider.refresh(uri), 300)

  return vscode.window.onDidChangeActiveTextEditor((textEditor?: vscode.TextEditor) => {
    if (!textEditor) return
    if (textEditor.document.uri.scheme == XRF_SCHEME) {
      debouncedRefresh(textEditor.document.uri)
    }
  })
}
