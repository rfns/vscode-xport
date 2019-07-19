
import * as vscode from 'vscode'
import * as message from '../shared/message'
import { Client } from './client'
import { getWorkspaceConfiguration } from '../shared/workspace'
import {
  Configuration,
  ContentPreview,
  MixedResponse,
  ProjectList,
  RequestItem,
  ItemPaths,
  DocumentReferences,
  ProjectXML,
  Pagination
} from '../types'

export class API {
  private host: string | undefined
  private namespace: string | undefined
  private client: Client | null
  private output: any
  private compilerOptions: string = 'cku'

  constructor (
    options: Configuration | null,
    output: any
  ) {

    this.client = null
    this.output = output
    this.setup(options)
  }

  setup (options = getWorkspaceConfiguration()) {
    if (!options) return

    this.host = options.host
    this.namespace = options.namespace || this.namespace
    this.compilerOptions = options.compilerOptions

    if (this.host && this.namespace) {
      this.client = new Client({
        authentication: options.authentication,
        headers: options.headers
      })
    }
  }

  async remove (name: string, items: string[]): Promise<MixedResponse> {
    if (!this.client || !this.canMakeRequest(name)) {
      return { has_errors: false, success: [], failure: { header: '', items: [] }}
    }

    const resource = `${this.getProjectBaseResource(name)}/items/remove`
    return this.client.post(resource, items)
  }

  async delete (name: string, items: string[]): Promise<MixedResponse> {
    if (!this.client || !this.canMakeRequest(name)) {
      return { has_errors: false, success: [], failure: { header: '', items: [] }}
    }

    const resource = `${this.getProjectBaseResource(name)}/items/delete`
    return this.client.post(resource, items)
  }

  async ping () {
    if (!this.client) throw new Error('Client is not configured.')
    return this.client.head(`${this.host}/api/xport/ping`)
  }

  async projects (): Promise<ProjectList> {
    if (!this.client) return { projects: [] }

    return this.client.get(`${this.host}/api/xport/namespaces/${this.namespace}/projects`)
  }

  async paths (name: string): Promise<ItemPaths> {
    if (!this.client || !this.canMakeRequest(name)) return { paths: [] }

    const resource = `${this.getProjectBaseResource(name)}/items/paths`
    return this.client.get(resource)
  }

  async pickSources (workspaceFolder: vscode.WorkspaceFolder, files: string[]): Promise<MixedResponse> {
    const { name } = workspaceFolder

    if (!this.client || !this.canMakeRequest(name)) {
      return { success: [], has_errors: false, failure: { header: '', items: [] } }
    }

    const resource = `${this.getProjectBaseResource(name)}/items/sources/pick`
    return this.client.post(resource, { files })
  }

  async listSources (workspaceFolder: vscode.WorkspaceFolder, pagination: Pagination) {
    const { name } = workspaceFolder

    if (!this.client || !this.canMakeRequest(name)) {
      return { success: [], has_errors: false, failure: { header: '', items: [] } }
    }

    const resource = `${this.getProjectBaseResource(name)}/items/sources/list?page=${pagination.page}&size=${pagination.size}`
    return this.client.get(resource)
  }

  async count (workspaceFolder: vscode.WorkspaceFolder) {
    const { name } = workspaceFolder
    if (!this.client) return 0

    const resource = `${this.getProjectBaseResource(name)}/items/count`
    return this.client.get(resource)
  }

  async preview (item: string): Promise<ContentPreview> {
    if (!this.client) return { preview: [], binary: false }

    const resource = `${this.host}/api/xport/namespaces/${this.namespace}/documents/preview/${item}`
    return this.client.get(resource)
  }

  async publish (workspaceFolder: vscode.WorkspaceFolder, items: RequestItem[]): Promise<MixedResponse> {
    const { name } = workspaceFolder
    if (!this.client) return { has_errors: false, success: [], failure: { header: '', items: [] }}

    const resource = `${this.getProjectBaseResource(name)}/items/publish`
    return this.client.post(resource, { items, compilerOptions: this.compilerOptions })
  }

  async deleteProject (name: string): Promise<boolean> {
    if (!this.client || !this.canMakeRequest()) return false

    const resource = `${this.getProjectBaseResource(name)}`
    await this.client.delete(resource)
    return true
  }

  async documents (pattern: string): Promise<any> {
    if (!this.client) return { matches: [] }

    const resource = `${this.host}/api/xport/namespaces/${this.namespace}/documents/find?pattern=${pattern}`
    return this.client.get(resource)
  }

  async references (expression: string, max: number, pattern: string): Promise<DocumentReferences> {
    if (!this.client) return { references: [] }

    const resource = `${this.host}/api/xport/namespaces/${this.namespace}/documents/references?expression=${expression}&pattern=${pattern}&max=${max}`
    return this.client.get(resource)
  }

  async compile (name: string): Promise<any> {
    if (!this.client) return { error: null, log: [] }

    const resource = `${this.getProjectBaseResource(name)}/compile`
    return this.client.post(resource, { compilerOptions: this.compilerOptions })
  }

  async xml (name: string): Promise<ProjectXML> {
    if (!this.client) return { xml: '' }

    const resource = `${this.getProjectBaseResource(name)}/xml`
    return this.client.get(resource)
  }

  async fixProject (name: string): Promise<void> {
    if (!this.client) return

    const resource = `${this.getProjectBaseResource(name)}/fix`
    this.client.patch(resource)
  }

  getProjectBaseResource (name: string): string {
    return `${this.host}/api/xport/namespaces/${this.namespace}/projects/${name}`
  }

  getDocumentsResource () {
    return `${this.host}/api/xport/namespaces/${this.namespace}/documents`
  }

  private canMakeRequest (name?: string): boolean {
    if (this.client && this.client.busy) {
      this.output.display('Prevented an attempted to make a request while another one is pending.', name)
      message.displayError(this.output, 'There\'s another request in progress. Wait for it to finish and try again.', name)
      return false
    }
    return true
  }
}
