# Iritor, playable again

The public welcome page and two browser editions of Wootsoft's Iritor.

Visit **https://floitsch.github.io/iritor-playable/**.

For local use, serve this folder with `python3 -m http.server 8000` and open
`http://localhost:8000/` in a current WebAssembly/WebGL-capable desktop browser.

The game artwork is losslessly compressed into small files for GitHub Pages.
The loader checks each download and supplies the original bytes to Emscripten.
There is no game-server dependency. The preserved prototype limitations and
browser adaptations are explained on the welcome and play pages.

Set `video_url` in `site.json` to the evolution film's HTTPS YouTube URL when it
is uploaded. The page will then display the Watch button.
