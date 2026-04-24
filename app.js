const channels = [
  {
    id: "bloomberg-us-1",
    title: "Bloomberg TV US",
    description: "Official Bloomberg US live stream.",
    url: "https://bloomberg.com/media-manifest/streams/us.m3u8",
  },
  {
    id: "bloomberg-us-2",
    title: "Bloomberg TV US 2",
    description: "Placeholder slot. Replace with your second stream later.",
    url: "https://bloomberg.com/media-manifest/streams/us.m3u8",
  },
  {
    id: "bloomberg-us-3",
    title: "Bloomberg TV US 3",
    description: "Placeholder slot. Replace with your third stream later.",
    url: "https://bloomberg.com/media-manifest/streams/us.m3u8",
  },
  {
    id: "bloomberg-us-4",
    title: "Bloomberg TV US 4",
    description: "Placeholder slot. Replace with your fourth stream later.",
    url: "https://bloomberg.com/media-manifest/streams/us.m3u8",
  },
  {
    id: "bloomberg-us-5",
    title: "Bloomberg TV US 5",
    description: "Placeholder slot. Replace with your fifth stream later.",
    url: "https://bloomberg.com/media-manifest/streams/us.m3u8",
  },
];

const player = document.querySelector("#player");
const channelList = document.querySelector("#channel-list");
const channelTitle = document.querySelector("#channel-title");
const channelDescription = document.querySelector("#channel-description");

let hls;

function destroyHls() {
  if (hls) {
    hls.destroy();
    hls = null;
  }
}

function setActiveButton(channelId) {
  const buttons = channelList.querySelectorAll(".channel-button");

  buttons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.channelId === channelId);
  });
}

function loadChannel(channel) {
  destroyHls();

  channelTitle.textContent = channel.title;
  channelDescription.textContent = channel.description;
  setActiveButton(channel.id);

  if (window.Hls && window.Hls.isSupported()) {
    hls = new window.Hls({
      enableWorker: true,
      lowLatencyMode: false,
    });
    hls.loadSource(channel.url);
    hls.attachMedia(player);
    hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
      player.play().catch(() => {});
    });
    return;
  }

  player.src = channel.url;
  player.play().catch(() => {});
}

function renderChannelButtons() {
  channels.forEach((channel) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "channel-button";
    button.dataset.channelId = channel.id;
    button.innerHTML = `
      <span class="channel-button-title">${channel.title}</span>
      <span class="channel-button-note">${channel.description}</span>
    `;
    button.addEventListener("click", () => loadChannel(channel));
    channelList.appendChild(button);
  });
}

renderChannelButtons();
loadChannel(channels[0]);
