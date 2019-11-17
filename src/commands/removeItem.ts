import * as vscode from 'vscode'
import { getProjectName, findRelativePaths, removeItems } from '../shared/project'
import { Core } from '../core'
import { ProjectExplorerItem } from '../explorer'

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.projectExplorer.removeItem', async (item: ProjectExplorerItem) => {
    const name = item.uri && getProjectName(item.uri)
    if (!name) return

    const answer = await vscode.window.showWarningMessage(`This will remove the item and all its relatives from ${name}. Continue?`, 'Yes', 'No')
    if (answer !== 'Yes') return

    const projectName = item.uri && getProjectName(item.uri)
    const items = findRelativePaths(item)

    return vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      cancellable: true
    }, async (progress, token) => {
      return removeItems({
        core,
        projectName,
        progress,
        token,
        items
      })
    })
  })
}
