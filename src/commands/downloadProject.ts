import * as vscode from 'vscode'
import { Core } from '../core'
import { getProjectName, downloadProjectLazily } from '../shared/project'
import { ProjectExplorerItem } from '../explorer/projectExplorer'

export function register(core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.projectExplorer.downloadProject', async (treeItem: ProjectExplorerItem) => {
    const projectName = treeItem.uri && getProjectName(treeItem.uri)
    if (!projectName) return

    const pathToSave = await vscode.window.showInputBox({ prompt: 'Type the path where the workspace folders should be created' })
    if (!pathToSave) return
    return downloadProjectLazily(core, projectName, pathToSave)
  })
}
