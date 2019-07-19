import * as vscode from 'vscode'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'
import { to } from 'await-to-js'
import { ItemDetail, FailureOverview, FailedItem } from '../types'
import { serializeErrors } from './error'

export const CACHE_ROUTINES = ['mac', 'bas', 'int', 'inc', 'mvi', 'bas', 'mvb', 'mvi']
export const CACHE_FOLDERS = /[\\/]public|cls|inc|mac|int|mvi|mvb|bas[\//]/

async function safeWrite (
  destination: string,
  item: ItemDetail,
): Promise<boolean> {
  try {
    // Don't write anyting because we already have the source.
    if (item.content.length === 0) return true

    await fs.mkdirp(path.dirname(destination))

    let data = item.content.join(item.binary ? '' : os.EOL)

    if (!item.binary) {
      await fs.writeFile(destination, data)
    } else {
      await fs.writeFile(destination, new Buffer(data, 'base64'))
    }
    return true
  } catch (err) {
    return false
  }
}

export function isTypeOf (name: string, type: string): boolean {
  return name.toLowerCase().lastIndexOf(`.${type}`) > -1
}

export function getDestination (
  workspaceFolder: vscode.WorkspaceFolder,
  name: string
): string | undefined {

  const isSimpleType = () => CACHE_ROUTINES.some(t => isTypeOf(name, t))

  const rootPath = workspaceFolder.uri.fsPath

  if (isTypeOf(name, 'cls')) {
    const classPath = name.replace(/\.(?!cls)/i, '/').replace('.CLS', '.cls')
    return path.resolve(rootPath, `cls/${classPath}`)
  } else if (isSimpleType()) {
    const type = name.split('.').filter(part => CACHE_ROUTINES.includes(part)).pop()
    return path.resolve(rootPath, `${type}/${name}`)
  } else {
    return path.resolve(rootPath, `public/${name}`)
  }
}

export async function documentExists (path: string) {
  const [err, stat] = await to(fs.stat(path))
  return (stat && stat.isFile())
}

export async function getDocumentFromUri (uri: vscode.Uri): Promise<vscode.TextDocument> {
  return vscode.workspace.openTextDocument(uri)
}

export async function write (
  items: ItemDetail[],
  workspaceFolderUri: vscode.Uri
): Promise<any> {
  let filesWritten: any = [];
  let filesNotWritten: any = [];

  await Promise.all(
    items.map(async (item: ItemDetail) => {
      let isWritten = false

      const message = `Failed to write item ${item.name} to the disk. Path: ${item.path}`
      const destination = path.resolve(workspaceFolderUri.fsPath, item.path)
      isWritten = await safeWrite(destination, item)

      if (!isWritten) {
        filesNotWritten.push({
          item_name: item.name,
          error: { message },
          last_change: item.last_change
        })
      } else {
        filesWritten.push({ ...item })
      }

      return null
    })
  )

  return {
    success: filesWritten,
    failure: { items: filesNotWritten, header: 'Could not write one or more files.' }
  }
}

export function getDocumentEOLChars (doc: vscode.TextDocument) {
  return doc.eol === vscode.EndOfLine.CRLF ? String.fromCharCode(13, 10) : String.fromCharCode(10)
}

export function serializeFailures (overview: FailureOverview) : string {
  let message = `${overview.header}`

  overview.items.forEach((item: FailedItem) => {
    message = `${message}\n  Item: ${item.item_name}\n`
    message = serializeErrors(item, message)
  })
  return message
}

export async function expandPaths (roots: vscode.Uri[], progress: any): Promise<vscode.Uri[]> {
  const list = async (p: string) => (await fs.readdir(p)).map(r => vscode.Uri.file(path.resolve(p, r)))

  return roots.reduce(async (aggregationPromise: Promise<vscode.Uri[]>, uri: vscode.Uri) => {
    const allUris = await aggregationPromise
    const stat = await fs.stat(uri.fsPath)
    let filesDiscovered = allUris

    if (stat.isDirectory()) {
      const innerPaths = await list(uri.fsPath)
      const childrenUris = await expandPaths(innerPaths, progress)
      filesDiscovered = [...filesDiscovered, ...childrenUris ]
    } else {
      filesDiscovered = uri.fsPath.match(CACHE_FOLDERS) ? [...allUris, uri] : allUris
    }

    progress.report({ message: `Discovering files (${filesDiscovered.length} files found).` })
    return filesDiscovered
  }, Promise.all([]))
}

