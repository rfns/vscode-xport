import * as vscode from 'vscode'
import { ProjectExplorerItem } from '../explorer/projectExplorer'
import { Core } from '../core'
import * as message from '../shared/message'

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.projectExplorer.deleteProject', async (item: ProjectExplorerItem) => {
    try {
      if (item.collapsibleState !== vscode.TreeItemCollapsibleState.None) {
        await vscode.window.showErrorMessage(
          `The project ${item.project} is not empty thus cannot be deleted. Remove or delete its items before deleting the project itself.`,
          'Close'
        )
        return
      }

      const deleted = await core.api.deleteProject(item.project)
      if(deleted) core.projectExplorerProvider.refresh()
    } catch (err) {
      core.output.display('A fatal error happened while deleting items.', name)
      core.output.display(`Details: ${err.message}`, name)
      await message.displayError(core.output, 'Failed to complete the operation.', name)
    }

  })
}
