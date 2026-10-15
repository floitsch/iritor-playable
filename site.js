// Copyright (C) 2026 Toit contributors.
(async () => {
  for (const edition of ['core', 'late']) {
    try {
      const response = await fetch(`play/${edition}/assets.json`);
      if (!response.ok) continue;
      const assets = await response.json();
      document.getElementById(`${edition}-size`).textContent =
        `About ${Math.ceil(assets.download_bytes / 1048576)} MB of artwork on the first load. Desktop keyboard recommended.`;
    } catch (_) { /* The play page reports download errors if needed. */ }
  }
  try {
    const response = await fetch('site.json');
    if (!response.ok) return;
    const config = await response.json();
    if (!config.video_url) return;
    const url = new URL(config.video_url);
    if (url.protocol !== 'https:' || !['youtube.com', 'www.youtube.com', 'youtu.be'].includes(url.hostname)) return;
    const link = document.getElementById('video-link');
    link.href = url.href; link.hidden = false;
    document.getElementById('video-pending').hidden = true;
  } catch (_) { /* Keep the clear pending state until a video is configured. */ }
})();
