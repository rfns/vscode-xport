import * as vscode from 'vscode'

export async function displayError (output: any, message: string, name: string = 'WORKSPACE') {
  const selection = await vscode.window.showErrorMessage(`[${name}] ${message} \nCheck the output for more details.`, 'View output')
  if (selection === 'View output') {
    output.showOutput()
  }
}

export async function displayWarning (message: string, name: string = 'WORKSPACE') {
  return vscode.window.showWarningMessage(`[${name}] ${message}`, 'Close')
}

export async function displayInformation (message: string, name: string = 'WORKSPACE')  {
  return vscode.window.showInformationMessage(`[${name}] ${message}`, 'Close')
}
