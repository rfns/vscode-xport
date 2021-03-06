import * as vscode from 'vscode'
import { expandPaths } from '../shared/document'
import { getDocumentText, getCompilableDocuments } from '../shared/document'
import { Core } from '../core'
import {
  groupDocumentsByProject,
  publishProjectItems,
  compileItems
} from '../shared/project'

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.commands.publishFolder', async (uri: vscode.Uri) => {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)
    if (!workspaceFolder) return

    const { name } = workspaceFolder
    let items: vscode.Uri[] = []

    await vscode.commands.executeCommand('setContext', 'busy', true)

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      cancellable: true
    }, async (progress: any, token: vscode.CancellationToken) => {
      try {
        progress.report({ message: 'Discovering files (0 files found).' })

        const uris = await expandPaths([uri], progress)
        const documents = await Promise.all(uris.map(async uri => getDocumentText(uri)))

        progress.report({ message: 'Collecting sources ...' })

        const groups = await groupDocumentsByProject(documents, token)
        if (token.isCancellationRequested) return

        items = getCompilableDocuments(uris)

        await publishProjectItems({
          core,
          workspaceFolder,
          items: groups[workspaceFolder.name].items,
          range: 20,
          progress,
          token
        })
        if (token.isCancellationRequested) return
      } finally {
        await vscode.commands.executeCommand('setContext', 'busy', false)
        core.projectExplorerProvider.refresh()
      }
    })

    if (items.length) {
      await compileItems({ core, project: name, items, range: 20 })
    }
  })
}
