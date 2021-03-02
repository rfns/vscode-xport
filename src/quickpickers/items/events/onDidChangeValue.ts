import * as vscode from 'vscode'
import debounce = require('lodash.debounce')
import { Core } from '../../../core'
import { to } from 'await-to-js'
import * as message from '../../../shared/message'

// Unused because we fetch everything at once today.
// This might change in the future so we'll leave it unrequired.
const handleOnDidChangeValue = debounce(async ({
  value,
  quickPicker,
  previous,
  core
}: {
  value: string,
  quickPicker: vscode.QuickPick<any>,
  previous?: { selectedItems?: string[], activeItems?: any[], items?: any[], value?: string }
  core: Core
}) => {
  let pattern = encodeURI(value)
  let selectedItems = previous && previous.selectedItems && previous.selectedItems.join(',')

  if (!selectedItems) return

  quickPicker.busy = true

  const [err, response] = await to(core.api.list(pattern, selectedItems))
  quickPicker.busy = false

  if (err || !response) {
    core.output.display('A fatal error happened while retrieving the document list.', 'WORKSPACE')
    core.output.display(`Details: ${err && err.message || 'Network error.'}`, 'WORKSPACE')
    message.displayError(core.output, 'Failed to complete the operation.', 'WORKSPACE')
  }

  if (response.matches.length) {
    quickPicker.items = response.matches.map((name: any) => ({ label: name }))
  } else {
    quickPicker.items = [{ label: 'Nothing found.' }]
  }
}, 400)

export default handleOnDidChangeValue
