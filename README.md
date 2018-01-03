# game-music-emu.js
javascript ports game-music-emu

This library build by emscripten.
Copy "gme.js" and "gme.js.mem" to your project folder.

## Build requirements

- emscripten
- cmake

## How to build

- enable your emscripten build emviroment (emsdk_env.sh).
- $ build.sh

## How to change build options

- open "game-music-emu-0.6.2/gme/CMakeLists.txt"
- Line: 148, "EMCC_LINKER_FLAGS" is emcc options

change post.js
- "post.js" is concat to "gme.js" when post compile timing
- rewrite this file if you want to any js modules

## Limitations

- this library don't have any wrappers for now
- you shoud call direct "ccall" or "cwrap" emscripten api
- you shoud know how to use game-music-emu library deeply
