import * as vscode from 'vscode'
import { XRF_SCHEME } from '../../xrf'
import { XRFDocumentQuickPickItem } from '../finder'

export const CACHE_TYPES_REGEX = /(cls|inc|mvi|mvb|mac|int|mac)/

function getNormalizedPath (item: XRFDocumentQuickPickItem) {
  let type = (item && item.label.split('.').pop() || '').toLowerCase()
  let path = ''

  if (!type.match(CACHE_TYPES_REGEX)) {
    if (item.label.startsWith('/')) type = 'web'
  }

  path = type

  if (type === 'web') {
    path = item.webAppPath ? item.label.replace(item.webAppPath, type) : item.label
  } else if (type === 'cls') {
    let classPath = item.label.split('.')
    classPath = classPath.slice(0, classPath.length - 1)
    path = `${path}/${classPath.join('/')}.cls`
  } else {
    path = `${path}/${item.label}`
  }
  return path
}

export function register(quickPicker: vscode.QuickPick<vscode.QuickPickItem>): vscode.Disposable {
  return quickPicker.onDidAccept(async () => {
    const item = quickPicker.activeItems[0]
    if (item) {
      const path = getNormalizedPath(item)
      const uri = vscode.Uri.file(path).with({ scheme: XRF_SCHEME })
      const isSystemDocument = /[\\/]%/.test(path)
      await vscode.commands.executeCommand('setContext', 'isSystemDocument', isSystemDocument)
      vscode.commands.executeCommand('xport.commands.previewDocument', uri)
    }
  })
}
