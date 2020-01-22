import { ServerResponseError } from './types'
import { serializeErrors } from './shared/error'

export class RequestError extends Error {
  public readonly response: ServerResponseError
  public readonly status: number

  constructor ({
    message,
    status,
    response
  }: {
    message: string,
    status: number,
    response: ServerResponseError
  }) {
    super(message)
    this.name = 'RequestError'
    this.status = status
    this.response = response
  }

  serialize (): string {
    return serializeErrors(this.response, this.message)
  }
}
