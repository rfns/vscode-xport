import * as vscode from 'vscode'
import { Core } from '../core'
import { synchronizeProject } from '../shared/project'
import { ProjectExplorerItem } from '../explorer/projectExplorer'
import * as message from '../shared/message'

export function register(core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.projectExplorer.downloadItem', async (item: ProjectExplorerItem) => {
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification
    }, async (progress: any) => {
      let workspaceFolder: vscode.WorkspaceFolder | undefined

      const availableWorkspaces = (vscode.workspace.workspaceFolders || [])
        .filter(workspace => workspace.name === item.project)
        .map(workspace => ({ label: workspace.name, description: workspace.uri.fsPath, workspace }))

      if (availableWorkspaces.length > 1) {
        const choice = await vscode.window.showQuickPick(availableWorkspaces, { placeHolder: 'Select the workspace to download the file into.' })
        if (choice) workspaceFolder = choice.workspace
      }

      const response = await synchronizeProject(core, item.project, [item.uri.fsPath], progress, workspaceFolder)

      if (!response) {
        core.output.display(`Download prevented: a local project is required to use this command.`, item.project)
        await message.displayError(core.output, `You need to dowload the full project first.`, item.project)
      }
    })
  })
}
