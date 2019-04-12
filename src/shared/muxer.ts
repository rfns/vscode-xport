interface MuxerOptions {
  ephemeralOutput?: boolean
  ephemeralError?: boolean
  immediate?: boolean
  discriminator?: Function
}

interface MuxerTimeoutStrategyOptions extends MuxerOptions {
  timeout: number
  immediate?: boolean
}

interface MuxerBacklogStrategyOptions extends MuxerOptions {
  threshould: number
}

enum MuxerStrategyEnum {
  TIMEOUT,
  BACKLOG
}

function wrapArgs (fn: any) {
  return function callWithArgs (args: any) {
    return fn(...args)
  }
}

abstract class AbstractMuxer implements MuxerOptions {
  public readonly ephemeralOutput?: boolean = false
  public readonly ephemeralError?: boolean = true
  public readonly strategyType?: MuxerStrategyEnum = MuxerStrategyEnum.TIMEOUT
  public readonly immediate?: boolean = true

  private _complete: boolean = false

  protected _inputs: Function[] = []
  protected _output?: Function | null = null
  protected _error?: Function | null = null
  protected _discriminator?: Function = () => true

  protected _callArgs: any[] = []

  constructor (options: MuxerOptions) {
    this.ephemeralOutput = options.ephemeralOutput
    this.ephemeralError = options.ephemeralError
    this.immediate = options.immediate
    this._discriminator = options.discriminator
    this._complete = false
  }

  protected _scheduleCall (callWithArgs: Function, args: any = []) {
    const caller = () => callWithArgs(...args)
    this._inputs.push(caller)
    this._callArgs.push(args)
  }

  output (channel: Function): void {
    this._output = channel
  }

  error (errorCallback: Function): void {
    this._error = errorCallback
  }

  input (channel: Function): Function {
    const muxer = this

    return function scheduleWithArguments (...args: any) {
      muxer.reset()
      muxer._scheduleCall(channel, args)

      if (muxer.immediate) {
        muxer.mux()
      }
    }
  }

  removeInputs () {
    if (this._inputs.length > 0) {
      this._inputs = []
      this._callArgs = []
    }
  }

  removeOutput () {
    if (this._output) this._output = null
  }

  removeError () {
    if (this._error) this._error = null
  }

  protected async _executeChannels () {
    try {
      if (!this._output) throw new Error('Output not provided.')

      const discriminatedInputs = this._getDiscriminatedInputs()
      if (discriminatedInputs.length === 0) return

      const results = await Promise.all(discriminatedInputs.map(async (channel: any) => channel()))
      const withReturn = results.filter(result => result != null)
      if (withReturn.length) await this._output(withReturn)

      return results
    } catch (err) {
      if (this._error) this._error(err)
    } finally {
      this.removeInputs()
      if (this.ephemeralOutput) this.removeOutput()
      if (this.ephemeralError) this.removeError()

      this._complete = true
    }
  }

  private _getDiscriminatedInputs (): Function[] {
    const getDiscriminator = this._discriminator || (() => false)
    const discriminatedResults: string[] = []

    return this._inputs.reduceRight((inputs: any, input: any, i: number) => {
      const callArgsToTestEquality = this._callArgs[i]
      const result = getDiscriminator(...callArgsToTestEquality)

      if (!discriminatedResults.includes(result)) {
        discriminatedResults.push(result)
        return [...inputs, input]
      }

      return inputs
    }, [])
  }

  abstract reset (): void
  abstract mux(): void
}

export class MuxerTimeout extends AbstractMuxer implements MuxerTimeoutStrategyOptions {
  public readonly timeout: number = 500

  private timeoutId?: NodeJS.Timeout

  constructor (options: MuxerTimeoutStrategyOptions) {
    super(options)
    this.timeout = options.timeout
  }

  reset () {
    clearTimeout(this.timeout)
    this.timeoutId = undefined
  }

  mux () {
    if (this.timeoutId) this.reset()
    this._tick()
  }

  private _tick (): void {
    this.timeoutId = setTimeout(this._executeChannels.bind(this), this.timeout)
  }
}

export class MuxerBacklog extends AbstractMuxer implements MuxerBacklogStrategyOptions {
  public readonly threshould: number = 5

  private _queue: Function[] = []

  constructor (options: MuxerBacklogStrategyOptions) {
    super(options)
    this.threshould = options.threshould
  }

  reset () {
    this._inputs = []
    this._queue = []
  }

  protected _scheduleCall (callWithArgs: Function, args: any) {
    const caller = () => callWithArgs(...args)
    this._callArgs.push(args)

    if (this.remainingSlots > 0) {
      this._inputs.push(caller)
    } else {
      this._queue.push(caller)
    }
  }

  async mux (): Promise<void> {
    while (this._queue.length > 0) {
      this._inputs = [...this._inputs, ...this._queue.splice(0, this.remainingSlots)]
      await this._executeChannels()
    }

    if (this.remainingSlots === 0) {
      await this._executeChannels()
    }
  }

  private get remainingSlots () {
    return Math.abs(this.threshould - this._inputs.length)
  }
}
