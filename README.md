# oSlide2

A modern Electron-based slide/presentation application with a DOM-based editor, real-time preview, and fullscreen presentation mode.

## Features

- **Project Management** — Create, open, rename, duplicate, and delete projects from the home screen
- **DOM-Based Editor** — Edit slides and add elements: text, titles, images, rectangles, circles, arrows
- **Properties Panel** — Adjust position, size, rotation, opacity, font family, and colors for selected elements
- **Drag & Drop** — Move and resize elements on canvas; drag images from your file system
- **Slide Management** — Add, duplicate, delete, and reorder slides via drag-and-drop thumbnails
- **Undo / Redo** — Unlimited undo/redo stack
- **Presentation Mode** — Fullscreen slideshow with fade/slide/zoom transitions and a live timer
- **Export** — Export to PDF or PNG
- **Keyboard Shortcuts** — Fully customizable via Settings > Shortcuts
- **Theme** — Dark, Light, and System themes with a visual 3-card selector
- **i18n** — Turkish and English language support (extensible)
- **Context Menu** — Right-click menus for project cards and editor elements

## Built With

- [Electron](https://www.electronjs.org/) — Desktop application framework
- [Lucide](https://lucide.dev/) — Icon library
- Vanilla JavaScript — No framework dependencies

## Installation

```bash
npm install
npm start
```

## Usage

1. On launch, the home screen is displayed
2. Click "New Project" to create a presentation or open an existing one
3. Use the toolbar in the editor to add elements to slides
4. Press F5 to start presentation mode
5. Press Ctrl+S to save your project

## Project Structure

```
├── main.js                  # Electron main process
├── preload.js               # IPC bridge
├── home.html                # Home screen
├── editor.html              # Slide editor
├── presentation.html        # Presentation mode
├── css/
│   ├── home.css
│   ├── editor.css
│   └── presentation.css
├── js/
│   ├── core/
│   │   ├── state.js         # Application state, undo/redo
│   │   └── actions.js       # Slide and element CRUD
│   ├── ui/
│   │   ├── renderer.js      # DOM rendering
│   │   ├── canvas.js        # Canvas interactions (drag, resize)
│   │   └── panels.js        # Properties panel
│   ├── services/
│   │   ├── projectManager.js # Project CRUD
│   │   ├── fileManager.js   # File I/O
│   │   ├── shortcuts.js     # Customizable shortcuts
│   │   ├── i18n.js          # Localization
│   │   └── theme.js         # Theme management
│   ├── pages/
│   │   ├── home.js          # Home screen logic
│   │   ├── editor.js        # Editor logic
│   │   └── presentation.js  # Presentation logic
│   └── locales/
│       ├── tr.json          # Turkish translations
│       └── en.json          # English translations
└── package.json
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+S | Save |
| Ctrl+C | Copy |
| Ctrl+V | Paste |
| Ctrl+B | Bold |
| Ctrl+I | Italic |
| Ctrl+U | Underline |
| Delete / Backspace | Delete selected |
| F5 | Start presentation |
| Escape | Close dialog/menu |

All shortcuts are customizable in Settings > Shortcuts.

## License

ISC
