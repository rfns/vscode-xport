import * as vscode from 'vscode'
import { XRFDocumentQuickPickItem } from '../'

export function register (quickPicker: vscode.QuickPick<XRFDocumentQuickPickItem>) {
  quickPicker.onDidHide(() => quickPicker.dispose())
}
