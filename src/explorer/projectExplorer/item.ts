import * as vscode from 'vscode'
import * as path from 'path'
import { XRF_SCHEME } from '../../xrf'
import { FileTypes } from '../../types'

export class ProjectExplorerItem extends vscode.TreeItem {
  public readonly project: string
  public readonly location: string
  public readonly type: string
  public readonly items: any
  public readonly fullPath: string
  public readonly depth: number = 1
  public readonly contextValue: any
  public readonly uri: vscode.Uri
  public readonly binary: boolean = false

  constructor (
    root: string,
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    location: string,
    type: string,
    items: any,
    fullPath: string,
    depth: number = 0,
    command?: vscode.Command,
    binary?: boolean
  ) {
    super(label, collapsibleState)
    this.project = root
    this.location = location
    this.items = items
    this.type = type
    this.fullPath = fullPath
    this.depth = depth
    this.contextValue = location

    if (command) {
      this.command = command
    }

    this.uri = this.resolveUri()
    this.iconPath = this.resolveIconPath()
  }

  private resolveUri () {
    if (this.fullPath) {
      return vscode.Uri.file(`//${this.project}/${this.fullPath}`).with({ scheme: XRF_SCHEME })
    }

    return vscode.Uri.file(`//${this.project}`).with({ scheme: XRF_SCHEME })
  }

  private resolveIconPath () {
    let iconPath = { dark: '', light: '' }
    let name

    switch (this.location) {
      case 'package':
        name = 'package.svg'
        break
      case 'folder':
        name = 'file-directory.svg'
        break
      case 'file':
        if (!this.label) { name = 'file.svg' }
        else if (this.label.toLowerCase().match(FileTypes.IMAGE)) { name = 'file-media.svg' }
        else if (this.label.toLowerCase().match(FileTypes.PDF)) { name = 'file-pdf.svg' }
        else if (this.binary) { name = 'file-binary.svg' }
        else { name = 'file.svg' }
        break
      case 'project':
        name = 'file-submodule.svg'
        break
      case 'type':
        name = 'grabber.svg'
        break
      case 'image':
        name = 'file-media.svg'
        break
      default:
        name = 'question.svg'
        break
    }

    iconPath.dark = path.join(__dirname, `media/dark/${name}`)
    iconPath.light = path.join(__dirname, `media/light/${name}`)

    return iconPath
  }

}
