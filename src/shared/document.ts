import * as vscode from 'vscode'
import * as fs from 'fs-extra'
import * as path from 'path'
import { isBinaryFile } from 'isbinaryfile'
import { serializeErrors } from './error'
import { getWorkspaceConfiguration } from './workspace'
import { IncomingItem, FailureOverview, IncomingItemFailure, DocumentTextProxy, EncodingDirection, WriteOperationReport, ItemPaths } from '../types'

export const CACHE_ROUTINES = ['mac', 'bas', 'int', 'inc', 'mvi', 'bas', 'mvb', 'mvi']
export const CACHE_FOLDERS = /[\\/]public|cls|inc|mac|int|mvi|mvb|bas[\//]/

async function safeWrite (
  destination: string,
  item: IncomingItem
): Promise<boolean> {
  try {
    await fs.mkdirp(path.dirname(destination))

    let data = item.binary
      ? dechunkifyBinary(item.content, 12000)
      : dechunkify(item.content)

    await fs.writeFile(destination, data, item.encoding && { encoding: item.encoding })
    return true
  } catch (err) {
    return false
  }
}

export async function getDocumentTextProxy (uri: vscode.Uri): Promise<DocumentTextProxy> {
  const filePath = uri.fsPath
  const binary = await isBinaryFile(uri.fsPath)
  const encoding = !binary && getFileEncodingConfiguration(uri, EncodingDirection.INPUT) || null

  const file = await fs.promises.readFile(filePath, encoding)
  const content = file.toString()

  return {
    uri,
    file,
    binary,
    fileName: filePath,
    getText() { return content },
  }
}

export async function write (
  items: IncomingItem[],
  workspaceFolderUri: vscode.Uri
): Promise<WriteOperationReport> {
  let filesWritten: any = [];
  let filesNotWritten: any = [];

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(workspaceFolderUri)
  const configuration = getWorkspaceConfiguration(workspaceFolder)
  const sourceRoot = configuration && configuration.sourceRoot || ''

  await Promise.all(
    items.map(async (item: IncomingItem) => {
      let isWritten = false

      const message = `Failed to write item ${item.name} to the disk. Path: ${item.path}`
      const destination = path.resolve(workspaceFolderUri.fsPath, sourceRoot, item.path)
    // Don't write anyting because we already have the source.
      if (item.content.length === 0) return true
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

  overview.items.forEach((item: IncomingItemFailure) => {
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
      const fileName = path.basename(uri.fsPath)
      const isQualified = !fileName.startsWith('.') && !fileName.endsWith('.') && fileName.includes('.')
      filesDiscovered = isQualified && uri.fsPath.match(CACHE_FOLDERS)
        ? [...allUris, uri]
        : allUris
    }

    progress.report({ message: `Discovering files (${filesDiscovered.length} files found).` })
    return filesDiscovered
  }, Promise.all([]))
}

export function getCompilableDocuments (uris: vscode.Uri[]) {
  return uris.filter(
    (uri: vscode.Uri) => [...CACHE_ROUTINES, 'cls', 'csr', 'csp'].some(
      (type: string) => uri.fsPath.endsWith(type))
  )
}

export function chunkifyBinary (doc: DocumentTextProxy, len: number) {
  const buffer = doc.file || Buffer.from(doc.getText())
  const content = buffer.toString('base64')

  return chunkify(content, len)
}

export function chunkify(content: string, size: number) {
  let chunks = []

  for (let offset = 0, strLen = content.length; offset < strLen; offset += size) {
    // Slice is the fastest way to split a string by length.
    // See https://jsperf.com/string-split-by-length
    chunks.push(content.slice(offset, size + offset))
  }

  return chunks
}

export const dechunkify = (chunks: string[]) => chunks.join('')

export function dechunkifyBinary (chunks: string[], size: number) {
  return new Buffer(dechunkify(chunks), 'base64')
}

export function isRefreshable (uri: vscode.Uri) {
  const configuration = getWorkspaceConfiguration()
  const refreshables = configuration.refreshables.split(',').map(s => s.trim().toLowerCase())

  return refreshables.some(refreshable => uri.fsPath.endsWith(`.${refreshable}`))
}

export function getFileEncodingConfiguration (uri: vscode.Uri, direction: EncodingDirection) {
  const configuration = getWorkspaceConfiguration()
  const encodings = configuration.encodings[direction]

  const extension = (uri.fsPath.split('.').pop() || '').toLowerCase()
  return encodings[extension] || encodings.default
}

export function tagWithEncoding (items: ItemPaths, encoding: EncodingDirection) {
  return items.paths.map((p: any) => ({
    path: p.path,
    encoding: p.binary ? 'RAW' : getFileEncodingConfiguration(vscode.Uri.file(p.path), encoding)
  }))
}

