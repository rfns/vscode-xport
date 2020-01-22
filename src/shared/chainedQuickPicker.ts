import * as vscode from 'vscode'
import { Core } from '../core'

interface QuickPickerOptions {
  title?: string
  canSelectMany?: boolean
  placeholder?: string
  ignoreFocusOut?: boolean
  buttons?: vscode.QuickInputButton[]
}

export class ChainedQuickPicker implements vscode.Disposable {
  private _quickPicker: vscode.QuickPick<any> = vscode.window.createQuickPick()
  private _core: Core | null = null
  private _nextPicker?: ChainedQuickPicker
  private _previousPicker?: ChainedQuickPicker
  private _built: boolean = false

  private _onDidChangeValue: vscode.EventEmitter<any> = new vscode.EventEmitter<any>()
  private _onDidHide: vscode.EventEmitter<any> = new vscode.EventEmitter<any>()
  private _onDidAccept: vscode.EventEmitter<any> = new vscode.EventEmitter<any>()
  private _onDidChangeSelection: vscode.EventEmitter<any> = new vscode.EventEmitter<any>()
  private _onDidShow: vscode.EventEmitter<any> = new vscode.EventEmitter<any>()
  private _onDidTriggerButton: vscode.EventEmitter<any> = new vscode.EventEmitter<any>()
  private _onDidAdvanceQueue: vscode.EventEmitter<any> = new vscode.EventEmitter<any>()

  readonly onDidChangeValue: vscode.Event<any> = this._onDidChangeValue.event
  readonly onDidHide: vscode.Event<any> = this._onDidHide.event
  readonly onDidAccept: vscode.Event<any> = this._onDidAccept.event
  readonly onDidChangeSelection: vscode.Event<any> = this._onDidChangeSelection.event
  readonly onDidShow: vscode.Event<any> = this._onDidShow.event
  readonly onDidTriggerButton: vscode.Event<any> = this._onDidShow.event
  readonly onDidAdvanceQeue: vscode.Event<any> = this._onDidAdvanceQueue.event

  constructor (private options: QuickPickerOptions) {}

  build (core: Core) {
    if (!this._built) this._built = true
    else  return this

    this._nextPicker && this._nextPicker.build(core)

    this._core = core
    this._quickPicker = vscode.window.createQuickPick()
    this._quickPicker.title = this.options.title
    this._quickPicker.canSelectMany = this.options.canSelectMany || false
    this._quickPicker.ignoreFocusOut = this.options.ignoreFocusOut || false
    this._quickPicker.placeholder = this.options.placeholder
    this._quickPicker.buttons = this.options.buttons || []
    this._registerNativeEvents()

    return this
  }

  dispose () {
    this._onDidChangeValue.dispose()
    this._onDidHide.dispose()
    this._onDidAccept.dispose()
    this._onDidChangeSelection.dispose()
    this._quickPicker.dispose()

    this._nextPicker && this._nextPicker.dispose()
  }

  show () {
    const quickPicker = this._quickPicker
    const core = this._core
    const previous = this._previous()
    const cancellationToken = new vscode.CancellationTokenSource()

    this._quickPicker.show()
    this._onDidShow.fire({ core, quickPicker, previous, cancellationToken })
  }

  hide () {
    this._quickPicker.busy = false
    this._quickPicker.hide()
  }

  flush () {
    this._quickPicker.activeItems = []
    this._quickPicker.items = []
    this._quickPicker.selectedItems = []
    this._quickPicker.value = ''
  }

  setValue (value: string) {
    this._quickPicker.value = value

    const quickPicker = this._quickPicker
    const core = this._core

    this._onDidChangeValue.fire({ core, quickPicker, value })
  }

  setTitle (title: string) {
    this._quickPicker.title = title
  }

  get items () {
    return this._quickPicker.items
  }

  get activeItems () {
    return this._quickPicker.activeItems
  }

  get selectedItems () {
    return this._quickPicker.selectedItems
  }

  get value () {
    return this._quickPicker.value
  }

  private _registerNativeEvents () {
    const quickPicker = this._quickPicker
    const core = this._core

    this._quickPicker.onDidHide(() => {
      this._safelyResetState()
      const cancellationToken = new vscode.CancellationTokenSource()
      if (!cancellationToken.token.isCancellationRequested) {
        this._onDidHide.fire({ core, quickPicker })
      }
    })

    this._quickPicker.onDidChangeValue((value: string) => {
      const previous = this._previous()
      const cancellationToken = new vscode.CancellationTokenSource()
      this._onDidChangeValue.fire({ core, quickPicker, previous, value, cancellationToken })
    })

    this._quickPicker.onDidAccept(() => {
      const previous = this._previous()
      const cancellationToken = new vscode.CancellationTokenSource()
      this._onDidAccept.fire({ core, previous, quickPicker, cancellationToken })

      if (!cancellationToken.token.isCancellationRequested) this._next()
    })

    this._quickPicker.onDidChangeSelection((selectedItems: any[]) => {
      const previous = this._previous()
      const cancellationToken = new vscode.CancellationTokenSource()
      this._onDidChangeSelection.fire({ core, quickPicker, previous, selectedItems, cancellationToken })
    })

    this._quickPicker.onDidTriggerButton((e: vscode.QuickInputButton) => {
      const previous = this._previous()
      const cancellationToken = new vscode.CancellationTokenSource()
      this._onDidTriggerButton.fire({ core, quickPicker, previous, pressedButton: e, cancellationToken })
    })
  }

  private _previous () {
    let previous: any = null

    if (this._previousPicker) {
      const { selectedItems, activeItems, items, value: previousValue } = this._previousPicker
      previous = { selectedItems, activeItems, items, value: previousValue }
    }

    return previous
  }

  private _next () {
    if (this._nextPicker) {
      this._previousPicker = this
      this._nextPicker.show()
    }
  }

  private _safelyResetState () {
    if (this._nextPicker) return

    this._quickPicker.value = ''
    this._quickPicker.selectedItems = []
    this._quickPicker.activeItems = []
    this._quickPicker.items = []
  }

  addStep (nextPicker: ChainedQuickPicker) {
    this._nextPicker = nextPicker
    this._nextPicker._previousPicker = this
    return this._nextPicker
  }
}
