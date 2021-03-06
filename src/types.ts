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
  autoExportXML: boolean
  watchFolders: string
  sourceRoot: string
  encodings: FileEncoding
  refreshables: string
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

export interface RequestItem {
  path: string
  content: string
}

export type GroupedRequestItems = Object & {
  [key: string]: {
    items: [RequestItem],
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
  content: string[]
  last_change: string
  path: string
  file_name: string
  binary?: boolean
}

export interface FailedItem extends RequestError {
  item_name: string
}

export interface RequestError {
  error?: ItemError
  errors?: ItemError[]
}

export interface FailureOverview {
  header: string
  items: FailedItem[]
}

export interface MixedResponse {
  failure: FailureOverview
  success: ItemDetail[]
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

export interface SimplifiedDocument {
  uri: vscode.Uri
  file?: Buffer
  getText(): string
}

export interface WorkspaceFolderConfiguration {
  folder: vscode.WorkspaceFolder
  configuration: Configuration
}

