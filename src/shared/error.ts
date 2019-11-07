import { RequestError } from '../types'

export function serializeErrors (request: RequestError, header: string = '')  {
  let message = header || ''

  if (request.error) {
    message = `${message}  Error: ${request.error.message}`

    if (request.error.origin) {
      message = `${message}  ${request.error.origin ? `\n  > Origin: ${request.error.origin.message}` : ''}\n`
    }
  }

  if (request.errors && request.errors.length > 0) {
    message = `${message}  Errors: ${request.errors.map((error, index) => {
      return `\n   [${index}] ${error.message}${error.origin? `\n    > Origin: ${error.origin.message}` : ''}`
    }).join(' ')}`
  }

  return message
}
