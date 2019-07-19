import * as vscode from 'vscode'
import { Core } from '../core'
import { ProjectExplorerItem } from '../explorer/projectExplorer'
import { fixProject } from '../shared/project'

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.projectExplorer.fixProject', (item: ProjectExplorerItem) => {
    return vscode.window.withProgress({
      location: vscode.ProgressLocation.Window
    }, (progress: any) => {
      return fixProject(core, item.project, progress)
    })
  })
}
