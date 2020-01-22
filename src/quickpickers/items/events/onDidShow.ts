import * as vscode from 'vscode'
import { to } from 'await-to-js'

import { Core } from '../../../core'
import * as message from '../../../shared/message'

export default async function handleShow ({
  core,
  quickPicker,
  previous
}: {
  core: Core,
  quickPicker: vscode.QuickPick<any>,
  previous: { selectedItems?: string[], activeItems?: any[], items?: any[], value?: string }
}) {
  quickPicker.busy = true

  let selectedItems = previous && previous.selectedItems &&
    previous.selectedItems.map((item: any) => item.label).join(',')

  if (!selectedItems) return

  const [err, response] = await to(core.api.list('', selectedItems))
  quickPicker.busy = false

  if (err || !response) {
    core.output.display('A fatal error happened retrieving the document list.', 'WORKSPACE')
    core.output.display(`Details: ${err && err.message || 'Network error.'}`, 'WORKSPACE')
    return message.displayError(core.output, 'Failed to complete the operation.', 'WORKSPACE')
  }

  const items: vscode.QuickPickItem[] = response.matches.map((match: string) => ({ label: match }))

  quickPicker.items = items

}
