import * as vscode from 'vscode'
import * as path from 'path'

export class XRFRepository implements vscode.QuickDiffProvider {
  constructor (private workspaceFolder: vscode.WorkspaceFolder) {}

  provideOriginalResource (uri?: vscode.Uri): vscode.ProviderResult<vscode.Uri> {
    return uri
  }

  provideSourceControlledResources (): vscode.Uri[] {
		return [
			vscode.Uri.file(this.createLocalResourcePath('cls')),
			vscode.Uri.file(this.createLocalResourcePath('inc')),
      vscode.Uri.file(this.createLocalResourcePath('mvi')),
      vscode.Uri.file(this.createLocalResourcePath('int')),
      vscode.Uri.file(this.createLocalResourcePath('mac')),
      vscode.Uri.file(this.createLocalResourcePath('web'))
    ]
  }

  createLocalResourcePath(extension: string) {
		return path.join(this.workspaceFolder.uri.fsPath, extension)
	}
}
