import * as events from './events'
import { ChainedQuickPicker } from '../../shared/chainedQuickPicker'

const projectPicker = new ChainedQuickPicker({
  canSelectMany: true,
  title: 'Select one or more projects to search for items'
})

projectPicker.onDidShow(events.onDidShow)

export default projectPicker
