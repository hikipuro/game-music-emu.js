#!/bin/sh

SrcDir="../game-music-emu-0.6.2/"
BuildDir="build"

if [ "$1" = "clean" ]; then
	echo "Clean game-music-emu"
	rm -rf "./$BuildDir"
	exit 0
fi

echo "Build game-music-emu"

command -v emconfigure >/dev/null 2>&1 || { echo >&2 "emconfigure not found. Aborting."; exit 1; }
command -v emmake >/dev/null 2>&1 || { echo >&2 "emmake not found. Aborting."; exit 1; }

if [ ! -d "$BuildDir" ]; then
	mkdir $BuildDir
fi

cd $BuildDir
emconfigure cmake $SrcDir
emmake make

cd ..
cp "./$BuildDir/gme/gme.js" .
cp "./$BuildDir/gme/gme.js.mem" .
