import * as vscode from 'vscode'
import { to } from 'await-to-js'
import { writeFile } from 'fs-extra'
import * as message from  '../../../shared/message'

import { Core } from '../../../core'

export default async function handleAccept({
  core,
  quickPicker,
  previous
}: {
  core: Core,
  quickPicker: vscode.QuickPick<any>
  previous: { selectedItems: any[] }
}): Promise<void> {
  let selectedItems = [...quickPicker.selectedItems.map(item => item.label)]
  quickPicker.hide()

  const choice = await vscode.window.showInformationMessage('Do you want to include the affected projects (PRJ items) as well?', 'Yes', 'No, keep only the items.')

  if (choice === 'Yes') {
    selectedItems = [
      ...selectedItems,
      ...previous.selectedItems.map(item => `${item.label}.PRJ`)
    ]
  }

  let errorAndResponse: [any, any] = [undefined, undefined]

  await vscode.window.withProgress({
    title: `XPort: Exporting ${selectedItems.length} items. Please wait ...`,
    location: vscode.ProgressLocation.Notification
  }, async () => {
    errorAndResponse = await to(core.api.exportXML(selectedItems))
  })

  if (!errorAndResponse) return

  let [error, response] = errorAndResponse

  if (error) {
    core.output.display('A fatal error happened retrieving the document list.', 'WORKSPACE')
    core.output.display(error.serialize(), 'WORKSPACE')
    return message.displayError(core.output, 'Failed to complete the operation.', 'WORKSPACE')
  }

  const resource = await vscode.window.showSaveDialog({
    filters: {
      'eXtended Markup Language': ['xml']
    }
  })

  if (!resource) return
  const [writeError] = await to(writeFile(resource.fsPath, response.xml, core.configuration.xmlEncoding))

  if (writeError) {
    core.output.display(`Failed to save the XML file ${resource.toString()}.`)
    core.output.display(`Error: ${writeError.message}.`)
    return message.displayError(core.output, 'Failed to complete the operation.', 'WORKSPACE')
  }
}
