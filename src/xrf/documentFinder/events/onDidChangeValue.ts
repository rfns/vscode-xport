import * as vscode from 'vscode'
import debounce = require('lodash.debounce')
import { Core } from '../../../core'
import { to } from 'await-to-js'
import { XRFDocumentQuickPickItem } from '../'
import * as message from '../../../shared/message'

export function register (
  core: Core,
  quickPicker: vscode.QuickPick<XRFDocumentQuickPickItem>
): vscode.Disposable {
  async function handleOndDidChangeValue (pattern: string): Promise<void> {
    pattern = encodeURI(pattern)
    quickPicker.busy = true
    const [err, response] = await to(core.api.documents(pattern))
    quickPicker.busy = false
    if (err) {
      quickPicker.items = [{ label: 'Failed to fetch due to a request error.' }]
      core.output.display('A fatal error happened retrieving the document list.', 'root')
      core.output.display(`Details: ${err.message}`, 'root')
      return message.displayError(core.output, 'Failed to complete the operation.', 'root')
    }

    if (response.matches.length) {
      quickPicker.items = response.matches.map((name: any) => ({ label: name, webAppPath: response.web_app_path }))
    } else {
      quickPicker.items = [{ label: 'Nothing found.' }]
    }
  }

  const debouncedListener = debounce(handleOndDidChangeValue, 400)
  return quickPicker.onDidChangeValue(debouncedListener)
}
