import * as path from 'path'
import * as vscode from 'vscode'
import * as message from './message'
import { to } from 'await-to-js'
import { writeFile } from 'fs-extra'
import { isBinaryFile } from 'isbinaryfile'

import { Core } from '../core'
import { serializeFailures, write, chunkify, chunkifyBinary, getFileEncodingConfiguration, isRefreshable } from './document'
import { serializeErrors } from './error'
import { ensureWorkspaceFolderExists, getWorkspaceConfiguration, getWorkspaceFolderByName } from './workspace'
import { ProjectExplorerItem } from '../explorer/projectExplorer'
import { RequestItem, GroupedRequestItems, SimplifiedDocument, EncodingDirection } from '../types'
import { API } from '../api'

export function getProjectName (uri: vscode.Uri): string {
  return uri.authority
}

async function notifyFatalError (core: Core, name: string, err: Error, header: string): Promise<void> {
  core.output.display(header, name)
  core.output.display(`Details: ${err.message}`, name)
  await message.displayError(core.output, 'Unable to complete the action due to a fatal error.', name)
}

export async function compileItems ({
  core,
  project,
  items,
  range = 20,
  progress,
  token
}: {
  core: Core,
  project: string,
  items: vscode.Uri[],
  range: number,
  progress?: any,
  token?: vscode.CancellationToken
}) {
  const executeCompileAction = async (progress: any, token: vscode.CancellationToken) => {
    progress.report({ message: 'Compiling published items. Please wait ...', step: 0 })

    let previousRatio = 0
    let completeRatio = 0
    let limit = 0
    let offset = 0
    let errors: any = []
    let currentBatch = 0

    const paths = items.map((item: vscode.Uri) => item.toString())
    const calculatedRange = paths.length > range ? range : paths.length
    const batchCount = Math.round(paths.length / calculatedRange)

    while (limit < paths.length) {
      if (token.isCancellationRequested) return

      limit = limit > paths.length || (limit + calculatedRange) > paths.length
        ? paths.length
        : (limit + calculatedRange)

      previousRatio = completeRatio
      completeRatio = Math.floor((100 * limit) / paths.length)

      const selection = paths.slice(offset, limit)
      const step = completeRatio - previousRatio

      offset = offset + calculatedRange

      const [err, response] = await to(core.api.compileItems(project, selection))

      progress.report({
        increment: step,
        message: `Compiling published items (${completeRatio}% complete).`
      })

      if (err) {
        return notifyFatalError(
          core,
          err.message,
          name,
          'A fatal error happened while compiling some items from this project.'
        )
      }

      if (response.log.length > 0) {
        currentBatch++
        core.output.display(`Compiler output (batch ${currentBatch} of ${batchCount}): \n ${response.log.join('\n   ')}`, project)
      }

      if (response.error || (response.errors && response.errors.length)) {
        errors = [...errors, ...response.errors]
      }
    }

    if (errors.length) {
      message.displayError(core.output, 'Some items were not compiled due to errors.', project)
      core.output.display(serializeErrors({ errors }, `Compiled with errors.\n`), project)
    } else {
      core.output.display('Compiled without errors.', project)
    }
  }


  if (progress && token) {
    return executeCompileAction(progress, token)
  }

  return progress.withProgress({
    location: vscode.ProgressLocation.Notification,
    cancellable: true
  }, executeCompileAction)
}

export async function compileProject (core: Core, item: ProjectExplorerItem, progress: any) {
  progress.report({ message: `Compiling the project ${item.project}. Please wait ...` })

  const [err, response] = await to(core.api.compile(item.project))

  if (err) {
    notifyFatalError(
      core,
      err.message,
      name,
      'A fatal error happened while compiling the project.'
    )
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

export async function fetchWholeProject ({
  core,
  name,
  destination,
  page = 1,
  size = 20
}: {
  core: Core,
  name: string,
  destination: string,
  page?: number
  size?: number
}) {
  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    cancellable: true
  }, async (progress: any, token: vscode.CancellationToken) => {
    if (token.isCancellationRequested) return

    progress.report({ messsage: `Preparing to fetch sources from ${name} ...` })

    const workspaceFolderPath = path.resolve(destination, name)
    const workspaceFolder = await ensureWorkspaceFolderExists(workspaceFolderPath)

    if (workspaceFolder) {
      progress.report({ message: 'Counting items ...' })
      const [, result] = await to(core.api.count(workspaceFolder))
      let more = true

      let pulled = 0
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
          message: `Fetching ${name} sources (${completeRatio}% complete).`
        })

        const [err, sourceList] = await to(core.api.listSources(workspaceFolder, { page, size }))

        if (err)  {
          return notifyFatalError(core, name, err, 'A fatal error happened while downloading the project.')
        }

        last = sourceList.success[sourceList.success.length - 1]
        pulled += sourceList.success.length
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
        core.message.displayError(core.output, `Failed to fetch ${failed} items.`, name)
      }

      core.output.display(`Operation result: ↓ ${pulled} | ✎ ${written} | ✘ ${failed}.`, name)
    }
  })
}

