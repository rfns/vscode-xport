import * as vscode from 'vscode'
import { Authentication, Configuration } from '../types'

function setupAuthentication () {
  if (process.env.TEST_AUTHENTICATION_USERNAME && process.env.TEST_AUTHENTICATION_PASSWORD) {
    return {
      username: '_SYSTEM',
      password: 'SYS'
    }
  }
  throw new Error('envs TEST_AUTHENTICATION_USERNAME and TEST_AUTHENTICATION_PASSWORD must be defined.')
}

function setupDefaultOptions () {
  if (process.env.TEST_HOST && process.env.TEST_NAMESPACE) {
    return {
      host: process.env.TEST_HOST,
      namespace: process.env.TEST_NAMESPACE,
      disposables: [],
      applicationPath: `csp/${process.env.TEST_NAMESPACE}`,
      enabled: true,
      healthCheck: 'disabled'
    }
  }
  throw new Error('envs TEST_HOST and TEST_NAMESPACE must be defined.')
}

function setupWorkspaceFolder (): Promise<any> {
  function disposeAll (disposables: vscode.Disposable[]) {
    disposables.forEach((disposable: vscode.Disposable) => disposable.dispose())
  }

  return new Promise(async (resolve, reject) => {
    if (!process.env.TEST_WORKSPACE_FOLDER) {
      throw new Error('TEST_WORKSPACE_FOLDER env must be defined to run this test.')
    }

    const uri = vscode.Uri.file(process.env.TEST_WORKSPACE_FOLDER)
    if (!uri) throw new Error('Could not find the workspace uri.')

    let disposables: vscode.Disposable[] = []

    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      const workspace = vscode.workspace.getWorkspaceFolder(uri)

      if (!workspace) {
        disposeAll(disposables)
        return reject(new Error('Failed to initialize the test workspace.'))
      }

      return resolve(workspace)
    }, null, disposables)

    const result = vscode.workspace.updateWorkspaceFolders(0, null, { uri, name: 'xport-test' })

    setTimeout(() => {
      disposeAll(disposables)
      reject(new Error('Timed out while trying to initialize the test workspace.'))
    }, 1500)
  })
}

export async function setupRequestOptions (): Promise<any> {
  const authentication: Authentication = setupAuthentication()
  const options: Configuration = setupDefaultOptions()
  //const workspaceFolder: vscode.WorkspaceFolder = await setupWorkspaceFolder()

  const workspaceFolder = {
    uri: vscode.Uri.parse(`file://${process.env.TEST_WORKSPACE_FOLDER}`),
    index: 0,
    name: 'xport-testing'
  }

  return {
    workspaceFolder,
    options: {
      ...options,
      authentication,
    }
  }
}
