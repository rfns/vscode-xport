import * as path from 'path'
import * as fs from 'fs'
import * as vscode from 'vscode'
import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import * as output from '../shared/output'
import { Configuration } from '../types'
import { API } from '../api'
import { setupRequestOptions } from './requestOptions'
import { getWorkspaceConfiguration } from '../shared/workspace'

const expect = chai.expect

chai.use(chaiAsPromised)
chai.should()

describe('XPort API', () => {
  let options: Configuration
  let workspaceFolder: vscode.WorkspaceFolder
  let api: API
  let requestOptions: any

  before(async () => {
    let disposables: vscode.Disposable[] = []
    requestOptions = await setupRequestOptions()
    options = requestOptions.options
    workspaceFolder = requestOptions.workspaceFolder
    api = new API(options, output)
  })

  context('GET /api/xport/ping', () => {
    it('should ping the server', async () => {
      const response = await api.ping()
      expect(response).to.be.an('object').and.to.deep.equals({ result: 'pong' })
    })
  })

  context(`GET /api/xport/namespace/:namespace/projects/list`, () => {
    it('should return a list of projects', async () => {
      const result = await api.projects()
      expect(result).to.be.an('object').and.to.have.property('projects').which.have.an('array')
    })
  })

  context(`POST /api/xport/:namespace/projects/:project`, () => {
    it('shoulds return a list of items from the project', async () => {
      const result = await api.sources(workspaceFolder, ['Whatever.Testing.cls'])
    })
  })

  context('POST /api/xport/DEV/:namespace/projects/:project/items/publish', () => {
    it('publish items', async () => {
      const configuration = getWorkspaceConfiguration()
      if (!configuration) return null

      const result = await api.publish(workspaceFolder, [{
        path: '...',
        content: fs.readFileSync(path.resolve(workspaceFolder.uri.fsPath, 'src/test/fixtures/class.cls')).toString('utf-8')
      }, {
        path: '..',
        content: fs.readFileSync(path.resolve(workspaceFolder.uri.fsPath, 'src/test/fixtures/include.inc')).toString('utf-8')
      }])
    })
  })
})
