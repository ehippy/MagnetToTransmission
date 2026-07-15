const DEFAULT_SETTINGS = {
  host: "http://localhost:9091",
  rpcPath: "/transmission/rpc",
  username: "",
  password: "",
};

const $dot = document.getElementById("status-dot");
const $statusText = document.getElementById("status-text");
const $openWebui = document.getElementById("open-webui");
const $magnet = document.getElementById("magnet");
const $addBtn = document.getElementById("add-btn");
const $addStatus = document.getElementById("add-status");

// ── RPC helper (same 409 retry logic) ──

async function rpc(method, args, sessionId = null) {
  const s = await new Promise((r) => chrome.storage.sync.get(DEFAULT_SETTINGS, r));
  const url = s.host.replace(/\/+$/, "") + s.rpcPath;

  const headers = { "Content-Type": "application/json" };
  if (sessionId) headers["X-Transmission-Session-Id"] = sessionId;
  if (s.username) headers["Authorization"] = "Basic " + btoa(s.username + ":" + s.password);

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ method, arguments: args }),
  });

  if (resp.status === 409) {
    const id = resp.headers.get("X-Transmission-Session-Id");
    if (!id) throw new Error("409 without session header");
    return rpc(method, args, id);
  }
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

// ── Fetch session stats on popup open ──

(async () => {
  try {
    const res = await rpc("torrent-get", { fields: ["status"] });
    if (res.result !== "success") throw new Error(res.result);

    const torrents = res.arguments.torrents || [];
    const active = torrents.filter((t) => t.status !== 0).length;
    const paused = torrents.filter((t) => t.status === 0).length;

    $dot.className = "dot ok";
    $statusText.textContent = `Connected – ${active} active, ${paused} paused`;

    // Show link to Transmission web UI
    const s = await new Promise((r) => chrome.storage.sync.get(DEFAULT_SETTINGS, r));
    const webUrl = s.host.replace(/\/+$/, "");
    $openWebui.href = webUrl;
    $openWebui.style.display = "";
    $openWebui.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: webUrl });
    });
  } catch (err) {
    $dot.className = "dot err";
    $statusText.textContent = "Not connected";
  }
})();

// ── Add magnet from input ──

$addBtn.addEventListener("click", async () => {
  const link = $magnet.value.trim();
  if (!link) return;

  $addStatus.textContent = "Sending…";
  $addStatus.className = "";

  try {
    const res = await rpc("torrent-add", { filename: link });
    if (res.result === "success") {
      const added = res.arguments["torrent-added"] || res.arguments["torrent-duplicate"];
      const name = added ? added.name : "torrent";
      const dup = !!res.arguments["torrent-duplicate"];
      $addStatus.textContent = dup ? `"${name}" already exists.` : `"${name}" added!`;
      $addStatus.className = dup ? "error" : "success";
      $magnet.value = "";
    } else {
      throw new Error(res.result);
    }
  } catch (err) {
    $addStatus.textContent = err.message;
    $addStatus.className = "error";
  }
});

$magnet.addEventListener("keydown", (e) => {
  if (e.key === "Enter") $addBtn.click();
});

// ── Download targets list ──

const $targets = document.getElementById("targets");

chrome.storage.sync.get({ downloadDirs: [], defaultDownloadDir: "" }, (s) => {
  const dirs = s.downloadDirs;
  if (dirs.length === 0) {
    $targets.innerHTML = '<div class="target-empty">None configured – add in Settings</div>';
  } else {
    $targets.innerHTML = dirs
      .map((d) => {
        const isDefault = d === s.defaultDownloadDir;
        return `<div class="target-item"><span class="target-dot"></span>${escHtml(d)}${isDefault ? '<span class="target-default"> · default</span>' : ""}</div>`;
      })
      .join("");
  }
});

function escHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Open options ──

document.getElementById("open-options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
