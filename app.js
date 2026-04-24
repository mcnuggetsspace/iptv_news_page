const STORAGE_KEY = "iptv-news-page-channels-v1";

const defaultChannels = [
  {
    id: "bloomberg-tv",
    title: "Bloomberg TV",
    description: "Official Bloomberg US live stream.",
    url: "https://bloomberg.com/media-manifest/streams/us.m3u8",
  },
  {
    id: "bbc-news",
    title: "BBC News",
    description: "Add your preferred BBC News stream here later.",
    url: "",
  },
  {
    id: "cnbc",
    title: "CNBC",
    description: "Add your preferred CNBC stream here later.",
    url: "",
  },
  {
    id: "cnn",
    title: "CNN",
    description: "Set your preferred CNN-compatible stream here later.",
    url: "",
  },
  {
    id: "fox-news",
    title: "FOX News",
    description: "Set your preferred FOX News-compatible stream here later.",
    url: "",
  },
];

const player = document.querySelector("#player");
const channelList = document.querySelector("#channel-list");
const quickChannelList = document.querySelector("#quick-channel-list");
const channelTitle = document.querySelector("#channel-title");
const channelDescription = document.querySelector("#channel-description");
const settingsToggle = document.querySelector("#settings-toggle");
const settingsPanel = document.querySelector("#settings-panel");
const channelForm = document.querySelector("#channel-form");
const channelFormList = document.querySelector("#channel-form-list");
const resetButton = document.querySelector("#reset-button");
const statusText = document.querySelector("#status-text");
const fullscreenButton = document.querySelector("#fullscreen-button");

let channels = loadSavedChannels();
let activeChannelId = channels[0]?.id ?? null;
let hls;

function loadSavedChannels() {
  const saved = window.localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return structuredClone(defaultChannels);
  }

  try {
    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed) || parsed.length !== defaultChannels.length) {
      return structuredClone(defaultChannels);
    }

    return defaultChannels.map((channel, index) => ({
      ...channel,
      ...parsed[index],
      id: channel.id,
    }));
  } catch {
    return structuredClone(defaultChannels);
  }
}

function saveChannels(nextChannels) {
  channels = nextChannels;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
}

function destroyHls() {
  if (hls) {
    hls.destroy();
    hls = null;
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setStatus(message) {
  statusText.textContent = message;
}

function setActiveButton(channelId) {
  const buttons = channelList.querySelectorAll(".channel-button");
  const quickButtons = quickChannelList.querySelectorAll(".quick-channel-button");

  buttons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.channelId === channelId);
  });

  quickButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.channelId === channelId);
  });
}

function getDisplayUrl(url) {
  return url ? url : "No stream URL set yet";
}

function renderChannelButtons() {
  channelList.innerHTML = "";
  quickChannelList.innerHTML = "";

  channels.forEach((channel) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "channel-button";
    button.dataset.channelId = channel.id;
    button.disabled = !channel.url;
    button.innerHTML = `
      <span class="channel-button-title">${escapeHtml(channel.title)}</span>
      <span class="channel-button-note">${escapeHtml(channel.description)}</span>
      <span class="channel-button-url">${escapeHtml(getDisplayUrl(channel.url))}</span>
    `;
    button.addEventListener("click", () => loadChannel(channel.id));
    channelList.appendChild(button);

    const quickButton = document.createElement("button");
    quickButton.type = "button";
    quickButton.className = "quick-channel-button";
    quickButton.dataset.channelId = channel.id;
    quickButton.disabled = !channel.url;
    quickButton.textContent = channel.title;
    quickButton.addEventListener("click", () => loadChannel(channel.id));
    quickChannelList.appendChild(quickButton);
  });

  setActiveButton(activeChannelId);
}

