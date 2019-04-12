import * as vscode from 'vscode'
import * as events from './events'
import { Core } from '../core'

export interface XRFDocumentQuickPickItem extends vscode.QuickPickItem {
  webAppPath?: string
}

export class XRFDocumentFinder implements vscode.Disposable {
  private quickPicker: vscode.QuickPick<XRFDocumentQuickPickItem> = vscode.window.createQuickPick()

  public readonly core: Core

  constructor (core: Core) {
    this.core = core
    this.quickPicker.items = []
    this.quickPicker.title = 'Type the pattern to search for (* or ? are valid wildcards)'
    this.registerEvents()
  }

  private registerEvents () {
    events.onDidChangeValue.register(this.core, this.quickPicker)
    events.onDidHide.register(this.quickPicker)
    events.onDidAccept.register(this.quickPicker)
  }

  dispose () {
    this.quickPicker.dispose()
  }

  show () {
    this.quickPicker.show()
  }

  hide () {
    this.quickPicker.hide()
  }
}
