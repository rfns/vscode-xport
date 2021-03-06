import * as vscode from 'vscode'
import { Core } from '../core'
import { fetchSelectedItems } from '../shared/project'
import { ProjectExplorerItem } from '../explorer/projectExplorer'
import * as message from '../shared/message'
import { getFileEncodingConfiguration } from '../shared/document'
import { EncodingDirection } from '../types'

async function getSourceWorkspaceFolder (item: ProjectExplorerItem) {
  let workspaceFolder: vscode.WorkspaceFolder | undefined

  const availableWorkspaces = (vscode.workspace.workspaceFolders || [])
    .filter(workspace => workspace.name === item.project)
    .map(workspace => ({ label: workspace.name, description: workspace.uri.fsPath, workspace }))

  if (availableWorkspaces.length > 1) {
    const choice = await vscode.window.showQuickPick(availableWorkspaces, { placeHolder: 'Select the workspace folder to where the file should be created or updated.' })
    if (choice) workspaceFolder = choice.workspace
  } else {
    workspaceFolder = availableWorkspaces[0].workspace
  }

  return workspaceFolder
}

export function register(core: Core): vscode.Disposable {
  return vscode.commands.registerCommand('xport.projectExplorer.pickItems', async (item: ProjectExplorerItem) => {
    const workspaceFolder = await getSourceWorkspaceFolder(item)

    if (!workspaceFolder) {
      core.output.display(`Fetch the whole project before attempting to fetch a single source.`, item.project)
      return message.displayError(core.output, `You need to fetch the whole project first.`, item.project)
    }

    const destination = workspaceFolder.uri.fsPath
    const uri = vscode.Uri.file(destination)
    const items = [{
      path: item.fullPath,
      encoding: getFileEncodingConfiguration(uri, EncodingDirection.OUTPUT)
    }]

    return fetchSelectedItems({ core, destination, items })
  })
}
