// ── Transmission RPC helpers ──

const DEFAULT_SETTINGS = {
  host: "http://localhost:9091",
  rpcPath: "/transmission/rpc",
  username: "",
  password: "",
};

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, resolve);
  });
}

/**
 * Make an RPC call to Transmission.
 * Handles the CSRF 409 → retry flow automatically.
 */
async function transmissionRPC(method, args, sessionId = null) {
  const settings = await getSettings();
  const url = settings.host.replace(/\/+$/, "") + settings.rpcPath;

  const headers = {
    "Content-Type": "application/json",
  };
  if (sessionId) {
    headers["X-Transmission-Session-Id"] = sessionId;
  }
  if (settings.username) {
    headers["Authorization"] =
      "Basic " + btoa(settings.username + ":" + settings.password);
  }

  const body = JSON.stringify({ method, arguments: args });

  const resp = await fetch(url, { method: "POST", headers, body });

  // Transmission returns 409 with a new session-id on first request
  if (resp.status === 409) {
    const newSessionId = resp.headers.get("X-Transmission-Session-Id");
    if (!newSessionId) throw new Error("409 but no session-id header");
    return transmissionRPC(method, args, newSessionId);
  }

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Transmission returned ${resp.status}: ${text}`);
  }

  return resp.json();
}

// ── Context menu setup ──

const MENU_PREFIX = "send-magnet-dir-";

async function buildContextMenus() {
  await chrome.contextMenus.removeAll();

  // Parent menu
  chrome.contextMenus.create({
    id: "send-magnet-parent",
    title: "Send to Transmission",
    contexts: ["link"],
  });

  // Default (no specific directory)
  chrome.contextMenus.create({
    id: "send-magnet-default",
    parentId: "send-magnet-parent",
    title: "Default directory",
    contexts: ["link"],
  });

  // Configured directories
  const { downloadDirs = [] } = await chrome.storage.sync.get({ downloadDirs: [] });
  if (downloadDirs.length > 0) {
    chrome.contextMenus.create({
      id: "send-magnet-separator",
      parentId: "send-magnet-parent",
      type: "separator",
      contexts: ["link"],
    });
    downloadDirs.forEach((dir, i) => {
      chrome.contextMenus.create({
        id: MENU_PREFIX + i,
        parentId: "send-magnet-parent",
        title: dir,
        contexts: ["link"],
      });
    });
  }
}

chrome.runtime.onInstalled.addListener(() => buildContextMenus());
chrome.runtime.onStartup.addListener(() => buildContextMenus());

// Rebuild menus when storage changes (dirs added/removed)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.downloadDirs) buildContextMenus();
});

// ── Handle context menu click ──

chrome.contextMenus.onClicked.addListener(async (info) => {
  const id = info.menuItemId;
  if (id !== "send-magnet-default" && !id.startsWith(MENU_PREFIX)) return;

  const linkUrl = info.linkUrl;
  if (!linkUrl) {
    notify("Error", "No link URL found.");
    return;
  }

  // Validate: must be a magnet link or a .torrent file URL
  if (!linkUrl.startsWith("magnet:") && !linkUrl.endsWith(".torrent")) {
    notify("Error", "Not a valid magnet link or .torrent file.");
    return;
  }

  // Determine download directory
  let downloadDir = null;
  if (id.startsWith(MENU_PREFIX)) {
    const idx = parseInt(id.slice(MENU_PREFIX.length), 10);
    const { downloadDirs = [] } = await chrome.storage.sync.get({ downloadDirs: [] });
    downloadDir = downloadDirs[idx] || null;
  }

  const rpcArgs = { filename: linkUrl };
  if (downloadDir) rpcArgs["download-dir"] = downloadDir;

  try {
    const result = await transmissionRPC("torrent-add", rpcArgs);

    if (result.result === "success") {
      const added =
        result.arguments["torrent-added"] ||
        result.arguments["torrent-duplicate"];
      const name = added ? added.name : "torrent";
      const isDuplicate = !!result.arguments["torrent-duplicate"];
      const dest = downloadDir ? ` → ${downloadDir}` : "";
      const source = linkUrl.startsWith("magnet:") ? "magnet link" : ".torrent file";
      notify(
        isDuplicate ? "Duplicate" : "Added",
        isDuplicate
          ? `"${name}" already exists.`
          : `"${name}" (${source}) sent to Transmission${dest}.`
      );
    } else {
      notify("Error", `Transmission: ${result.result}`);
    }
  } catch (err) {
    notify("Error", err.message);
  }
});

// ── Badge / notification helper ──

function notify(title, message) {
  // Badge on icon
  const color = title === "Error" ? "#e74c3c" : title === "Duplicate" ? "#f39c12" : "#2ecc71";
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text: title === "Error" ? "!" : "✓" });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);

  // Desktop notification
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: `Magnet to Transmission – ${title}`,
    message,
  });
}
