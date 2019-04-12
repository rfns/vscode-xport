import { FailedItem } from '../types'

export function serializeErrors (item: FailedItem, header: string = '')  {
  let message = header || ''

  if (item.error) {
    message = `${message}  Error: ${item.error.message}`

    if (item.error.origin) {
      message = `${message}  ${item.error.origin ? `\n  > Origin: ${item.error.origin.message}` : ''}\n`
    }
  }

  if (item.errors && item.errors.length > 0) {
    message = `${message}  Errors: ${item.errors.map((error, index) => {
      return `\n   [${index}] ${error.message}${error.origin? `\n    > Origin: ${error.origin.message}` : ''}`
    }).join(' ')}`
  }

  return message
}
