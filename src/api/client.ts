import * as vscode from 'vscode'
import 'isomorphic-fetch'
import to from 'await-to-js'

import { Authentication } from '../types'
import { RequestError } from '../errors'
interface ClientOptions {
  headers?: object
  authentication?: Authentication
  timeout: number
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

function checkFalsyOk (status: number, response?: any, rawText?: string): null | never {
  let message = 'Failed to complete the remote action.'

  if (rawText) {
    message = `${message}, received unexpected server error: ${rawText}`
  }

  if (status > 301) {
    if (response && response.error || response.errors) {
      message = response.error ? response.error.message : message
      throw new RequestError({
        message,
        status,
        response
      })
    } else {
      throw new RequestError({
        message,
        status,
        response: {
          error: {
            message
          }
        }
      })
    }

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
  public headers?: any = {}
  private _busy: boolean

  constructor (options: ClientOptions) {
    this.headers = options.headers
    this._busy = false

    this._setRequestTimeout(options.timeout)
    this._setAuthorizationHeader(options.authentication)
  }

  async get (url: string): Promise<any> {
    const configuration = makeRequestHeaders('GET', this.headers)
    return this._setRequestInProgress(url, configuration)
  }

  async post (url: string, body?: object): Promise<any> {
    const configuration = makeRequestHeaders('POST', this.headers, body)
    return this._setRequestInProgress(url, configuration)
  }

  async put (url: string, body?: object): Promise<any> {
    const configuration = makeRequestHeaders('PUT', this.headers, body)
    return this._setRequestInProgress(url, configuration)
  }

  async delete (url: string): Promise<any> {
    const configuration = makeRequestHeaders('DELETE', this.headers)
    return this._setRequestInProgress(url, configuration)
  }

  async patch (url: string): Promise<any> {
    const configuration = makeRequestHeaders('PATCH', this.headers)
    return this._setRequestInProgress(url, configuration)
  }

  async head (url: string): Promise<any> {
    const configuration = makeRequestHeaders('HEAD', this.headers)
    const response = await this._handleAuthenticatedRequest(url, configuration)
    checkFalsyOk(response.status, new Error('Server is not available.'))
  }

  private async _setRequestInProgress (url: string, configuration: any) {
    this._busy = true

    const [err, response]: [Error | null, any] = await to(
      this._fetchJSON(url, configuration)
    )

    this._busy = false

    if (err) throw err
    return response
  }

  private async _handleAuthenticatedRequest (url: string, data?: any): Promise<Response> {
    const response = await fetch(url, data)
    const setCookie = response.headers.get('set-cookie')

    if (setCookie) this.headers.cookie = setCookie
    return response
  }


  private async _fetchJSON (url: string, data?: any): Promise<any> {
    const response = await this._handleAuthenticatedRequest(url, data)
    let rawText = await response.text()
    let json

    try {
      json = JSON.parse(rawText)
      rawText = ''
    } catch (err) {
      throw new Error(`Failed to parse response from JSON because the incoming format is not valid: ${rawText || err.message}`)
    }

    return checkFalsyOk(response.status, json, rawText)
  }

  get busy () {
    return this._busy
  }

  private _setRequestTimeout (timeout: number) {
    this.headers = {
      ...this.headers,
      'X-CSP-Gateway-Timeout': timeout
    }
  }

  private _setAuthorizationHeader (authentication?: Authentication) {
    if (!authentication) return
    this.headers = {
      ...this.headers,
      ...createAuthorizationHeader(authentication)
    }
  }
}
