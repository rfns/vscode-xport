import * as vscode from 'vscode'

/// TODO: Use XRF protocol along with /references api to search for definition.
export class XRFDocumentDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Location | vscode.Location[] | vscode.LocationLink[]> {
    const { text } = document.lineAt(position.line)
  }

}
