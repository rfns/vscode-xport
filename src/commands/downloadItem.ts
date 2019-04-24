import * as vscode from 'vscode'
import { Core } from '../core'
import { synchronizeProject } from '../shared/project'
import { ProjectExplorerItem } from '../explorer/projectExplorer'
import * as message from '../shared/message'

export function register(core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.projectExplorer.downloadItem', async (item: ProjectExplorerItem) => {
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Window
    }, async (progress: any) => {
      const response = await synchronizeProject(core, item.project, [item.uri.fsPath], progress)

      if (!response) {
        core.output.display(`Download prevented: a local project is required to use this command.`, item.project)
        await message.displayError(core.output, `You need to dowload the full project first.`, item.project)
      }
    })
  })
}
