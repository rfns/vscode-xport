import * as vscode from 'vscode'
import { Core } from '../core'
import { ProjectExplorerItem } from '../explorer/projectExplorer'
import { repairProject } from '../shared/project'

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.projectExplorer.repairProject', (item: ProjectExplorerItem) => {
    return vscode.window.withProgress({
      location: vscode.ProgressLocation.Window
    }, (progress: any) => {
      return repairProject(core, item.project, progress)
    })
  })
}
