.PHONY: dev app build install check clean

# ── Quick Start ──────────────────────────────────────────────────────────────
# make install   # First time: install deps
# make app       # Run native Tauri desktop app
# make dev       # Run web-only dev server (no Tauri)

install:
	cd app/desktop && npm install

# Run as native Tauri desktop app (with OSA icon, native window)
app:
	cd app/desktop && npm run tauri:dev

# Run web-only dev server (faster, no Rust compile)
dev:
	cd app/desktop && npm run dev

# Build production Tauri app (.dmg on macOS)
build:
	cd app/desktop && npm run tauri:build

# Type check
check:
	cd app/desktop && npm run check

# Run tests
test:
	cd app/desktop && npm run test

clean:
	cd app/desktop && rm -rf build .svelte-kit node_modules
	cd app/desktop/src-tauri && cargo clean
