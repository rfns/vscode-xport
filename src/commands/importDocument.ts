import * as path from 'path'
import * as vscode from 'vscode'
import { to } from 'await-to-js'
import { Core } from '../core'
import { writeFile, mkdirp } from 'fs-extra'
import { getWorkspaceFolderByName } from '../shared/workspace'
import * as message from '../shared/message'

export function register(core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.commands.importDocument', async (uri: vscode.Uri) => {
    const name = await vscode.window.showInputBox({ prompt: 'Type the name of an existing workspace folder where the document should be added' })
    if (!name) return

    const workspaceFolder = getWorkspaceFolderByName(name)

    if (!workspaceFolder) {
      await message.displayError(core.output, `Aborted: workspace folder doesn\'t exist.`, name)
      return
    }

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Window
    }, async (progress: any) => {
      if (vscode.window.activeTextEditor) {
        const destination = path.resolve(workspaceFolder.uri.fsPath, `./${uri.fsPath}`)
        const dir = path.dirname(destination)
        const doc = vscode.window.activeTextEditor.document

        progress.report({ message: 'XPort: Writing file' })

        await to(mkdirp(dir))
        const [err] = await to(writeFile(destination, doc.getText()))

        if (err) {
          core.output.display('A fatal error happened while publishing changes.')
          core.output.display(`Details: ${err.message}`)
          await message.displayError(core.output, 'Unable to complete the action due to a fatal error.')
        }
      }
    })
  })
}
