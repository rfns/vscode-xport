import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { to } from 'await-to-js'
import { Configuration } from '../types'

export function getActiveWorkspaceFolder (): vscode.WorkspaceFolder | null {
  const editor = vscode.window.activeTextEditor

  if (editor) {
    const resource = editor.document.uri

    if (resource.scheme === 'file') {
      const folder = vscode.workspace.getWorkspaceFolder(resource)
      if (!folder) return findAdequateWorkspaceFolder()
      return folder
    }
  }
  return findAdequateWorkspaceFolder()
}

function findAdequateWorkspaceFolder (): vscode.WorkspaceFolder | null {
  if (!vscode.workspace.workspaceFolders) return null

  const folder = vscode.workspace.workspaceFolders.filter(
    workspaceItem => vscode.workspace.name === workspaceItem.name
  ).pop()

  if (folder) return folder
  return null
}

export function getWorkspaceConfiguration (folder?: vscode.WorkspaceFolder): Configuration {
  let configuration = vscode.workspace.getConfiguration('xport', folder && folder.uri)

  if (!configuration) configuration = vscode.workspace.getConfiguration('xport')

  return {
    host: configuration.remote.host,
    namespace: configuration.remote.namespace,
    headers: configuration.headers,
    authentication: configuration.authentication,
    enabled: configuration.core.enabled,
    healthCheck: configuration.healthCheck.interval,
    flags: configuration.compiler.flags,
    autoExportXML: configuration.project.autoExportXML,
    watchFolders: configuration.project.watchFolders,
    sourceRoot: configuration.project.sourceRoot,
    encodings: configuration.transport.encoding,
    refreshables: configuration.transport.refetch
  }
}

export async function createWorkspaceFolder (
  newWorkspaceFolderFolderPath: string
): Promise<vscode.WorkspaceFolder | undefined> {
  const normalizedPath = path.normalize(newWorkspaceFolderFolderPath)
  const uri = vscode.Uri.file(normalizedPath)
  const name = path.basename(normalizedPath)

  // Ignores EEXIST, if by some other reason it fails to create the path then we let the write helper handle it.
  await to(fs.promises.mkdir(normalizedPath, { recursive: true }))

  return new Promise(async resolve => {
    let index = (vscode.workspace.workspaceFolders || []).length

    let lastAddedWorkspaceFolderIndex: number
    let timeoutId: any

    const disposable: vscode.Disposable = vscode.workspace.onDidChangeWorkspaceFolders(
      (e: vscode.WorkspaceFoldersChangeEvent) => {
        lastAddedWorkspaceFolderIndex = e.added.length - 1

        if (timeoutId && e.added.length) {
          clearTimeout(timeoutId)
          timeoutId = null
          resolve(e.added[lastAddedWorkspaceFolderIndex])
        }
        disposable.dispose()
      }
    )

    vscode.workspace.updateWorkspaceFolders(index, null, { uri, name })

    timeoutId = setTimeout(() => {
      if (!lastAddedWorkspaceFolderIndex) {
        disposable.dispose()
        resolve()
      }
    }, 3000)
  })
}

export function isNewWorkspaceFolderPath (folderPath: string): boolean {
  const uri = vscode.Uri.file(folderPath)
  return vscode.workspace.getWorkspaceFolder(uri) == null
}

export async function ensureWorkspaceFolderExists (
  workspaceFolderPath: string
): Promise<vscode.WorkspaceFolder | undefined>  {
  let workspaceFolder
  const name = path.basename(workspaceFolderPath)

  workspaceFolder = getWorkspaceFolderByName(name)

  if (workspaceFolder) {
    return workspaceFolder
  } else if (isNewWorkspaceFolderPath(workspaceFolderPath)) {
    workspaceFolder = await createWorkspaceFolder(workspaceFolderPath)
  } else {
    const uri = vscode.Uri.file(workspaceFolderPath)
    workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)
  }

  if (!workspaceFolder) throw new Error(`Failed to create a workspace folder for ${name}.`)
  return workspaceFolder
}

export function getWorkspaceFolderByName(projectName: string): vscode.WorkspaceFolder | undefined {
  const { workspaceFolders } = vscode.workspace

  if (workspaceFolders && workspaceFolders.length) {
    return workspaceFolders.filter(folder => folder.name === projectName)[0]
  }
}
