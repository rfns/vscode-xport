import { to } from 'await-to-js'
import { Core } from './core'
import * as output from './shared/output'
import * as message from './shared/message'

export class HealthCheck {
  constructor (
    private _core: Core,
    private _intervalInMilliseconds: number,
    private _immediate: boolean = false
  ) {
    if (this._immediate) this.startHealthCheck()
  }

  private _timer: any

  startHealthCheck () {
    this.stopHealthCheck()

    this._timer = setInterval(async () => {
      const start = new Date()

      const [err] = await to(this._core.api.ping())
      const end = new Date()

      output.display(`Health check routine took ${end.getTime() - start.getTime()} ms to finish.`)

      if (err && this._core.configuration) {
        output.display(`Warning: Failed to check ${this._core.configuration.host}: server is offline or unavailable: Reason: ${err.message}`, 'GLOBAL')
        message.displayError(output, `The server is unavailable. You'll not be able to pull or publish any sources meanwhile.`, 'GLOBAL')
      }
    }, this._intervalInMilliseconds)
  }

  stopHealthCheck () {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  }

  configureInterval(ms: number) {
    this._intervalInMilliseconds = ms
    this.startHealthCheck()
  }
}
