import * as vscode from 'vscode'
import { serializeFailures } from '../shared/document'
import { getProjectName } from '../shared/project'
import { Core } from '../core'
import { ProjectExplorerItem } from '../explorer/projectExplorer'
import * as message from '../shared/message'

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.projectExplorer.deleteItem', async (item: ProjectExplorerItem) => {
    const answer = await vscode.window.showWarningMessage('This will delete the item on the server permanently. Continue?', 'CONFIRM', 'ABORT')
    if (answer !== 'CONFIRM') return

    const name = item.uri && getProjectName(item.uri)

    if (name && item.uri) {
      try {
        const response = await core.api.delete(name, [item.uri.fsPath])

        if (response.success.length) {
          core.projectExplorerProvider.refresh()
          core.output.display(`Deleted ${response.success[0]} from the server.`, name)
          await message.displayWarning(`${response.success[0]} has been deleted from the server.`, name)
        }

        if (response.has_errors) {
          core.output.display(serializeFailures(response.failure), name)
          await message.displayError(core.output, response.failure.header, name)
        }
      } catch (err) {
        core.output.display('A fatal error happened while deleting items.', name)
        core.output.display(`Details: ${err.message}`, name)
        await message.displayError(core.output, 'Failed to complete the operation.', name)
      }
    }
  })
}
