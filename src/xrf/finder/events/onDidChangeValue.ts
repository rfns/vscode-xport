import * as vscode from 'vscode'
import debounce = require('lodash.debounce')
import { Core } from '../../../core'
import { to } from 'await-to-js'
import * as message from '../../../shared/message'

const handleOnDidChangeValue = debounce(async ({
  value,
  quickPicker,
  core
}: {
  value: string,
  quickPicker: vscode.QuickPick<any>,
  core: Core
}) => {
  value = encodeURI(value)
  quickPicker.busy = true
  const [err, response] = await to(core.api.find(value))
  quickPicker.busy = false
  if (err) {
    quickPicker.items = [{ label: 'Failed to fetch due to a request error.' }]
    core.output.display('A fatal error happened retrieving the document list.', 'WORKSPACE')
    core.output.display(`Details: ${err.message}`, 'WORKSPACE')
    return message.displayError(core.output, 'Failed to complete the operation.', 'WORKSPACE')
  }

  if (response.matches.length) {
    quickPicker.items = response.matches.map((name: any) => ({ label: name, webAppPath: response.web_app_path }))
  } else {
    quickPicker.items = [{ label: 'Nothing found.' }]
  }
}, 400)

export default handleOnDidChangeValue
