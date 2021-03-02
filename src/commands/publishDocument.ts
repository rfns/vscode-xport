import * as vscode from 'vscode'
import { publishProjectItems } from '../shared/project'
import { groupDocumentsByProject } from '../shared/project'
import { Core } from '../core'
import { getDocumentTextProxy } from '../shared/document'
import { DocumentTextProxy } from '../types'

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.commands.publishDocument', async (selectedDoc: vscode.Uri) => {
    const { activeTextEditor } = vscode.window
    if ((!activeTextEditor && !selectedDoc) || !core.configuration) return

    let workspaceFolder: any
    let doc: vscode.TextDocument | DocumentTextProxy

    if (selectedDoc) {
      doc = await getDocumentTextProxy(selectedDoc)
    } else {
      doc = activeTextEditor.document
    }

    try {
      workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri)
      debugger
    } catch (ex) {
      debugger
    }

    if (!workspaceFolder) return

    core.refresh(workspaceFolder)

    const { flags } = core.configuration

    return vscode.window.withProgress({
      location: vscode.ProgressLocation.Window,
      cancellable: true
    }, async (progress: any, token: vscode.CancellationToken) => {
      const { [workspaceFolder.name]: { items } } = await groupDocumentsByProject([doc], token)

      await publishProjectItems({
        core,
        workspaceFolder,
        items,
        range: 1,
        progress,
        token,
        flags
      })

      core.projectExplorerProvider.refresh()
    })
  })
}
