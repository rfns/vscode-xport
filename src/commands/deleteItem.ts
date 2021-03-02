import * as vscode from 'vscode'
import { getProjectName, deleteItems, findRelativePaths } from '../shared/project'
import { Core } from '../core'
import { ProjectExplorerItem } from '../explorer'

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.projectExplorer.deleteItem', async (item: ProjectExplorerItem) => {
    const answer = await vscode.window.showWarningMessage('This will delete the item and all its relatives from the server permanently. Continue?', 'Yes', 'No')
    if (answer !== 'Yes') return

    const projectName = item.uri && getProjectName(item.uri)
    const items = findRelativePaths(item)

    return vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      cancellable: true
    }, async (progress, token) => {
      return deleteItems({
        core,
        projectName,
        progress,
        token,
        items
      })
    })
  })
}
