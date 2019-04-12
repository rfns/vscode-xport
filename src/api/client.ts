import 'isomorphic-fetch'
import { Agent } from 'https'
import { Authentication } from '../types'
import to from 'await-to-js'

interface ClientOptions {
  headers?: object
  authentication?: Authentication
}

function makeRequestHeaders (method: string, headers?: object, body?: object) {
  return {
    method,
    body: JSON.stringify(body),
    credentials: 'same-origin',
    headers: {
      ...headers,
      'Content-Type': 'application/json; charset=utf-8'
    }
  }
}

function checkFalsyOk (status: number, response: any): null | never {
  let message = 'Failed to complete remote action.'

  if (status > 301) {
    throw new Error(response.error.message)
  }

  return response
}

export function patchAgentWhenSSL (url: string, data: any) {
  if (url.match(/^https:\/\//)) {
    data.agent = new Agent({
      rejectUnauthorized: false
    })
  }
}

export async function fetchJSON (url: string, data?: any): Promise<any> {
  const response = await getFetchResponse(url, data)
  const json = await response.json()
  return checkFalsyOk(response.status, json)
}

export async function getFetchResponse (url: string, data?: any): Promise<Response> {
  patchAgentWhenSSL(url, data)
  return fetch(url, data)
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

  async head (url: string): Promise<any> {
    const configuration = makeRequestHeaders('HEAD', this.headers)
    const response =  await getFetchResponse(url, configuration)
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
