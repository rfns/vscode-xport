import * as vscode from 'vscode'
import { Core } from '../core'
import { MuxerTimeout } from '../shared/muxer'
import { publishProjectItems, groupDocumentsByProject, getProjectXML } from '../shared/project'

export const muxer = new MuxerTimeout({
  timeout: 500,
  ephemeralOutput: false,
  ephemeralError: true,
  immediate: true,
  discriminator: (e: vscode.TextDocument) => e.fileName
})

const input = muxer.input(async (doc: vscode.TextDocument, core: Core) => {
  const { configuration } = core

  if (doc.fileName.match(/\.(vscode|code-workspace)/)) return
  if (!doc.fileName.match(/[\\/](?:web|cls|inc|mac|int|mvi|mvb|bas)[\\/]/)) return
  if (!configuration) throw new Error('Configuration not found.')

  return { ...doc, core }
})

muxer.output(async (docs: any) => {
  let core: Core = docs[0].core
  const groupedItems = groupDocumentsByProject(docs)

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Window
  }, async (progress: any) => {
    const entries = Object.values(groupedItems)

    for (let i = 0, l = entries.length; i < l; i++) {
      const { items, workspaceFolder } = entries[i]
      await publishProjectItems(core, workspaceFolder, items, progress)

      if (core.configuration && core.configuration.autoExportXML) {
        await getProjectXML(core, workspaceFolder, progress)
      }

    }

    core.projectExplorerProvider.refresh()
  })
})

export function listen (core: Core): vscode.Disposable {
  muxer.error((e: any) => core.output.display(`Failed to complete onDidSaveTextDocument event: ${e.message}`))
  return vscode.workspace.onDidSaveTextDocument(doc => input(doc, core))
}
