import * as path from 'path'
import * as vscode from 'vscode'
import * as message from './message'
import { to } from 'await-to-js'
import { writeFile } from 'fs-extra'
import { isBinaryFile } from 'isbinaryfile'

import { Core } from '../core'
import { serializeFailures, write, chunkify, chunkifyBinary, getFileEncodingConfiguration, isRefreshable, tagWithEncoding, getCompilableDocuments } from './document'
import { serializeErrors } from './error'
import { ensureWorkspaceFolderExists, getWorkspaceConfiguration, getWorkspaceFolderByName } from './workspace'
import { ProjectExplorerItem } from '../explorer'
import { OutgoingItem, GroupedOutgoingItems, DocumentTextProxy, EncodingDirection, OperationReport, WriteOperationReport } from '../types'
import { API } from '../api'
import { paginate } from './pagination'

export function getProjectName (uri: vscode.Uri): string {
  return uri.authority
}

async function notifyFatalError (core: Core, name: string, err: Error, header: string): Promise<void> {
  core.output.display(header, name)
  core.output.display(`Details: ${err.message}`, name)
  await message.displayError(core.output, 'Unable to complete the action due to a fatal error.', name)
}

export function findRelativePaths (item: ProjectExplorerItem): string[] {
  let normalizedItems = []

  if (['package', 'folder'].includes(item.location)) {
    normalizedItems = item.items
      .filter((it: any) => it.path.startsWith(item.fullPath))
      .map((it: any) => `/${it.path}`)
  } else {
    normalizedItems = [`/${item.fullPath}`]
  }

  return normalizedItems
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

    let errors: any = []
    let currentBatch = 0

    const paths = items.map((item: vscode.Uri) => item.toString())

    await paginate(paths.length, range, async ({
      limit,
      range,
      offset,
      completion,
      step,
      stop
    }) => {
      const batchCount = Math.round(paths.length / range)
      if (token.isCancellationRequested) return stop()

      const selection = paths.slice(offset, limit)
      const [err, response] = await to(core.api.compileItems(project, selection))

      if (!response) {
        return notifyFatalError(
          core,
          err.message,
          name,
          'A fatal error happened while compiling some items from this project.'
        )
      }

      progress.report({
        increment: step,
        message: `Compiling published items (${completion}% complete).`
      })

      if (response.log.length > 0) {
        currentBatch++
        core.output.display(
          `Compiler output (batch ${currentBatch} of ${batchCount}): \n ${response.log.join('\n   ')}`,
          project
        )
      }

      if (response.error || (response.errors && response.errors.length)) {
        errors = [...errors, ...response.errors]
      }
    })

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

  return vscode.window.withProgress({
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

    const workspaceFolderPath = path.resolve(destination, name)
    const workspaceFolder = await ensureWorkspaceFolderExists(workspaceFolderPath)

    if (workspaceFolder) {
      progress.report({ message: `Listing ${name} items to fetch ...`})
      const [err, result] = await to(core.api.paths(name))

      if (!result)  {
        return notifyFatalError(core, name, err, 'A fatal error happened while fetching the project.')
      }

      const items = tagWithEncoding(result, EncodingDirection.OUTPUT)

      let pulled = 0
      let failed = 0
      let written = 0

      await paginate(items.length, size, async ({
        completion,
        step,
        stop,
        offset,
        limit
      }) => {
        if (token.isCancellationRequested) return stop()

        const selection = items.slice(offset, limit)

        progress.report({
          increment: step,
          message: `Fetching ${name} sources (${completion}% complete).`
        })

        const [err, result] = await to(
          fetchSelectedItems({ core, destination: workspaceFolderPath, items: selection })
        )

        if (!result)  {
          return notifyFatalError(core, name, err, 'A fatal error happened while fetching the project.')
        }

        pulled += result.success.length
        written += result.writings.success.length

        if (result.has_errors) {
          failed += result.failure.items.length
          core.output.display(serializeFailures(result.failure), name)
        }

        if (result.writings.failure.items.length > 0) {
          failed += result.writings.failure.items.length
          core.output.display(serializeFailures(result.writings.failure), name)
        }
      })

      if (failed > 0) {
        core.message.displayError(core.output, `Failed to fetch or write ${failed} items.`, name)
      }

      core.output.display(`Operation result: ↓ ${pulled} | ✎ ${written} | ✘ ${failed}.`, name)
    }
  })
}

export async function fetchItem ({
  core,
  destination,
  item,
}: {
  core: Core,
  destination: string,
  item: ProjectExplorerItem
}): Promise<void> {

  const path = item.fullPath
  const [err, result] = await to(fetchSelectedItems({
    core,
    destination,
    items: [{
      path,
      encoding: getFileEncodingConfiguration(vscode.Uri.file(path), EncodingDirection.OUTPUT)
    }]
  }))

  if (!result)  {
    return notifyFatalError(core, name, err, 'A fatal error happened while fetching the item.')
  }

  if (result.has_errors) {
    core.output.display(serializeFailures(result.failure), name)
    await message.displayError(core.output, `Failed to fetch ${result.success.length} items.`, name)
  }

  if (result.writings.failure.items.length > 0) {
    core.output.display(serializeFailures(result.writings.failure), name)
  }

  core.output.display(`Operation result: ↓ ${result.success.length} | ✎ ${result.writings.success.length} | ✘ ${result.failure.items.length}.`, name)

}

