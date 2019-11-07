import * as vscode from 'vscode'
import { Core } from '../core'
import { ProjectExplorerItem } from '../explorer/projectExplorer'
import { compileItems } from '../shared/project'
import { getCompilableDocuments } from '../shared/document'

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.projectExplorer.compileProject', async (target: ProjectExplorerItem) => {
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      cancellable: true
    }, async (progress, token: vscode.CancellationToken) => {
      progress.report({ message: 'Preparing ...' })
      if (token.isCancellationRequested) return

      const { project } = target
      await vscode.commands.executeCommand('setContext', 'busy', true)
      const { paths } = await core.api.paths(project)
      const items = getCompilableDocuments(paths.map((p: any) => vscode.Uri.file(p.path)))

      if (token.isCancellationRequested) {
        await vscode.commands.executeCommand('setContext', 'busy', false)
        return
      }

      await compileItems({ core, items, range: 20, project, progress, token })
      await vscode.commands.executeCommand('setContext', 'busy', false)
    })
  })
}
