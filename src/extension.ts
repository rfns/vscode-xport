// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import { Core } from './core'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const core = new Core()
  core.init()
	context.subscriptions.push(core)
}

// this method is called when your extension is deactivated
export function deactivate() {}
