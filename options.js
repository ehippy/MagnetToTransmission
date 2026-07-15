const DEFAULT_SETTINGS = {
  host: "http://localhost:9091",
  rpcPath: "/transmission/rpc",
  username: "",
  password: "",
};

const $host = document.getElementById("host");
const $rpcPath = document.getElementById("rpcPath");
const $username = document.getElementById("username");
const $password = document.getElementById("password");
const $status = document.getElementById("status");

// ── Load saved settings ──

chrome.storage.sync.get(DEFAULT_SETTINGS, (s) => {
  $host.value = s.host;
  $rpcPath.value = s.rpcPath;
  $username.value = s.username;
  $password.value = s.password;
});

// ── Save ──

document.getElementById("save").addEventListener("click", () => {
  const settings = {
    host: $host.value.trim() || DEFAULT_SETTINGS.host,
    rpcPath: $rpcPath.value.trim() || DEFAULT_SETTINGS.rpcPath,
    username: $username.value.trim(),
    password: $password.value,
  };
  chrome.storage.sync.set(settings, () => {
    showStatus("Settings saved.", "success");
  });
});

// ── Test Connection ──

document.getElementById("test").addEventListener("click", async () => {
  showStatus("Connecting…", "");

  const host = ($host.value.trim() || DEFAULT_SETTINGS.host).replace(/\/+$/, "");
  const rpcPath = $rpcPath.value.trim() || DEFAULT_SETTINGS.rpcPath;
  const url = host + rpcPath;
  const username = $username.value.trim();
  const password = $password.value;

  try {
    const result = await rpcCall(url, username, password, "session-get", {});
    if (result.result === "success") {
      const ver = result.arguments?.version || "unknown";
      showStatus(`Connected! Transmission ${ver}`, "success");
    } else {
      showStatus(`Unexpected response: ${result.result}`, "error");
    }
  } catch (err) {
    showStatus(`Connection failed: ${err.message}`, "error");
  }
});

async function rpcCall(url, username, password, method, args, sessionId = null) {
  const headers = { "Content-Type": "application/json" };
  if (sessionId) headers["X-Transmission-Session-Id"] = sessionId;
  if (username) headers["Authorization"] = "Basic " + btoa(username + ":" + password);

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ method, arguments: args }),
  });

  if (resp.status === 409) {
    const newId = resp.headers.get("X-Transmission-Session-Id");
    if (!newId) throw new Error("409 without session-id header");
    return rpcCall(url, username, password, method, args, newId);
  }

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

function showStatus(msg, type) {
  $status.textContent = msg;
  $status.className = type; // "success", "error", or ""
}

// ── Download Directories ──

const $dirList = document.getElementById("dir-list");
const $newDir = document.getElementById("new-dir");
const $defaultDir = document.getElementById("default-dir");

function renderDirs(dirs) {
  $dirList.innerHTML = "";
  dirs.forEach((dir, i) => {
    const li = document.createElement("li");
    li.className = "dir-item";
    li.innerHTML = `<span>${escHtml(dir)}</span><button data-idx="${i}" title="Remove">&times;</button>`;
    $dirList.appendChild(li);
  });
}

function renderDefaultDirOptions(dirs, selected) {
  const options = ['<option value="">Transmission default (no directory set)</option>'].concat(
    dirs.map((d) => `<option value="${escHtml(d)}">${escHtml(d)}</option>`)
  );
  $defaultDir.innerHTML = options.join("");
  $defaultDir.value = dirs.includes(selected) ? selected : "";
}

function escHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

chrome.storage.sync.get({ downloadDirs: [], defaultDownloadDir: "" }, (s) => {
  renderDirs(s.downloadDirs);
  renderDefaultDirOptions(s.downloadDirs, s.defaultDownloadDir);
});

document.getElementById("add-dir").addEventListener("click", () => {
  const val = $newDir.value.trim();
  if (!val) return;
  chrome.storage.sync.get({ downloadDirs: [], defaultDownloadDir: "" }, (s) => {
    const dirs = s.downloadDirs;
    if (!dirs.includes(val)) dirs.push(val);
    chrome.storage.sync.set({ downloadDirs: dirs }, () => {
      renderDirs(dirs);
      renderDefaultDirOptions(dirs, s.defaultDownloadDir);
      $newDir.value = "";
      showStatus("Directory added. Reload extension for menu update.", "success");
    });
  });
});

$newDir.addEventListener("keydown", (e) => { if (e.key === "Enter") document.getElementById("add-dir").click(); });

$dirList.addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;
  const idx = parseInt(e.target.dataset.idx, 10);
  chrome.storage.sync.get({ downloadDirs: [], defaultDownloadDir: "" }, (s) => {
    const dirs = s.downloadDirs;
    const [removed] = dirs.splice(idx, 1);
    const defaultDownloadDir = removed === s.defaultDownloadDir ? "" : s.defaultDownloadDir;
    chrome.storage.sync.set({ downloadDirs: dirs, defaultDownloadDir }, () => {
      renderDirs(dirs);
      renderDefaultDirOptions(dirs, defaultDownloadDir);
      showStatus("Directory removed. Reload extension for menu update.", "success");
    });
  });
});

$defaultDir.addEventListener("change", () => {
  chrome.storage.sync.set({ defaultDownloadDir: $defaultDir.value }, () => {
    showStatus("Default destination saved.", "success");
  });
});

// ── Inline page icon toggle ──

const $showInlineIcons = document.getElementById("show-inline-icons");

chrome.storage.sync.get({ showInlineIcons: true }, (s) => {
  $showInlineIcons.checked = s.showInlineIcons;
});

$showInlineIcons.addEventListener("change", () => {
  chrome.storage.sync.set({ showInlineIcons: $showInlineIcons.checked });
});
