import * as vscode from 'vscode'
import { to } from 'await-to-js'

import { Core } from '../../../core'
import * as message from '../../../shared/message'

async function getElegibleProjects (core: Core): Promise<any[]> {
  const [err, response] = await to(core.api.projects())
  let items: any = []

  if (response && response.projects.length) {
    items = response.projects
      .filter(project => project.has_items)
      .map(project => ({ label: project.name }))
  }

  if (err || !response) {
    core.output.display('A fatal error happened retrieving the project list.', 'WORKSPACE')
    core.output.display(`Details: ${err && err.message || 'Network error.'}`, 'WORKSPACE')
    message.displayError(core.output, 'Failed to complete the operation.', 'WORKSPACE')
  }

  return items
}

export default async function handleShow ({
  core,
  quickPicker,
  cancellationToken
}: {
  core: Core,
  quickPicker: vscode.QuickPick<any>,
  cancellationToken: vscode.CancellationTokenSource
}) {
  quickPicker.busy = true
  let items = []

  try {
    items = await getElegibleProjects(core)
  } catch (error) {
    quickPicker.hide()
  } finally {
    quickPicker.busy = false
  }

  if (items.length === 0) {
    return cancellationToken.cancel()
  }

  quickPicker.items = items

}
