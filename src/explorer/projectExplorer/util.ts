import * as path from 'path'
import * as vscode from 'vscode'
import { ProjectExplorerItem } from './item'
import { Core } from '../../core'

export function getTypes (element: ProjectExplorerItem, paths: string[]): any {
  const types = paths.reduce((types: any, p) => {
    const type: any = p.split('/')[0]
    if (!types[type]) types[type] = { fullPath: `${type}`, type }
    return types
  }, {})

  return Object.values(types).map((entry: any) =>
    new ProjectExplorerItem(
      element.project,
      entry.type,
      vscode.TreeItemCollapsibleState.Collapsed,
      'type',
      entry.type,
      paths,
      entry.fullPath,
      element.depth + 1
    )
  )
}

export function getPathPart (element: ProjectExplorerItem) {
  return element.items
    .filter((item: string) => item.includes(element.fullPath))
    .reduce((elements: ProjectExplorerItem[], item: string) => {
      let labels: string[] = item.split('/')
      let itemCommand: vscode.Command | undefined = undefined

      // Excludes entries where the item's name contains the element.fullPath.
      // Example: /cls/My/Class/Path/A.cls contains /cls/My/Class/Path/A.
      if (element.depth >= labels.length) return elements

      const label: string = labels[element.depth]
      const fullPath: string = `${element.fullPath}/${label}`
      const folderType: string = labels[0]
      const lastLabel = labels[labels.length - 1]

      // Each level can have only one item with the same label.
      if (elements.some(el => el.label === label)) return elements
      // Make sure that the result is grouped following its correct type.
      if (folderType !== element.type) return elements

      let location = folderType === 'cls' ? 'package': 'folder'
      let state = vscode.TreeItemCollapsibleState.Collapsed

      if (lastLabel === label) {
        location = 'file'
        state = vscode.TreeItemCollapsibleState.None
        itemCommand = {
          command: 'xport.commands.previewDocument',
          title: 'Preview this item',
          arguments: [vscode.Uri.file(fullPath).with({ scheme: 'xrf' })]
        }
      }

      return [
        ...elements,
          new ProjectExplorerItem(
            element.project,
            label,
            state,
            location,
            folderType,
            element.items,
            fullPath,
            element.depth + 1,
            itemCommand
          )
      ]
    }, [])
}

export async function getProjects (core: Core) {
  try {
    const { projects } = await core.api.projects()
    return projects.map(({ name, has_items }) =>
    new ProjectExplorerItem(
      name,
      name,
      has_items
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
      'project',
      'prj',
      [],
      ''
    )
  )
  } catch (err) {
    return [{
      label: 'Failed to load the data. Check your connection settings.',
      collapsibleState: vscode.TreeItemCollapsibleState.None,
      iconPath: {
        dark: path.resolve(__dirname, '../../../media/dark/alert.svg'),
        light: path.resolve(__dirname, '../../../media/light/alert.svg')
      }
    }]
  }
}
