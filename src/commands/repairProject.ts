import * as vscode from 'vscode'
import { Core } from '../core'
import { ProjectExplorerItem } from '../explorer'
import { repairProject } from '../shared/project'

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.projectExplorer.repairProject', (item: ProjectExplorerItem) => {
    return vscode.window.withProgress({
      location: vscode.ProgressLocation.Window
    }, async (progress: any) => {
      await vscode.commands.executeCommand('setContext', 'busy', true)
      await repairProject(core, item.project, progress)
      await vscode.commands.executeCommand('setContext', 'busy', false)
    })
  })
}
