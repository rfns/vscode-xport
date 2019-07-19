export class DocumentLocker {
  private _lockedDocuments: Map<string, Thenable<any>> = new Map()

  lock(path: string, promise: Promise<any>) {
    if (this.isLocked(path)) return
    this._lockedDocuments.set(path, promise)
  }

  unlock (path: string) {
    this._lockedDocuments.delete(path)
  }

  unlockAll () {
    this._lockedDocuments.clear()
  }

  isLocked (path: string) {
    return this._lockedDocuments.has(path)
  }

  provideLockReason(path: string): Thenable<any> {
    const maybePromise = this._lockedDocuments.get(path)

    if (maybePromise) {
      return maybePromise.then(() => this.unlock(path))
    }

    return Promise.resolve()
  }
}