function renderForm() {
  channelFormList.innerHTML = "";

  channels.forEach((channel, index) => {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "channel-fieldset";
    fieldset.innerHTML = `
      <legend>Channel ${index + 1}</legend>
      <div class="field-row">
        <label for="title-${channel.id}">Name</label>
        <input id="title-${channel.id}" name="title-${channel.id}" type="text" value="${escapeHtml(channel.title)}" maxlength="40" />
      </div>
      <div class="field-row">
        <label for="description-${channel.id}">Description</label>
        <textarea id="description-${channel.id}" name="description-${channel.id}" maxlength="180">${escapeHtml(channel.description)}</textarea>
      </div>
      <div class="field-row">
        <label for="url-${channel.id}">M3U8 URL</label>
        <input id="url-${channel.id}" name="url-${channel.id}" type="url" inputmode="url" autocapitalize="off" spellcheck="false" value="${escapeHtml(channel.url)}" placeholder="https://example.com/live.m3u8" />
      </div>
    `;
    channelFormList.appendChild(fieldset);
  });
}

function loadChannel(channelId) {
  const channel = channels.find((item) => item.id === channelId);

  if (!channel) {
    return;
  }

  activeChannelId = channel.id;
  destroyHls();
  player.pause();
  player.removeAttribute("src");
  player.load();

  channelTitle.textContent = channel.title;
  channelDescription.textContent = channel.description;
  setActiveButton(channel.id);

  if (!channel.url) {
    setStatus(`Add an M3U8 URL for ${channel.title} in settings.`);
    return;
  }

  const canUseNativeHls =
    typeof player.canPlayType === "function" &&
    player.canPlayType("application/vnd.apple.mpegurl") !== "";

  if (canUseNativeHls) {
    player.src = channel.url;
    setStatus(`${channel.title} is ready.`);
    player.play().catch(() => {});
    return;
  }

  if (window.Hls && window.Hls.isSupported()) {
    hls = new window.Hls({
      enableWorker: true,
      lowLatencyMode: false,
    });
    hls.loadSource(channel.url);
    hls.attachMedia(player);
    hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
      setStatus(`${channel.title} is ready.`);
      player.play().catch(() => {});
    });
    hls.on(window.Hls.Events.ERROR, (_event, data) => {
      if (data?.fatal) {
        setStatus(
          `Playback error for ${channel.title}. This stream may block cross-site playback in this browser.`
        );
      }
    });
    return;
  }

  player.src = channel.url;
  setStatus(`${channel.title} is ready.`);
  player.play().catch(() => {});
}

function handleSave(event) {
  event.preventDefault();

  const formData = new FormData(channelForm);
  const nextChannels = channels.map((channel) => ({
    ...channel,
    title: String(formData.get(`title-${channel.id}`) || "").trim() || channel.title,
    description: String(formData.get(`description-${channel.id}`) || "").trim(),
    url: String(formData.get(`url-${channel.id}`) || "").trim(),
  }));

  saveChannels(nextChannels);
  renderChannelButtons();
  renderForm();
  loadChannel(activeChannelId || nextChannels[0].id);
  setStatus("Channels saved locally in Safari on this device.");
}

function toggleSettings() {
  const nextHidden = !settingsPanel.hidden;
  settingsPanel.hidden = nextHidden;
  settingsToggle.textContent = nextHidden ? "Edit" : "Close";
}

function resetDefaults() {
  saveChannels(structuredClone(defaultChannels));
  activeChannelId = defaultChannels[0].id;
  renderChannelButtons();
  renderForm();
  loadChannel(activeChannelId);
  setStatus("Default channels restored for this device.");
}

function enterFullscreen() {
  if (player.requestFullscreen) {
    player.requestFullscreen().catch(() => {});
  }
}

settingsToggle.addEventListener("click", toggleSettings);
channelForm.addEventListener("submit", handleSave);
resetButton.addEventListener("click", resetDefaults);
fullscreenButton.addEventListener("click", enterFullscreen);

renderChannelButtons();
renderForm();
loadChannel(activeChannelId);
