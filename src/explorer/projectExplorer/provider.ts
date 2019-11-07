import * as vscode from 'vscode'
import { ProjectExplorerItem } from './item'
import { Core } from '../../core'
import { getPathPart, getTypes, getProjects } from './util'

export class ProjectExplorerProvider implements vscode.TreeDataProvider<ProjectExplorerItem> {
  private core: Core
  private _onDidChangeTreeData: vscode.EventEmitter<ProjectExplorerItem> = new vscode.EventEmitter<ProjectExplorerItem>();
	readonly onDidChangeTreeData: vscode.Event<ProjectExplorerItem> = this._onDidChangeTreeData.event

  getTreeItem (element: ProjectExplorerItem): vscode.TreeItem {
    return element
  }

  constructor (core: Core) {
    this.core = core
  }

  refresh (): void {
    this._onDidChangeTreeData.fire()
  }

  async getChildren (element?: ProjectExplorerItem): Promise<any[]> {
    await vscode.commands.executeCommand('setContext', 'busy', true)
    try {
      let items = []
      if (!element) {
        items = await getProjects(this.core)
      } else if (element.label) {
        if (element.location === 'project' || element.location === 'defaultProject') {
          const { paths } = await this.core.api.paths(element.label)
          items = getTypes(element, paths)
        } else if (element.location.match(/folder|package|file|type/)) {
          items = getPathPart(element)
        }
      }
      await vscode.commands.executeCommand('setContext', 'busy', false)
      return items
    } catch (err) {
      await vscode.commands.executeCommand('setContext', 'busy', false)
      throw err
    }
  }
}

