# XPort for Visual Studio Code

> __WARNING__: This is a work-in-progress. I advise you to avoid using it with production code.

An extension made for [Visual Studio Code](https://code.visualstudio.com), which
uses the [XPort API](https://github.com/rfns/xport) that is powered by [Port](https://github.com/rfns/port) and [Frontier](https://github.com/rfns/frontier).

This extension allows you to develop [InterSystems Caché®](https://www.intersystems.com/products/cache) applications in a transparent manner. Like this:

![XPort for Visual Studio Code example](https://github.com/rfns/vscode-xport/blob/master/docs/assets/xport.gif?raw=true)

## Features

* Project Explorer for managing projects stored in your running instance.
* Optimized to handle big projects (5000+ items).
* Optimized to handle binary files (like images).
* Publish and compile on save.
* Static files preview and download.
* Source code preview and download.
* Project removal.
* Remote project deletion.
* Full-length project publication to instance.
* Full-length project download from instance.
* User feedback (progress bar, error notification etc).
* Protects your sources from duplication over projects.
* Protects your sources from accidental delete if the protect is not empty.

## Requirements

* Visual Studio Code 1.31 or later.
* Caché 2017 or later.
* The [XPort API](https://github.com/rfns/xport).

## Preparing

1. Fork this repository.
2. Clone it from your fork.
2. Run `npm i` in the cloned repository folder.

Now you can:

### Build

Run the command `npx vsce package` or `npm i -g vsce && vsce package`.
This will generated a VSIX file that you can install using the command palette.

### Debug

Open the folder where your repository is located, move to the Debug tab and select run extension. A second VSCode window should appear, otherwise hit Play again.

Now you can put breakpoints and debug it normally.

## CONTRIBUTING

If you want to contribute with this project, you're encouraged to do so, however please read the [CONTRIBUTING](https://github.com/rfns/vscode-xport/blob/master/CONTRIBUTING.md) file before doing so.

## LICENSE

[MIT](https://github.com/rfns/vscode-xport/blob/master/LICENSE.md).


