import * as events from './events'

import { ChainedQuickPicker } from '../../shared/chainedQuickPicker'

const quickPicker = new ChainedQuickPicker({
  title: 'Type the pattern to search for (* or ? are valid wildcards)',
  ignoreFocusOut: true
})

quickPicker.onDidAccept(events.onDidAccept)
quickPicker.onDidChangeValue(events.onDidChangeValue)
quickPicker.onDidHide(events.onDidHide)

export default quickPicker
