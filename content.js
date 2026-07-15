// ── Inline "send to Transmission" overlay icons ──
//
// Icons are appended directly to <body> and positioned with getBoundingClientRect(),
// rather than wrapped next to the link in the DOM. Magnet links are frequently styled
// in ways where the <a>'s own box doesn't match the visible button (stretched "card"
// links, icon-only anchors inside a larger styled label, etc.) — tracking the real
// rendered rect is the only way to reliably land the badge on the visible corner.

(() => {
  const PROCESSED_ATTR = "data-m2t-processed";
  const ICON_CLASS = "m2t-send-icon";
  const ICON_SIZE = 18;
  const ICON_URL = chrome.runtime.getURL("icons/icon48.png");

  let enabled = true;
  let observer = null;
  let rafScheduled = false;
  const icons = new Map(); // link -> icon element

  function createIcon(magnetUrl) {
    const icon = document.createElement("img");
    icon.src = ICON_URL;
    icon.alt = "";
    icon.draggable = false;
    icon.className = ICON_CLASS;
    icon.title = "Send to Transmission";
    icon.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        sendMagnet(magnetUrl, icon);
      },
      true
    );
    return icon;
  }

  function sendMagnet(magnetUrl, icon) {
    icon.classList.remove("m2t-success", "m2t-error");
    icon.classList.add("m2t-sending");
    chrome.runtime.sendMessage(
      { type: "m2t-send-magnet", magnetUrl },
      (response) => {
        icon.classList.remove("m2t-sending");
        if (chrome.runtime.lastError) {
          icon.classList.add("m2t-error");
          icon.title = "Extension error — try reloading the page";
          return;
        }
        if (response && response.ok) {
          icon.classList.add("m2t-success");
          icon.title = response.duplicate
            ? `"${response.name}" already exists`
            : `"${response.name}" sent to Transmission`;
          setTimeout(() => {
            icon.classList.remove("m2t-success");
            icon.title = "Send to Transmission";
          }, 2500);
        } else {
          icon.classList.add("m2t-error");
          icon.title = (response && response.error) || "Failed to send";
          setTimeout(() => {
            icon.classList.remove("m2t-error");
            icon.title = "Send to Transmission";
          }, 3000);
        }
      }
    );
  }

  function processLink(link) {
    if (link.hasAttribute(PROCESSED_ATTR)) return;
    const href = link.getAttribute("href");
    if (!href || !/^magnet:/i.test(href)) return;
    link.setAttribute(PROCESSED_ATTR, "1");

    const icon = createIcon(href);
    document.body.appendChild(icon);
    icons.set(link, icon);
    scheduleUpdate();
  }

  function removeAllIcons() {
    for (const [link, icon] of icons) {
      link.removeAttribute(PROCESSED_ATTR);
      icon.remove();
    }
    icons.clear();
  }

  function updatePositions() {
    rafScheduled = false;
    for (const [link, icon] of icons) {
      if (!link.isConnected) {
        icon.remove();
        icons.delete(link);
        continue;
      }
      const rect = link.getBoundingClientRect();
      const isVisible = rect.width > 0 || rect.height > 0;
      icon.style.display = isVisible ? "" : "none";
      if (!isVisible) continue;
      icon.style.top = `${rect.top - ICON_SIZE / 2}px`;
      icon.style.left = `${rect.right - ICON_SIZE / 2}px`;
    }
  }

  function scheduleUpdate() {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(updatePositions);
  }

  function scan(root) {
    root.querySelectorAll('a[href^="magnet:" i]').forEach(processLink);
  }

  function startObserving() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches && node.matches('a[href^="magnet:" i]')) {
            processLink(node);
          } else if (node.querySelectorAll) {
            scan(node);
          }
        }
      }
      scheduleUpdate(); // also catches removals, via the isConnected check above
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function stopObserving() {
    if (!observer) return;
    observer.disconnect();
    observer = null;
  }

  function setEnabled(value) {
    enabled = value;
    if (enabled) {
      scan(document);
      startObserving();
      scheduleUpdate();
    } else {
      stopObserving();
      removeAllIcons();
    }
  }

  // Capture phase so scrolling inside any nested scrollable container is caught too,
  // not just window-level scrolling.
  window.addEventListener("scroll", scheduleUpdate, { passive: true, capture: true });
  window.addEventListener("resize", scheduleUpdate, { passive: true });

  chrome.storage.sync.get({ showInlineIcons: true }, (s) => setEnabled(s.showInlineIcons));

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.showInlineIcons) setEnabled(changes.showInlineIcons.newValue);
  });
})();
