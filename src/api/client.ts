import 'isomorphic-fetch'
import { Authentication } from '../types'
import { RequestError } from '../errors'
import to from 'await-to-js'
interface ClientOptions {
  headers?: object
  authentication?: Authentication
}

let cookieJar = ''

function makeRequestHeaders (method: string, headers?: object, body?: object) {
  return {
    method,
    body: JSON.stringify(body),
    credentials: 'same-origin',
    headers: {
      ...headers,
      cookie: cookieJar,
      'Content-Type': 'application/json; charset=utf-8'
    }
  }
}

function checkFalsyOk (status: number, response?: any, rawText?: string): null | never {
  let message = 'Failed to complete the remote action.'

  if (rawText) {
    message = `${message}, received unexpected server error: ${rawText}`
  }

  if (status > 301) {
    if (response && response.error.message) {
      message = response.error.message
      throw new RequestError(message, response.error.internal_code || 5002)
    } else {
      throw new RequestError(message, 5001)
    }
  }

  return response
}

export async function fetchJSON (url: string, data?: any): Promise<any> {
  const response = await handleSession(url, data)
  let rawText = await response.text()
  let json

  try {
    json = JSON.parse(rawText)
  } catch (err) {
    throw new Error(`Failed to parse response from JSON because the incoming format is not valid: ${rawText || err.message}`)
  }

  return checkFalsyOk(response.status, json, rawText)
}

export async function handleSession (url: string, data?: any): Promise<Response> {
  const response = await fetch(url, data)
  const setCookie = response.headers.get('set-cookie')

  if (setCookie) {
    cookieJar = setCookie
  }

  return response
}

function createAuthorizationHeader (authentication: Authentication) {
  let { username, password } = authentication
  let Authorization = `Basic ${new Buffer(`${username}:${password}`).toString('base64')}`

  return {
    Authorization
  }
}

export class Client {
  public readonly headers?: any = {}
  private _busy: boolean

  constructor (options: ClientOptions) {
    this.headers = options.headers
    this._busy = false

    if (options.authentication) {
      this.headers = {
        ...this.headers,
        ...createAuthorizationHeader(options.authentication)
      }
    }
  }

  async get (url: string): Promise<any> {
    const configuration = makeRequestHeaders('GET', this.headers)
    return this.setRequestInProgress(url, configuration)
  }

  async post (url: string, body?: object): Promise<any> {
    const configuration = makeRequestHeaders('POST', this.headers, body)
    return this.setRequestInProgress(url, configuration)
  }

  async put (url: string, body?: object): Promise<any> {
    const configuration = makeRequestHeaders('PUT', this.headers, body)
    return this.setRequestInProgress(url, configuration)
  }

  async delete (url: string): Promise<any> {
    const configuration = makeRequestHeaders('DELETE', this.headers)
    return this.setRequestInProgress(url, configuration)
  }

  async patch (url: string): Promise<any> {
    const configuration = makeRequestHeaders('PATCH', this.headers)
    return this.setRequestInProgress(url, configuration)
  }

  async head (url: string): Promise<any> {
    const configuration = makeRequestHeaders('HEAD', this.headers)
    const response = await handleSession(url, configuration)
    checkFalsyOk(response.status, new Error('Server is not available.'))
  }

  private async setRequestInProgress (url: string, configuration: any) {
    this._busy = true

    const [err, response]: [Error | null, any] = await to(
      fetchJSON(url, configuration)
    )

    this._busy = false

    if (err) throw err
    return response
  }

  get busy () {
    return this._busy
  }
}
