import * as vscode from 'vscode'

export default function handleHide ({
  quickPicker
}: {
  quickPicker: vscode.QuickPick<any>,
}) {
  quickPicker.value = ''
  quickPicker.selectedItems = []
  quickPicker.activeItems = []
  quickPicker.items = []
}
