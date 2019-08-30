import * as vscode from 'vscode'
import { Core } from '../core'
import { getProjectName, pullWholeProject } from '../shared/project'
import { ProjectExplorerItem } from '../explorer/projectExplorer'

export function register(core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.projectExplorer.pullProject', async (treeItem: ProjectExplorerItem) => {
    try {
      await vscode.commands.executeCommand('setContext', 'busy', true)
      core.projectExplorerProvider.refresh()

      const projectName = treeItem.uri && getProjectName(treeItem.uri)
      if (!projectName) return

      const pathToSave = await vscode.window.showInputBox({ prompt: 'Type the path where the workspace folder should be created' })
      if (!pathToSave) return
      await pullWholeProject(core, projectName, pathToSave)
      core.projectExplorerProvider.refresh()
    } finally {
      vscode.commands.executeCommand('setContext', 'busy', false)
    }
  })
}
