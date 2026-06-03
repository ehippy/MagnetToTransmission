# Magnet to Transmission

A Chrome extension that lets you right-click magnet links or `.torrent` file URLs and send them directly to your Transmission server.

## Features

- **Right-click context menu** on any magnet link or `.torrent` file URL → sends it to Transmission
- **Popup** shows connection status, active/paused torrent counts, and a quick-add input
- **Configurable** server URL, RPC path, and authentication credentials
- **Test connection** button in settings to verify your setup
- **Download directory selection** via right-click submenu

## Installation

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked** and select this folder
4. Click the extension icon → **Settings** to configure your Transmission server

## Configuration

Open the extension options (right-click icon → Options, or click Settings in the popup):

| Field      | Default                  | Description                          |
|------------|--------------------------|--------------------------------------|
| Server URL | `http://localhost:9091`  | Transmission Web UI address          |
| RPC Path   | `/transmission/rpc`      | RPC endpoint path                    |
| Username   | *(empty)*                | Basic auth username (if enabled)     |
| Password   | *(empty)*                | Basic auth password (if enabled)     |

## Usage

- **Right-click** any magnet link or `.torrent` file URL on a page → **Send to Transmission** → choose default or configured directory
- Or click the extension icon and **paste a magnet link** into the input field

## Transmission Setup

Make sure Transmission's RPC is enabled. In Transmission settings:

- Enable **Web client** / **Remote access**
- If accessing from a different machine, add your IP to the whitelist or disable the whitelist
- Note the port (default `9091`) and whether authentication is required

## Permissions

- `contextMenus` – to add the right-click menu item
- `storage` – to save your server settings
- `host_permissions` – to make RPC requests to your Transmission server
