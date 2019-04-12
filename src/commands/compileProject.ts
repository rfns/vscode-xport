import * as vscode from 'vscode'
import { Core } from '../core'
import { ProjectExplorerItem } from '../explorer/projectExplorer'
import { compileProject } from '../shared/project'

export function register (core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.projectExplorer.compileProject', async (item: ProjectExplorerItem) => {
    return vscode.window.withProgress({
      location: vscode.ProgressLocation.Window
    }, async (progress: any) => {
      return compileProject(core, item, progress)
    })
  })
}
