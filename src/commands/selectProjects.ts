import * as vscode from 'vscode'
import { Core } from '../core'
import { downloadProjects } from '../shared/project'
import * as message from '../shared/message'

export function register (core: Core) {
  return vscode.commands.registerCommand('xport.commands.selectProjects', async () => {
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Window,
      title: 'XPort: Downloading projects'
    }, async (progress: any) => {
      try {
        const { projects } = await core.api.projects()
        progress.report({ message: 'XPort: Standby' })

        if (projects.length) {
          const projectNames = projects.map(({ name }) => name)
          const selectedProjects = await vscode.window.showQuickPick(projectNames, { canPickMany: true })
          if (selectedProjects) {
            const providedPath = await vscode.window.showInputBox({ prompt: 'Select the path to save these projects' })
            if (providedPath) await downloadProjects(core, selectedProjects, providedPath, progress)
          }
        }
      } catch (err) {
        core.output.display('A fatal error happened while publishing changes.')
        core.output.display(`Details: ${err.message}`)
        await message.displayError(core.output, 'Unable to complete the action due to a fatal error.')
      }
    })
  })
}
