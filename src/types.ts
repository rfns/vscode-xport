import * as vscode from 'vscode'

export const FileTypes = {
  IMAGE: /\.(jpg|jpeg|gif|png|bmp)$/i,
  PDF: /\.(pdf)$/i
}

export interface Configuration {
  host: string
  headers?: object
  authentication: Authentication
  namespace: string
  enabled: boolean
  healthCheck: string
  flags: string
  watchFolders: string
  sourceRoot: string
  encodings: FileEncoding
  refreshables: string
  xmlFlags: string
  xmlEncoding: string
}

export type FileEncoding = Object & {
  input: {
    [key: string]: string
  }
  output: {
    [key: string]: string
  }
}

export enum EncodingDirection {
  INPUT = 'input',
  OUTPUT = 'output'
}

export interface Authentication {
  username: string
  password: string
}

export interface OutgoingItem {
  path: string
  content: string
  encoding: {
    in: {
      [ext: string]: string
    }
    out: {
      [ext: string]: string
    }
  }
}

export type GroupedOutgoingItems = Object & {
  [project: string]: {
    items: [OutgoingItem],
    workspaceFolder: vscode.WorkspaceFolder
  }
}

export interface ItemError {
  message: string
  internal_code?: number
  response_code?: number
  origin?: ItemError
}

export interface ItemDetail {
  name: string
  last_change: string
  path: string
  file_name: string
}

export interface IncomingItem extends ItemDetail {
  name: string
  content: string[]
  encoding?: string
  binary?: boolean
}

export interface IncomingItemFailure extends ServerResponseError {
  item_name: string
}

export interface ServerResponseError {
  error?: ItemError
  errors?: ItemError[]
}

export interface FailureOverview {
  header: string
  items: IncomingItemFailure[]
}

export interface OperationReport {
  failure: FailureOverview
  success: IncomingItem[]
  warning?: string
  has_errors: boolean
}

export interface ProjectList {
  projects: ProjectOverview[]
}

export interface ProjectOverview {
  name: string
  has_items: boolean
}

export interface ItemPaths {
  paths: string[]
}

export interface ContentPreview {
  binary: boolean
  preview: string[]
}

export interface DocumentReferences {
  references: string[]
}

export interface ProjectXML {
  xml: string
}

export interface BinaryResource {
  project: string
  path: string
  name: string
}

export interface Pagination {
  page: number
  size: number
}

export interface DocumentTextProxy {
  uri: vscode.Uri
  file: string | Buffer
  fileName: string
  binary?: boolean
  getText(): string
}

export interface WriteOperationReport {
  success: string[]
  failure: {
    header: string
    items: IncomingItemFailure[] & { last_change: string }
  }
}

