import * as vscode from 'vscode'
import { ProjectExplorerItem } from '../explorer'
import { getWorkspaceFolderByName } from '../shared/workspace'
import { Core } from '../core'
import * as message from '../shared/message'

const dispatchError = async (core: Core, item: ProjectExplorerItem) => {
  core.output.display(`ERROR: Could not find the local file to match its remote counterpart ${item.uri.toString()}: a local project is required to use this command.`)
  await message.displayError(core.output, 'You can\'t compare a file without having a local version of it.', item.project)
}

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.projectExplorer.compareDocumentVersions', async (item: ProjectExplorerItem) => {
    const project = getWorkspaceFolderByName(item.project)
    if (!project) return dispatchError(core, item)

    const relativePattern = new vscode.RelativePattern(project.uri.fsPath, `${item.type}/**/${item.label}`)
    const file = await vscode.workspace.findFiles(relativePattern, null, 1)

    if (file.length) {
      vscode.commands.executeCommand('vscode.diff', item.uri, file[0])
    } else {
      dispatchError(core, item)
    }
  })
}
