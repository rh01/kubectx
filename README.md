# Kubernetes Context Switcher for Raycast

## Background

This Raycast extension provides a convenient way to manage Kubernetes contexts directly from your Raycast launcher. It allows users to switch between different Kubernetes contexts, import new configurations, delete existing contexts, and backup their kubeconfig file.

## Features

- List all available Kubernetes contexts
- Switch between contexts with a single click
- Import new kubeconfig content
- Delete contexts (including associated clusters and users)
- Backup the current kubeconfig file

## Prerequisites

- [Raycast](https://www.raycast.com/) installed on your machine
- `kubectl` command-line tool installed and accessible from the terminal
- Existing Kubernetes configurations in `~/.kube/config`

## Installation

1. Clone this repository or download the source code.
2. Open a terminal and navigate to the project directory.
3. Run `npm install` or `pnpm install` to install the dependencies.
4. Run `npm run build` or `pnpm run build` to build the extension.
5. In Raycast, go to Extensions > Add Extension > Add Script Command.
6. Choose the built script from the project's `dist` directory.

## Usage

1. Open Raycast and type "kube" or "kubernetes" to find the extension.
2. Select the extension to see a list of your Kubernetes contexts.

### Switching Contexts

- Select a context from the list and choose "Switch Context" from the action menu.

### Importing New Kubeconfig

- Select "Import Kubeconfig" from the list or action menu.
- Paste your kubeconfig content into the text area.
- Optionally, provide a new context name prefix.
- Click "Import" to add the new configuration.

### Deleting a Context

- Select a context and choose "Delete Context" from the action menu.
- Confirm the deletion when prompted.

### Backing Up Kubeconfig

- Select "Backup Kubeconfig" from any context's action menu or the main list.
- The backup will be saved with a timestamp in your `~/.kube/` directory.

## Troubleshooting

If you encounter any issues:

1. Ensure `kubectl` is properly installed and configured.
2. Check that your `~/.kube/config` file is valid and readable.
3. Verify that you have the necessary permissions to read and write to the kubeconfig file.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)