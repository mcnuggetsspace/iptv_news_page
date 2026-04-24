var STORAGE_KEY = "iptv-news-page-channels-v1";

var defaultChannels = [
  {
    id: "bloomberg-tv",
    title: "Bloomberg TV",
    description: "Official Bloomberg US live stream.",
    url: "https://bloomberg.com/media-manifest/streams/us.m3u8"
  },
  {
    id: "bbc-news",
    title: "BBC News",
    description: "Add your preferred BBC News stream here later.",
    url: ""
  },
  {
    id: "cnbc",
    title: "CNBC",
    description: "Add your preferred CNBC stream here later.",
    url: ""
  },
  {
    id: "cnn",
    title: "CNN",
    description: "Set your preferred CNN-compatible stream here later.",
    url: ""
  },
  {
    id: "fox-news",
    title: "FOX News",
    description: "Set your preferred FOX News-compatible stream here later.",
    url: ""
  }
];

var player = document.getElementById("player");
var channelList = document.getElementById("channel-list");
var quickChannelList = document.getElementById("quick-channel-list");
var channelTitle = document.getElementById("channel-title");
var channelDescription = document.getElementById("channel-description");
var settingsToggle = document.getElementById("settings-toggle");
var settingsPanel = document.getElementById("settings-panel");
var channelForm = document.getElementById("channel-form");
var channelFormList = document.getElementById("channel-form-list");
var resetButton = document.getElementById("reset-button");
var statusText = document.getElementById("status-text");
var fullscreenButton = document.getElementById("fullscreen-button");

var channels = loadSavedChannels();
var activeChannelId = channels.length ? channels[0].id : null;
var hls = null;
var hlsScriptLoading = false;
var hlsScriptLoaded = false;

function cloneChannels(source) {
  var copy = [];
  var i;

  for (i = 0; i < source.length; i += 1) {
    copy.push({
      id: source[i].id,
      title: source[i].title,
      description: source[i].description,
      url: source[i].url
    });
  }

  return copy;
}

function getDefaultChannels() {
  return cloneChannels(defaultChannels);
}

function loadSavedChannels() {
  var saved = window.localStorage.getItem(STORAGE_KEY);
  var parsed;
  var nextChannels;
  var i;

  if (!saved) {
    return getDefaultChannels();
  }

  try {
    parsed = JSON.parse(saved);
  } catch (error) {
    return getDefaultChannels();
  }

  if (!parsed || !parsed.length || parsed.length !== defaultChannels.length) {
    return getDefaultChannels();
  }

  nextChannels = [];

  for (i = 0; i < defaultChannels.length; i += 1) {
    nextChannels.push({
      id: defaultChannels[i].id,
      title: typeof parsed[i].title === "string" && parsed[i].title ? parsed[i].title : defaultChannels[i].title,
      description:
        typeof parsed[i].description === "string" ? parsed[i].description : defaultChannels[i].description,
      url: typeof parsed[i].url === "string" ? parsed[i].url : defaultChannels[i].url
    });
  }

  return nextChannels;
}

function saveChannels(nextChannels) {
  channels = nextChannels;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
}

