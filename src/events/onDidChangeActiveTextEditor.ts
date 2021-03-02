import * as vscode from 'vscode'
import debounce = require('lodash.debounce')
import { Core } from '../core'
import { XRF_SCHEME } from '../xrf'
import { getWorkspaceConfiguration } from '../shared/workspace'

export function listen (core: Core): vscode.Disposable {
  const executeOnce = debounce((uri: vscode.Uri) => {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)
    const configuration = getWorkspaceConfiguration(workspaceFolder)

    if (configuration.enabled) {
      core.refresh(workspaceFolder)
    } else {
      core.disable()
    }

    if (uri.scheme == XRF_SCHEME) {
      core.xrfDocumentProvider.refresh(uri)
    }
  }, 300)

  return vscode.window.onDidChangeActiveTextEditor((textEditor?: vscode.TextEditor) => {
    if (!textEditor) return

    executeOnce(textEditor.document.uri)
  })
}
