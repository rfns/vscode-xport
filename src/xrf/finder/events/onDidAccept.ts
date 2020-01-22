import * as vscode from 'vscode'
import { XRF_SCHEME } from '../../../xrf'

export const CACHE_TYPES_REGEX = /(cls|inc|mvi|mvb|mac|int|bas|mac)/

function resolveVirtualPath (item: vscode.QuickPickItem) {
  let type = (item && item.label.split('.').pop() || '').toLowerCase()
  let path = ''

  if (!type.match(CACHE_TYPES_REGEX)) {
    if (item.label.startsWith('/')) type = 'public'
  }

  path = type

  if (type === 'public') {
    path = item.label
  } else if (type === 'cls') {
    let classPath = item.label.split('.')
    classPath = classPath.slice(0, classPath.length - 1)
    path = `${path}/${classPath.join('/')}.cls`
  } else {
    path = `${path}/${item.label}`
  }
  return path
}

export default async function handleAccept({
  quickPicker
}: {
  quickPicker: vscode.QuickPick<any>
}): Promise<void> {
  const item = quickPicker.activeItems[0]
  if (item) {
    const path = resolveVirtualPath(item)
    const uri = vscode.Uri.file(path).with({ scheme: XRF_SCHEME })
    const isSystemDocument = /[\\/]%/.test(path)
    await vscode.commands.executeCommand('setContext', 'isSystemDocument', isSystemDocument)
    vscode.commands.executeCommand('xport.commands.previewDocument', uri)
  }
}
