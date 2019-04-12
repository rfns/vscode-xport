import * as vscode from 'vscode'
import { serializeFailures } from '../shared/document'
import { getProjectName } from '../shared/project'
import { Core } from '../core'
import { ProjectExplorerItem } from '../explorer/projectExplorer'
import * as message from '../shared/message'

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.projectExplorer.removeItem', async (item: ProjectExplorerItem) => {
    const name = item.uri && getProjectName(item.uri)

    if (name && item.uri) {
      try {
        const response = await core.api.remove(name, [item.uri.fsPath])

        if (response.success.length) {
          core.output.display(`Removed ${response.success[0]} from the project.`, name)
          core.projectExplorerProvider.refresh()
        }

        if (response.has_errors) {
          core.output.display(serializeFailures(response.failure), name)
          await message.displayError(core.output, response.failure.header, name)
        }
      } catch (err) {
        core.output.display('A fatal error happened while removing items.', name)
        core.output.display(`Details: ${err.message}`, name)
        await message.displayError(core.output, 'Failed to complete the operation.', name)
      }
    }
  })
}
