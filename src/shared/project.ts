import * as path from 'path'
import * as vscode from 'vscode'
import * as message from './message'
import { to } from 'await-to-js'
import { writeFile } from 'fs-extra'
import { Core } from '../core'
import { serializeFailures, write, getDocumentEOLChars } from './document'
import { serializeErrors } from './error'
import { ensureWorkspaceFolderExists, getWorkspaceFolderByName } from './workspace'
import { ProjectExplorerItem } from '../explorer/projectExplorer'
import { MixedResponse, RequestItem, GroupedRequestItems } from '../types'

export function getProjectName (uri: vscode.Uri): string {
  return uri.authority
}

async function notifyFatalError (core: Core, name: string, err: Error, header: string): Promise<void> {
  core.output.display(header, name)
  core.output.display(`Details: ${err.message}`, name)
  await message.displayError(core.output, 'Unable to complete the action due to a fatal error.', name)
}

export async function compileProject (core: Core, item: ProjectExplorerItem, progress: any) {
  progress.report({ message: `Compiling the project ${item.project}` })

  const [err, response] = await to(core.api.compile(item.project))

  if (err) {
    notifyFatalError(core, err, name, 'A fatal error happened while compiling the project.')
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

export async function downloadProjectLazily (
  core: Core,
  name: string,
  pathToSave: string,
  page: number = 1,
  size: number = 20
) {
  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    cancellable: true
  }, async (progress: any) => {
    progress.report({ messsage: `Preparing to download ${name} ...` })

    const workspaceFolderPath = path.resolve(pathToSave, name)
    const workspaceFolder = await ensureWorkspaceFolderExists(workspaceFolderPath)

    if (workspaceFolder) {
      progress.report({ message: 'Counting items ...' })
      const [err, result] = await to(core.api.count(workspaceFolder))
      let more = true

      let downloaded = 0
      let failed = 0
      let written = 0
      let last = { index: 1 }
      let completeRatio = 0
      let previous = 0

      while (more) {
        previous = completeRatio
        completeRatio = Math.floor((100 * last.index) / result.count)
        const step = completeRatio - previous

        progress.report({
          increment: step,
          message: `Downloading sources and writing files (${completeRatio}% complete).`
        })

        const [err, sourceList] = await to(core.api.listSources(workspaceFolder, { page, size }))

        if (err)  {
          return notifyFatalError(core, name, err, 'A fatal error happened while downloading the project.')
        }

        last = sourceList.success[sourceList.success.length - 1]
        downloaded += sourceList.success.length
        page += 1
        more = sourceList.more

        if (sourceList.has_errors) {
          failed += sourceList.failure.items.length
          core.output.display(serializeFailures(sourceList.failure), name)
        }

        const writings = await write(sourceList.success, workspaceFolder.uri)
        written += writings.success.length

        if (writings.failure.items.length > 0) {
          core.output.display(serializeFailures(writings.errors), name)
        }
      }

      if (failed > 0) {
        core.message.displayError(core.output, `Failed to download ${failed} items.`, name)
      }

      core.output.display(`Operation result: ↓ ${downloaded} | ✎ ${written} | ✘ ${failed}.`, name)
    }
  })
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
    const [err, r] = await to(core.api.pickSources(workspaceFolder, items))

    apiResponse = r

    if (err) {
      notifyFatalError(core, name, err, 'A fatal error happened while downloading the project.')
    } else if (apiResponse) {
      if (apiResponse.has_errors) {
        core.output.display(serializeFailures(apiResponse.failure), name)
        await message.displayError(core.output, `Failed to fetch ${apiResponse.success.length} items.`, name)
      }

      progress.report({ message: `XPort: Writing files` })

      writings = await write(apiResponse.success, workspaceFolder.uri)
      progress.report({ message: 'XPort: Standby' })

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

export async function publishProjectItems (
  core: Core,
  workspaceFolder: vscode.WorkspaceFolder,
  items: RequestItem[],
  range: number,
  progress: any
): Promise<void> {
  const { name } = workspaceFolder

  range = items.length > range ? range : items.length

  let previousRatio = 0
  let completeRatio = 0
  let failed = 0
  let success = 0
  let written = 0
  let limit = 0
  let offset = 0

  while (limit < items.length) {
    limit = limit > items.length ? items.length : (limit + range)
    offset = (limit - range)

    previousRatio = completeRatio
    completeRatio = Math.floor((100 * limit) / items.length)

    const selection = items.slice(offset, limit)
    const step = completeRatio - previousRatio

    progress.report({
      increment: step,
      message: `Publishing sources to ${name} (${completeRatio}% complete).`
    })

    const [err, response] = await to(core.api.publish(workspaceFolder, selection))

    if (err) {
      return notifyFatalError(core, name, err, 'A fatal error happened while publishing changes.')
    } else if (response) {
      if (response.has_errors) {
        failed += response.failure.items.length
        core.output.display(serializeFailures(response.failure), name)
      } else {
        success += response.success.length
      }

      if (response.warning) {
        message.displayInformation(response.warning, name)
      }

      const writingResults = await write(response.success, workspaceFolder.uri)

      if (writingResults.failure.items.length) {
        written += writingResults.success.length
        core.output.display(serializeFailures(writingResults.failure), name)
      }
    }
  }

  if (failed > 0) {
    core.message.displayError(core.output, `Failed to publish ${failed} items.`, name)
  }

  core.output.display(`Operation result: ↑ ${success} | ✎ ${written} | ✘ ${failed}.`, name)
  core.xrfDocumentProvider.refresh()
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

export async function getProjectXML (
  core: Core,
  workspaceFolder:
  vscode.WorkspaceFolder,
  progress: vscode.Progress<any>
): Promise<void> {
  const { name } = workspaceFolder

  progress.report({ message: `XPort: Generating the project XML from ${name}` })
  let [err, response] = await to(core.api.xml(name))

  if (err || !response || !response.xml) {
    if (!err) err = new Error('Failed to fetch the content.')
    return notifyFatalError(core, name, err, 'A error happened while downloading the project XML.')
  }

  const basingPath = workspaceFolder.uri.fsPath
  const targetPath = path.resolve(basingPath, `${name}.xml`)

  const [writeErr] = await to(writeFile(targetPath, response.xml))
  if (writeErr) return notifyFatalError(core, name, writeErr, 'A error happened while writing the XML file.')
}

export async function fixProject (core: Core, name: string, progress: any) {
  progress.report({ message: `XPort: Fixing irregularities in ${name}`})
  let [err] = await to(core.api.fixProject(name))

  if (err) {
    err = new Error('Failed to fetch the content.')
    return notifyFatalError(core, name, err, 'A error while fixing the project.')
  } else {
    core.output.display('Fixed the irregularities without problems.', name)
  }
}