async function fetchSelectedItems ({
  core,
  destination,
  items,
}: {
  core: Core,
  destination: string,
  items: { path: string, encoding: string }[]
}): Promise<OperationReport & { writings: WriteOperationReport } | undefined> {
  const workspaceFolder = await ensureWorkspaceFolderExists(destination)
  if (!workspaceFolder) return

  const name = workspaceFolder.name
  const [err, apiResponse] = await to(core.api.pickSources(workspaceFolder, items))

  if (err) throw err
  if (!apiResponse) throw new Error(`Failed to fetch the items from ${name}.`)

  const writings = await write(apiResponse.success, workspaceFolder.uri)

  return { ...apiResponse, writings }
}

export async function publishProjectItems ({
  core,
  workspaceFolder,
  items,
  range,
  progress,
  token,
  flags,
  compile
}: {
  core: Core,
  workspaceFolder: vscode.WorkspaceFolder,
  items: OutgoingItem[],
  range: number,
  progress: any,
  token: vscode.CancellationToken,
  flags?: string,
  compile?: boolean
}): Promise<vscode.Uri[]> {
  const { name } = workspaceFolder

  let failed: number = 0
  let success: number = 0
  let written: number = 0

  let compilables: vscode.Uri[] = []

  await paginate(items.length, range, async ({
    step,
    completion,
    offset,
    limit,
    stop
  }) => {
    if (token.isCancellationRequested) return stop()

    const selection = items.slice(offset, limit)
    const [err, response] = await to(core.api.publish(workspaceFolder, { items: selection, flags, compile }))

    progress.report({
      increment: step,
      message: `Publishing to ${name} (${completion}% complete).`
    })

    if (err) return notifyFatalError(core, name, err, 'A fatal error happened while publishing changes.')

    if (response) {
      if (response.has_errors) {
        failed += response.failure.items.length
        core.output.display(serializeFailures(response.failure), name)
      } else {
        success += response.success.length
        compilables = [...compilables, ...response.success.map(item => vscode.Uri.file(item.path))]
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
  })

  if (failed > 0) {
    core.message.displayError(core.output, `Failed to publish ${failed} items.`, name)
  }

  core.output.display(`Operation result: ↑ ${success} | ✎ ${written} | ✘ ${failed}.`, name)
  return getCompilableDocuments(compilables)
}

export function groupDocumentsByProject (
  docs: (vscode.TextDocument | DocumentTextProxy)[],
  token: vscode.CancellationToken
): Promise<GroupedOutgoingItems> {
  return docs.reduce(async (promises: any, doc: any) => {
    const groups = await promises
    if (token.isCancellationRequested) return groups
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri)

    if (workspaceFolder)  {
      const content = doc.getText()
      const binary = doc.binary || (await isBinaryFile(doc.uri.fsPath))
      const current = groups[workspaceFolder.name] = groups[workspaceFolder.name] || {}

      const encoding = {
        in: binary ? 'RAW' : getFileEncodingConfiguration(doc.uri, EncodingDirection.INPUT),
        out: binary ? 'RAW' : getFileEncodingConfiguration(doc.uri, EncodingDirection.OUTPUT)
      }

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

  progress.report({ message: `Generating the project XML from ${name}` })
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
    return notifyFatalError(core, name, err, 'A error while fixing the project.')
  } else {
    core.output.display(`The project ${name} has been repaired with success.`, name)
  }
}

export async function deleteItems ({
  core,
  projectName,
  progress,
  items,
  token
} : {
  core: Core,
  projectName: string,
  items: string[],
  progress: any
  token: vscode.CancellationToken,
}) {
  let deleted: number = 0
  let failed: number = 0

  await paginate(items.length, 100, async ({
    completion,
    offset,
    limit,
    stop,
    step
  }) => {
    if (token.isCancellationRequested) return stop()

    const selection = items.slice(offset, limit)
    const response = await core.api.delete(projectName, selection)

    progress.report({
      message: `Deleting ${items.length} items from ${projectName} (${completion}% complete).`,
      increment: step
    })

    deleted += response.success.length
    failed  += response.failure.items.length

    if (response.has_errors) {
      core.output.display(serializeFailures(response.failure), projectName)
    }
  })

  if (failed > 0) {
    await message.displayError(core.output, 'Failed to delete one or more items.', projectName)
  }

  if (deleted > 0) {
    message.displayWarning(`${deleted} items have been deleted from the server.`, projectName)
  }

  core.output.display(`Operation result: ✓ ${deleted} | ✘ ${failed}.`, projectName)
  core.projectExplorerProvider.refresh()
}

export async function removeItems ({
  core,
  projectName,
  progress,
  items,
  token
} : {
  core: Core,
  projectName: string,
  items: string[],
  progress: any
  token: vscode.CancellationToken,
}) {
  let removed: number = 0
  let failed: number = 0

  await paginate(items.length, 100, async ({
    completion,
    offset,
    limit,
    stop,
    step
  }) => {
    if (token.isCancellationRequested) return stop()

    const selection = items.slice(offset, limit)
    const response = await core.api.delete(projectName, selection)

    progress.report({
      message: `Removing ${items.length} items from ${projectName} (${completion}% complete).`,
      increment: step
    })

    removed += response.success.length
    failed  += response.failure.items.length

    if (response.has_errors) {
      core.output.display(serializeFailures(response.failure), projectName)
    }
  })

  if (failed > 0) {
    await message.displayError(core.output, 'Failed to delete one or more items.', projectName)
  }

  if (removed > 0) {
    message.displayWarning(`${removed} items have been removed from the server.`, projectName)
  }

  core.output.display(`Operation result: ✓ ${removed} | ✘ ${failed}.`, projectName)
  core.projectExplorerProvider.refresh()
}

