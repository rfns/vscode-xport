import * as vscode from 'vscode'
import * as url from 'url'
import debounce = require('lodash.debounce')
import { to } from 'await-to-js'
import { Core } from '../core'

export class XRFDocumentProvider implements vscode.TextDocumentContentProvider {
  private _onDidChange: vscode.EventEmitter<any> = new vscode.EventEmitter<vscode.Uri>();
	readonly onDidChange: vscode.Event<vscode.Uri> = this._onDidChange.event

  private core: Core

  constructor (core: Core) {
    this.core = core
  }

  refresh (uri?: vscode.Uri) {
    if (!uri && vscode.window.activeTextEditor) {
      const { document } = vscode.window.activeTextEditor
      uri = document.uri
    }

    this._onDidChange.fire(uri)
  }

  async provideTextDocumentContent (uri: vscode.Uri) {
    return vscode.window.withProgress({
      location: vscode.ProgressLocation.Window,
      title: 'XPort: Fetching document content'
    }, async () => {
      const parsedUrl = url.parse(uri.toString())
      if (parsedUrl.path) {
        const [err, response] = await to(this.core.api.preview(parsedUrl.path))

        let document = response && response.preview.join('\n')
        let error = err && err.message

        return document || error
      }
      return ''
    })
  }
}
