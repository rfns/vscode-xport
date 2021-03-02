import * as events from './events'

import { ChainedQuickPicker } from '../../shared/chainedQuickPicker'

const itemPicker = new ChainedQuickPicker({
  title: 'Select one or more items that should be included into the XML file',
  canSelectMany: true,
  ignoreFocusOut: true
})

itemPicker.onDidAccept(events.onDidAccept)
itemPicker.onDidShow(events.onDidShow)
itemPicker.onDidHide(events.onDidHide)
itemPicker.onDidChangeSelection(events.onDidChangeSelection)

export default itemPicker