function destroyHls() {
  if (hls && typeof hls.destroy === "function") {
    hls.destroy();
  }

  hls = null;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setStatus(message) {
  statusText.textContent = message;
}

function setActiveButton(channelId) {
  var buttons = channelList.querySelectorAll(".channel-button");
  var quickButtons = quickChannelList.querySelectorAll(".quick-channel-button");
  var i;

  for (i = 0; i < buttons.length; i += 1) {
    buttons[i].classList.toggle("is-active", buttons[i].getAttribute("data-channel-id") === channelId);
  }

  for (i = 0; i < quickButtons.length; i += 1) {
    quickButtons[i].classList.toggle("is-active", quickButtons[i].getAttribute("data-channel-id") === channelId);
  }
}

function getDisplayUrl(url) {
  return url ? url : "No stream URL set yet";
}

function findChannelById(channelId) {
  var i;

  for (i = 0; i < channels.length; i += 1) {
    if (channels[i].id === channelId) {
      return channels[i];
    }
  }

  return null;
}

function safePlay() {
  try {
    var result = player.play();

    if (result && typeof result.catch === "function") {
      result.catch(function () {});
    }
  } catch (error) {
    return;
  }
}

function renderChannelButtons() {
  var i;

  channelList.innerHTML = "";
  quickChannelList.innerHTML = "";

  for (i = 0; i < channels.length; i += 1) {
    var channel = channels[i];
    var button = document.createElement("button");
    var quickButton = document.createElement("button");

    button.type = "button";
    button.className = "channel-button";
    button.setAttribute("data-channel-id", channel.id);
    button.disabled = !channel.url;
    button.innerHTML =
      '<span class="channel-button-title">' +
      escapeHtml(channel.title) +
      "</span>" +
      '<span class="channel-button-note">' +
      escapeHtml(channel.description) +
      "</span>" +
      '<span class="channel-button-url">' +
      escapeHtml(getDisplayUrl(channel.url)) +
      "</span>";
    button.addEventListener(
      "click",
      (function (id) {
        return function () {
          loadChannel(id);
        };
      })(channel.id)
    );
    channelList.appendChild(button);

    quickButton.type = "button";
    quickButton.className = "quick-channel-button";
    quickButton.setAttribute("data-channel-id", channel.id);
    quickButton.disabled = !channel.url;
    quickButton.textContent = channel.title;
    quickButton.addEventListener(
      "click",
      (function (id) {
        return function () {
          loadChannel(id);
        };
      })(channel.id)
    );
    quickChannelList.appendChild(quickButton);
  }

  setActiveButton(activeChannelId);
}

function renderForm() {
  var i;

  channelFormList.innerHTML = "";

  for (i = 0; i < channels.length; i += 1) {
    var channel = channels[i];
    var fieldset = document.createElement("fieldset");

    fieldset.className = "channel-fieldset";
    fieldset.innerHTML =
      "<legend>Channel " +
      String(i + 1) +
      "</legend>" +
      '<div class="field-row">' +
      '<label for="title-' +
      channel.id +
      '">Name</label>' +
      '<input id="title-' +
      channel.id +
      '" name="title-' +
      channel.id +
      '" type="text" value="' +
      escapeHtml(channel.title) +
      '" maxlength="40" />' +
      "</div>" +
      '<div class="field-row">' +
      '<label for="description-' +
      channel.id +
      '">Description</label>' +
      '<textarea id="description-' +
      channel.id +
      '" name="description-' +
      channel.id +
      '" maxlength="180">' +
      escapeHtml(channel.description) +
      "</textarea>" +
      "</div>" +
      '<div class="field-row">' +
      '<label for="url-' +
      channel.id +
      '">M3U8 URL</label>' +
      '<input id="url-' +
      channel.id +
      '" name="url-' +
      channel.id +
      '" type="url" inputmode="url" autocapitalize="off" spellcheck="false" value="' +
      escapeHtml(channel.url) +
      '" placeholder="https://example.com/live.m3u8" />' +
      "</div>";

    channelFormList.appendChild(fieldset);
  }
}

function setPlayerSource(url) {
  player.src = url;
  safePlay();
}

function loadWithHlsJs(channel) {
  if (!window.Hls || !window.Hls.isSupported()) {
    setStatus("This browser needs native HLS support for this stream.");
    return;
  }

  hls = new window.Hls({
    enableWorker: true,
    lowLatencyMode: false
  });

  hls.loadSource(channel.url);
  hls.attachMedia(player);
  hls.on(window.Hls.Events.MANIFEST_PARSED, function () {
    setStatus(channel.title + " is ready.");
    safePlay();
  });
  hls.on(window.Hls.Events.ERROR, function (_event, data) {
    if (data && data.fatal) {
      setStatus("Playback error for " + channel.title + ". Try another stream URL.");
    }
  });
}

function ensureHlsScript(callback) {
  var script;

  if (hlsScriptLoaded) {
    callback();
    return;
  }

  if (hlsScriptLoading) {
    window.setTimeout(function () {
      ensureHlsScript(callback);
    }, 150);
    return;
  }

  hlsScriptLoading = true;
  script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js";
  script.onload = function () {
    hlsScriptLoading = false;
    hlsScriptLoaded = true;
    callback();
  };
  script.onerror = function () {
    hlsScriptLoading = false;
    setStatus("Could not load HLS playback helper.");
  };
  document.body.appendChild(script);
}

function loadChannel(channelId) {
  var channel = findChannelById(channelId);
  var canUseNativeHls;

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
    setStatus("Add an M3U8 URL for " + channel.title + " in settings.");
    return;
  }

  canUseNativeHls =
    typeof player.canPlayType === "function" &&
    player.canPlayType("application/vnd.apple.mpegurl") !== "";

  if (canUseNativeHls) {
    setPlayerSource(channel.url);
    setStatus(channel.title + " is ready.");
    return;
  }

  ensureHlsScript(function () {
    loadWithHlsJs(channel);
  });
}

function handleSave(event) {
  var formData = new FormData(channelForm);
  var nextChannels = [];
  var i;

  event.preventDefault();

  for (i = 0; i < channels.length; i += 1) {
    nextChannels.push({
      id: channels[i].id,
      title: String(formData.get("title-" + channels[i].id) || "").trim() || channels[i].title,
      description: String(formData.get("description-" + channels[i].id) || "").trim(),
      url: String(formData.get("url-" + channels[i].id) || "").trim()
    });
  }

  saveChannels(nextChannels);
  renderChannelButtons();
  renderForm();
  loadChannel(activeChannelId || nextChannels[0].id);
  setStatus("Channels saved locally in Safari on this device.");
}

function toggleSettings() {
  var nextHidden = !settingsPanel.hidden;
  settingsPanel.hidden = nextHidden;
  settingsToggle.textContent = nextHidden ? "Edit" : "Close";
}

function resetDefaults() {
  saveChannels(getDefaultChannels());
  activeChannelId = defaultChannels[0].id;
  renderChannelButtons();
  renderForm();
  loadChannel(activeChannelId);
  setStatus("Default channels restored for this device.");
}

function enterFullscreen() {
  if (player.requestFullscreen) {
    player.requestFullscreen();
    return;
  }

  if (player.webkitEnterFullscreen) {
    player.webkitEnterFullscreen();
  }
}

settingsToggle.addEventListener("click", toggleSettings);
channelForm.addEventListener("submit", handleSave);
resetButton.addEventListener("click", resetDefaults);
fullscreenButton.addEventListener("click", enterFullscreen);

renderChannelButtons();
renderForm();
loadChannel(activeChannelId);
