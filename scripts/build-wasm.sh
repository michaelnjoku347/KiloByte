#!/usr/bin/env bash
# Compile native/kiln-rally (C++ / SDL2) to public/games/kiln-rally.
# Requires Emscripten 4.x. See README, "Build a C++ game to WebAssembly".
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public/games/kiln-rally"
mkdir -p "$OUT"

if ! command -v emcc >/dev/null 2>&1; then
  for env in \
    "${EMSDK:-}/emsdk_env.sh" \
    /tmp/emsdk/emsdk_env.sh \
    "$HOME/emsdk/emsdk_env.sh" \
    "$ROOT/emsdk/emsdk_env.sh"
  do
    if [[ -n "$env" && -f "$env" ]]; then
      # shellcheck disable=SC1090
      source "$env"
      break
    fi
  done
fi

if ! command -v emcc >/dev/null 2>&1; then
  echo "emcc not found. Install emsdk 4.0.11 and source emsdk_env.sh, then rerun." >&2
  exit 1
fi

emcc "$ROOT/native/kiln-rally/src/main.cpp" \
  -o "$OUT/index.html" \
  --shell-file "$ROOT/native/kiln-rally/shell.html" \
  -std=c++17 \
  -O2 \
  -sUSE_SDL=2 \
  -sENVIRONMENT=web \
  -sALLOW_MEMORY_GROWTH=1 \
  -sFILESYSTEM=0 \
  -sASSERTIONS=0

echo "Kiln Rally build:"
ls -lh "$OUT"/index.html "$OUT"/index.js "$OUT"/index.wasm