export async function fetchSelectedItems ({
  core,
  destination,
  items
}: {
  core: Core,
  destination: string,
  items: { path: string, encoding: string }[]
}): Promise<void> {
  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification
  }, async (progress: any) => {
    const workspaceFolder = await ensureWorkspaceFolderExists(destination)

    let apiResponse: any
    let writings: any

    if (workspaceFolder) {
      const name = workspaceFolder.name

      progress.report({ message: `Pulling items from ${name}` })
      const [err, r] = await to(core.api.pickSources(workspaceFolder, items))

      apiResponse = r

      if (err) {
        notifyFatalError(core, name, err, 'A fatal error happened while fetch some items from the project.')
      } else if (apiResponse) {
        if (apiResponse.has_errors) {
          core.output.display(serializeFailures(apiResponse.failure), name)
          await message.displayError(core.output, `Failed to fetch ${apiResponse.success.length} items.`, name)
        }

        progress.report({ message: `Writing files` })

        writings = await write(apiResponse.success, workspaceFolder.uri)

        if (writings.failure.items.length > 0) {
          core.output.display(serializeFailures(writings.errors), name)
          await message.displayError(core.output, `Failed to fetch ${writings.failure.items.length} items.`, name)
        }
        core.output.display(`Operation result: ↓ ${apiResponse.success.length} | ✎ ${writings.success.length} | ✘ ${apiResponse.failure.items.length}.`, name)
      }
    }
  })
}

export async function publishProjectItems ({
  core,
  workspaceFolder,
  items,
  range,
  progress,
  token,
  flags
}: {
  core: Core,
  workspaceFolder: vscode.WorkspaceFolder,
  items: RequestItem[],
  range: number,
  progress: any,
  token: vscode.CancellationToken,
  flags?: string
}): Promise<void> {
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
    if (token.isCancellationRequested) return

    limit = limit > items.length || (limit + range) > items.length
      ? items.length
      : (limit + range)

    previousRatio = completeRatio
    completeRatio = Math.floor((100 * limit) / items.length)

    const selection = items.slice(offset, limit)
    const step = completeRatio - previousRatio

    offset = offset + range

    const [err, response] = await to(core.api.publish(workspaceFolder, selection, flags))

    progress.report({
      increment: step,
      message: `Publishing sources to ${name} (${completeRatio}% complete).`
    })

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
      written += writingResults.success.length

      if (writingResults.failure.items.length) {
        core.output.display(serializeFailures(writingResults.failure), name)
      }
    }
  }

  if (failed > 0) {
    core.message.displayError(core.output, `Failed to publish ${failed} items.`, name)
  }

  core.output.display(`Operation result: ↑ ${success} | ✎ ${written} | ✘ ${failed}.`, name)
}

export function groupDocumentsByProject (docs: (vscode.TextDocument | SimplifiedDocument)[], token: vscode.CancellationToken): Promise<GroupedRequestItems> {
  return docs.reduce(async (promises: any, doc: any) => {
    const groups = await promises
    if (token.isCancellationRequested) return groups
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri)

    if (workspaceFolder)  {
      const content = doc.getText()
      const binary = await isBinaryFile(doc.uri.fsPath)
      const current = groups[workspaceFolder.name] = groups[workspaceFolder.name] || {}

      const encoding = !binary ? {
        in: getFileEncodingConfiguration(doc.uri, EncodingDirection.INPUT),
        out: getFileEncodingConfiguration(doc.uri, EncodingDirection.OUTPUT)
      } : false

      current.workspaceFolder = workspaceFolder
      current.items = (current.items || []).concat([{
        binary,
        path: doc.uri.fsPath,
        encoding,
        refresh: isRefreshable(doc.uri),
        content: !binary
          ? chunkify(content, 12000)
          : chunkifyBinary(doc, 12000)
      }])
    }
    return groups
  }, Promise.resolve({}))
}

export async function getProjectXML (
  core: Core,
  workspaceFolder: vscode.WorkspaceFolder,
  progress: vscode.Progress<any>
): Promise<void> {
  const { name } = workspaceFolder

  progress.report({ message: `XPort: Generating the project XML from ${name}` })
  let [err, response] = await to(core.api.xml(name))

  if (err || !response || !response.xml) {
    if (!err) err = new Error('Failed to fetch the content.')
    return notifyFatalError(core, name, err, 'A error happened while pulling the project XML.')
  }

  const basingPath = workspaceFolder.uri.fsPath
  const targetPath = path.resolve(basingPath, `${name}.xml`)

  const [writeErr] = await to(writeFile(targetPath, response.xml))
  if (writeErr) return notifyFatalError(core, name, writeErr, 'A error happened while writing the XML file.')
}

export async function repairProject (core: Core, name: string, progress: any) {
  const workspaceFolder = getWorkspaceFolderByName(name)
  if (!workspaceFolder) return

  progress.report({ message: `XPort: Reparing ${name} ...`})

  const configuration = getWorkspaceConfiguration(workspaceFolder)
  const api = new API(configuration, core.output)

  let [err] = await to(api.repairProject(name))

  if (err) {
    err = new Error(`Failed to repair the project '${name}'.`)
    return notifyFatalError(core, name, err, 'A error while fixing the project.')
  } else {
    core.output.display(`The project '${name}' has been repaired with success.`, name)
  }
}

