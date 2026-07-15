# Magnet to Transmission

A Chrome extension that lets you right-click magnet links and send them directly to your Transmission server.

## Features

- **Right-click context menu** on any magnet link → sends it to Transmission, with a submenu to pick a specific download directory
- **Inline one-click icon** overlaid on magnet links on every page → sends straight to your default directory, no right-click needed
- **Popup** shows connection status, active/paused torrent counts, and a quick-add input
- **Configurable** server URL, RPC path, and authentication credentials
- **Test connection** button in settings to verify your setup

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

- **Click the small badge** that appears over any magnet link on a page → sends it to your configured default destination in one click
- **Right-click** any magnet link → **Send to Transmission** → pick a directory (or the default)
- Or click the extension icon and **paste a magnet link** into the input field

Set your preferred default in Settings under **Default Destination** — it's used by both the one-click badge and the right-click menu's "Default directory" entry. Leave it unset to fall back to whatever download directory Transmission itself is configured with.

The inline badge can be turned off in Settings under **Inline Page Icons** if you'd rather stick to right-click only.

## Transmission Setup

Make sure Transmission's RPC is enabled. In Transmission settings:

- Enable **Web client** / **Remote access**
- If accessing from a different machine, add your IP to the whitelist or disable the whitelist
- Note the port (default `9091`) and whether authentication is required

## Permissions

- `contextMenus` – to add the right-click menu item
- `storage` – to save your server settings
- `host_permissions` – to make RPC requests to your Transmission server
- Content script on `<all_urls>` – to detect magnet links and draw the inline send icon on any page you visit (it only reads `href` attributes of `magnet:` links and does not access page content otherwise); disable it anytime in Settings
