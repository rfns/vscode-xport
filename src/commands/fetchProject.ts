import * as vscode from 'vscode'
import { Core } from '../core'
import { getProjectName, fetchWholeProject } from '../shared/project'
import { ProjectExplorerItem } from '../explorer'
import { getWorkspaceFolderByName } from '../shared/workspace'

async function getDownloadDestination (name: string): Promise<string | undefined> {
  let destination
  const workspaceFolder = getWorkspaceFolderByName(name)

  if (workspaceFolder) {
    destination = workspaceFolder.uri.fsPath
  } else {
    destination = await vscode.window.showInputBox({ prompt: 'Type the path where the workspace folder should be created' })
  }

  return destination
}

export function register(core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.projectExplorer.fetchProject', async (treeItem: ProjectExplorerItem) => {
    try {
      await vscode.commands.executeCommand('setContext', 'busy', true)

      const name = getProjectName(treeItem.uri)
      const destination = await getDownloadDestination(name)

      if (!destination) {
        return vscode.commands.executeCommand('setContext', 'busy', false)
      }

      await fetchWholeProject({ core, name, destination })
      core.projectExplorerProvider.refresh()
    } finally {
      vscode.commands.executeCommand('setContext', 'busy', false)
    }
  })
}
