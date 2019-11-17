import * as vscode from 'vscode'
import { Core } from '../core'
import { MuxerTimeout } from '../shared/muxer'
import { publishProjectItems, groupDocumentsByProject, getProjectXML } from '../shared/project'
import { getWorkspaceConfiguration } from '../shared/workspace'
import { Configuration } from '../types';

const WATCHABLE_FOLDERS = /[\\/](public|cls|inc|mac|int|mvi|mvb|bas)[\\/]/

function isWatching (filePath: string) {
  const typeToCheck = filePath.match(WATCHABLE_FOLDERS)
  if (!typeToCheck || !typeToCheck[1]) return false

  const configuration = getWorkspaceConfiguration()
  if (!configuration) return false

  const acceptableTypes = configuration
    .watchFolders.split(',')
    .map((f: string) => f.toLowerCase().trim())

  return acceptableTypes.includes(typeToCheck[1])
}

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
  if (!isWatching(doc.fileName)) return
  if (!configuration) throw new Error('Configuration not found.')

  return { ...doc, core, configuration }
})

muxer.output(async (docs: any) => {
  let core: Core = docs[0].core
  let configuration: Configuration = docs[0].configuration
  const { flags } = configuration

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    cancellable: true
  }, async (progress: any, token: vscode.CancellationToken) => {

    const groupedItems = await groupDocumentsByProject(docs, token)
    if (token.isCancellationRequested) return

    const entries = Object.values(groupedItems)

    for (let i = 0, l = entries.length; i < l; i++) {
      const { items, workspaceFolder } = entries[i]
      const promise = publishProjectItems({
        core,
        workspaceFolder,
        items,
        range: 1,
        progress,
        token,
        flags,
        compile: true
      })

      items.map(item => core.documentLocker.lock(item.path, promise))

      await promise
      core.documentLocker.unlockAll()

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
