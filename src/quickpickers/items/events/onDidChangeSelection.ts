import * as vscode from 'vscode'

export default function handleChangeSelect ({
  selectedItems,
  quickPicker
}: {
  selectedItems: any[],
  quickPicker: vscode.QuickPick<any>
}) {
  const shouldSelectAllActive = selectedItems.find(item => item.multiSelector)

  if (shouldSelectAllActive) {
    const { activeItems } = quickPicker
    quickPicker.selectedItems = activeItems.filter(item => item.multiSelector === undefined)
  }
}
