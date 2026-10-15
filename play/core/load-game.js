// Copyright (C) 2026 Toit contributors.
(async function () {
  const status = document.getElementById('status');
  const show = text => { status.textContent = text; };
  try {
    if (!globalThis.DecompressionStream) {
      throw new Error('Please use a current Firefox, Chrome, Edge or Safari browser.');
    }
    const response = await fetch('assets.json');
    if (!response.ok) throw new Error('The artwork list could not be downloaded.');
    const assets = await response.json();
    const data = new Uint8Array(assets.bytes);
    let offset = 0, downloaded = 0;
    for (const part of assets.parts) {
      show(`Downloading game artwork: ${Math.round(downloaded / 1048576)} / ${Math.ceil(assets.download_bytes / 1048576)} MB`);
      const response = await fetch(part.path);
      if (!response.ok) throw new Error('Some game artwork could not be downloaded. Please reload.');
      const compressed = await response.arrayBuffer();
      const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', compressed))]
        .map(value => value.toString(16).padStart(2, '0')).join('');
      if (hash !== part.sha256) throw new Error('An artwork download was incomplete. Please reload.');
      const reader = new Blob([compressed]).stream()
        .pipeThrough(new DecompressionStream('gzip')).getReader();
      const start = offset;
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        if (offset + value.length > data.length) throw new Error('The artwork package has an unexpected size.');
        data.set(value, offset); offset += value.length;
      }
      if (offset - start !== part.bytes) throw new Error('The artwork package is incomplete.');
      downloaded += compressed.byteLength;
    }
    if (offset !== data.length) throw new Error('The artwork package is incomplete.');
    let available = data.buffer;
    Module.getPreloadedPackage = (_name, size) => {
      if (!available || size !== assets.bytes) throw new Error('Unexpected game artwork request.');
      const result = available; available = null;
      return result;
    };
    show('Starting Iritor…');
    const script = document.createElement('script');
    script.src = assets.script;
    script.onerror = () => show('The game could not start. Please reload.');
    document.body.append(script);
    document.documentElement.dataset.artworkReady = 'true';
  } catch (error) {
    show('Unable to load Iritor. ' + error.message);
    console.error(error);
    document.documentElement.dataset.artworkError = error.message;
  }
})();
