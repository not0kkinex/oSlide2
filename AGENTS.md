# AGENTS.md — oSlide2 Agent Instructions

## Project Overview
oSlide2 is an Electron-based slide/presentation app. Vanilla JS, no frameworks.

## Commands
- **Start**: `npm start`
- **Test**: `npm test` (not implemented — placeholder)

## Architecture
- `main.js` — Electron main process (windows, IPC handlers, menus)
- `preload.js` — contextBridge API for renderer ↔ main IPC
- Pages: `home.html`, `editor.html`, `presentation.html`
- JS is organized into `core/`, `ui/`, `services/`, `pages/`, `locales/` under `js/`
- All modules export globals via `window.*` (no bundler)

## JS Module Dependencies (load order)
1. `services/theme.js` — ThemeManager
2. `services/shortcuts.js` — ShortcutManager
3. `services/i18n.js` — I18n
4. `core/state.js` — App state, undo/redo
5. `core/actions.js` — Slide/element CRUD (depends on state)
6. `ui/renderer.js` — DOM rendering (depends on state + actions)
7. `ui/panels.js` — Properties panel (depends on state + actions + renderer)
8. `ui/canvas.js` — Canvas interactions (depends on all above)
9. `services/fileManager.js` — File I/O
10. `pages/editor.js` or `pages/home.js` — Page init

## Key Conventions
- Always use `window.*` for cross-module access
- State lives in `App` / `CoreState` global
- Undo/redo: call `save()` before mutations, then `renderAll()`
- Theme: use `ThemeManager.setTheme()` (values: `'dark'`, `'light'`, `'system'`)
- i18n: use `I18n.t('key')` for translatable strings; add keys to `locales/tr.json` and `locales/en.json`
- Shortcuts: register via `ShortcutManager.register(action, handler)` in page init

## Settings Persistence
- Config stored via Electron IPC: `getConfig()` / `saveConfig()`
- Settings object shape defined in `main.js` `loadConfig()`
- Theme selector uses `.theme-card[data-theme]` elements with `.active` class

## Code Style
- No semicolons (project convention)
- Single-line functions where possible
- No comments in code — keep it clean
- Turkish strings in UI for now; migrate to `I18n.t()` when touching
