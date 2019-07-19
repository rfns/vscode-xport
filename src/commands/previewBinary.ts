import * as vscode from 'vscode'
import { BinaryResource, FileTypes } from '../types'
import { Core } from '../core'

export function register (core: Core) {
  function getPreviewContainer (resource: BinaryResource) {
    const url = `${core.api.getDocumentsResource()}/raw/${resource.path}`

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, minimum-scale=0.1">
          <title>Binary preview</title>
        </head>
        <body>
          ${
            resource.path.toLowerCase().match(FileTypes.PDF)
              ? `<iframe src="${url}"></iframe>`
              : resource.path.toLowerCase().match(FileTypes.IMAGE)
                ? `<img src="${url}" />`
                : `<span style="margin: auto;">This file cannot be rendered.</span>`
          }
        </body>
      </html>
    `
  }

  return vscode.commands.registerCommand('xport.commands.previewBinary', (resource: BinaryResource) => {
    const name = resource.name.split('/').pop()
    const panel = vscode.window.createWebviewPanel(
      'binaryPreview',
      name || 'Untitled',
      vscode.ViewColumn.One
    )

    panel.webview.html = getPreviewContainer(resource)
  })
}

