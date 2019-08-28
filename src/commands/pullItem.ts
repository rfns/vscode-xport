import * as vscode from 'vscode'
import { Core } from '../core'
import { pullSelectedItems } from '../shared/project'
import { ProjectExplorerItem } from '../explorer/projectExplorer'
import * as message from '../shared/message'

export function register(core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.projectExplorer.pullItem', async (item: ProjectExplorerItem) => {
    let workspaceFolder: vscode.WorkspaceFolder | undefined

    const availableWorkspaces = (vscode.workspace.workspaceFolders || [])
      .filter(workspace => workspace.name === item.project)
      .map(workspace => ({ label: workspace.name, description: workspace.uri.fsPath, workspace }))

    if (availableWorkspaces.length > 1) {
      const choice = await vscode.window.showQuickPick(availableWorkspaces, { placeHolder: 'Select the workspace folder to where the file should be created or updated.' })
      if (choice) workspaceFolder = choice.workspace
    } else {
      workspaceFolder = availableWorkspaces[0].workspace
    }

    if (!workspaceFolder) {
      core.output.display(`Pull prevented: a local project is required to use this command.`, item.project)
      return message.displayError(core.output, `You need to pull the whole project first.`, item.project)
    }

    return pullSelectedItems(core, workspaceFolder.uri, [item.fullPath])
  })
}
