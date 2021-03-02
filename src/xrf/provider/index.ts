import * as vscode from 'vscode'
import * as url from 'url'
import { to } from 'await-to-js'
import { Core } from '../../core'
import { getFileEncodingConfiguration } from '../../shared/document'
import { EncodingDirection } from '../../types'

export class XRFDocumentProvider implements vscode.TextDocumentContentProvider {
  private _onDidChange: vscode.EventEmitter<any> = new vscode.EventEmitter<vscode.Uri>()
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

  _handleBinary (type: string, chunks: string[]) {
    return `data:${type};base64,${chunks.join('\n')}`
  }

  async provideTextDocumentContent (uri: vscode.Uri) {
    return vscode.window.withProgress({
      location: vscode.ProgressLocation.Window,
      title: 'XPort: Fetching document content'
    }, async () => {
      const parsedUrl = url.parse(uri.toString())
      if (parsedUrl.path) {
        const resource = parsedUrl.path.startsWith('/') ? parsedUrl.path.substring(1) : parsedUrl.path
        const [err, response] = await to(
          this.core.api.preview(resource, getFileEncodingConfiguration(uri, EncodingDirection.OUTPUT))
        )
        if (err && err.message) return err.message
        if (!response) return 'Empty response.'

        let error = err && err.message
        let document = response.preview.join('\n')

        return document || error
      }
      return ''
    })
  }
}
