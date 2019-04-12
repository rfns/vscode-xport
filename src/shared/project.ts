import * as path from 'path'
import * as vscode from 'vscode'
import * as message from './message'
import { to } from 'await-to-js'
import { Core } from '../core'
import { serializeFailures, write, getDocumentEOLChars } from './document'
import { serializeErrors } from './error'
import { ensureWorkspaceFolderExists, getWorkspaceFolderByName } from './workspace'
import { ProjectExplorerItem } from '../explorer/projectExplorer'
import { MixedResponse, RequestItem, GroupedRequestItems } from '../types'

export function getProjectName (uri: vscode.Uri): string {
  return uri.authority
}

export async function compileProject (core: Core, item: ProjectExplorerItem, progress: any) {
  progress.report({ message: `Compiling the project ${item.project}` })

  const [err, response] = await to(core.api.compile(item.project))

  if (err) {
    core.output.display('A fatal error happened while publishing changes.')
    core.output.display(`Details: ${err.message}`)
    await message.displayError(core.output, 'Unable to complete the action due to a fatal error.')
  }

  if (response.log.length > 0) {
    core.output.display(`Compiler output: \n ${response.log.join('\n   ')}`, item.project)
    if (response.error || (response.errors && response.errors.length)) {
      const header = 'Failed to compile the project'
      core.output.display(serializeErrors(response, `${header}\n`), item.project)
      message.displayError(core.output, 'The project has been compiled but with some errors.', item.project)
    } else {
      message.displayInformation('The project has compiled without errors.', item.project)
    }
  }
}

export async function synchronizeProject (core: Core, name: string, items: string[], progress: any) {
  const projectWorkspaceFolder = getWorkspaceFolderByName(name)
  if (!projectWorkspaceFolder) return null

  const workspaceFolderPath = projectWorkspaceFolder.uri.fsPath
  const delimiter = workspaceFolderPath.includes('\\') ? '\\' : '/'

  const pathParts = projectWorkspaceFolder.uri.fsPath.split(delimiter)
  const workspaceParentDir = pathParts.slice(0, pathParts.length - 1).join(delimiter)

  return downloadProject(core, name, workspaceParentDir, items, progress)
}

export async function downloadProject (
  core: Core,
  name: string,
  pathToSave: string,
  items: string[],
  progress: any
): Promise<null | { writings:  MixedResponse, apiResponse: MixedResponse }> {
  const workspaceFolderPath = path.resolve(pathToSave, name)
  const workspaceFolder = await ensureWorkspaceFolderExists(workspaceFolderPath)

  let apiResponse: any
  let writings: any

  if (workspaceFolder) {
    progress.report(`XPort: Downloading items from ${name}`)
    const [err, r] = await to(core.api.sources({ workspaceFolder, items }))

    apiResponse = r

    if (err) {
      core.output.display('A fatal error happened while publishing changes.')
      core.output.display(`Details: ${err.message}`)
      await message.displayError(core.output, 'Unable to complete the action due to a fatal error.')
    } else if (apiResponse) {
      if (apiResponse.has_errors) {
        core.output.display(serializeFailures(apiResponse.failure), name)
        await message.displayError(core.output, `Failed to fetch ${apiResponse.success.length} items.`, name)
      }

      progress.report(`XPort: Writing files`)

      writings = await write(apiResponse.success)
      progress.report('XPort: Standby')

      if (writings.failure.items.length > 0) {
        core.output.display(serializeFailures(writings.errors), name)
        await message.displayError(core.output, `Failed to fetch ${writings.failure.items.length} items.`, name)
      }
      core.output.display(`Operation result: ↓ ${apiResponse.success.length} | ✎ ${writings.success.length} | ✘ ${apiResponse.failure.items.length}.`, name)
    }
  }

  return {
    writings,
    apiResponse
  }
}

export async function downloadProjects (
  core: Core,
  projects: string[],
  destination: string,
  progress: any
): Promise<void> {
  for (let i = 0, l = projects.length; i < l; i++) {
    await downloadProject(core, projects[i], destination, ['*'], progress)
  }
}

export async function publishProjectItems (
  core: Core,
  workspaceFolder: vscode.WorkspaceFolder,
  items: RequestItem[],
  progress: any
): Promise<void> {
  const { name } = workspaceFolder

  progress.report({ message: `XPort: Publishing ${items.length } items to ${name}` })
  const [err, response] = await to(core.api.publish(workspaceFolder, items))

  if (err) {
    core.output.display('A fatal error happened while publishing changes.', name)
    core.output.display(`Details: ${err.message}`, name)
    await message.displayError(core.output, 'Unable to complete the action due to a fatal error.', name)
  } else if (response) {
    progress.report({ message: `XPort: Writing files` })
    const writingResults = await write(response.success)

    if (response.has_errors) {
      core.output.display(serializeFailures(response.failure), name)
      await message.displayError(core.output, `Failed to publish ${response.failure.items.length} items.`, name)
    }

    if (writingResults.failure.items.length) {
      core.output.display(serializeFailures(writingResults.failure), name)
      await message.displayError(core.output, `Failed to write ${writingResults.failure.items.length} files.`, name)
      core.xrfDocumentProvider.refresh()
    }

    core.output.display(`Operation result: ↑ ${items.length} | ✎ ${writingResults.success.length} | ✘ ${response.failure.items.length}.`, name)

    if (response.warning) {
      message.displayInformation(response.warning, name)
    }
  }
}

export function groupDocumentsByProject (docs: vscode.TextDocument[]): GroupedRequestItems {
  return docs.reduce((groups: any, doc: vscode.TextDocument) => {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri)

    if (workspaceFolder)  {
      const eol = getDocumentEOLChars(doc)
      const current = groups[workspaceFolder.name] = groups[workspaceFolder.name] || {}
      current.workspaceFolder = workspaceFolder
      current.items = (current.items || []).concat([{
        path: doc.uri.fsPath,
        content: doc.getText().split(eol)
      }])
    }
    return groups
  }, {})
}

