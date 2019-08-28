import * as vscode from 'vscode'
import * as path from 'path'
import { getActiveWorkspaceFolder } from './workspace'

let defaultWorkspaceName: string
const currentWorkspace = getActiveWorkspaceFolder()

if (currentWorkspace) {
  defaultWorkspaceName = path.basename(currentWorkspace.uri.fsPath)
}

export const channel = vscode.window.createOutputChannel('XPort');

export function display (message: string, workspaceName: string = defaultWorkspaceName) {
  channel.appendLine(`[XPort] {${new Date().toLocaleString()}} (${workspaceName || 'GLOBAL'}): ${message}`)
}

export function showOutput (preserveFocus?: boolean) {
  channel.show(preserveFocus)
}
