# Ilyas Studio — Mini Game Maker

A browser-based **2D game creation prototype** with a scene editor, object library, inspector, playtesting, local project storage, JSON import/export, image sprites, and a Python scripting workspace.

## Quick start
1. Open the published GitHub Pages site or open `index.html` in a modern desktop browser.
2. Choose a starter template or select **New project**.
3. Add objects from **Object Library** or drag an object into the scene.
4. Click an object to select it. Drag to move it; drag a corner handle to resize it.
5. Change its position, dimensions, color, rotation, visibility, layer, speed, and behaviors in **Inspector**.
6. For text objects, edit the displayed text in the Inspector. Use **Import image** to add a sprite.
7. Press **Play** to test the scene. Use **Save** to keep the project in this browser.
8. Use **Export** to download playable HTML or project JSON. Use **Import project** on the dashboard to reopen a JSON backup.

## Useful controls
- `V`: select tool; `R`: rectangle; `C`: circle; `T`: text
- `Delete`: delete selected object
- `Ctrl+D`: duplicate selected object
- `Ctrl+Z` / `Ctrl+Y`: undo / redo
- Arrow keys: nudge selected object; `Shift` + arrow: move by 10 pixels
- `Ctrl+S`: save; `Space`: play / stop; `Esc`: stop playtest

## Publish with GitHub Pages
1. Open **Settings → Pages** in this repository.
2. Choose **Deploy from a branch**, select **main** and **/(root)**, then save.
3. Open the Pages URL shown in repository settings once deployment completes.

## Current scope and limitations
This is a lightweight browser-based 2D editor, **not a full replacement** for Godot or Roblox Studio. It does not yet provide a full 3D editor, production-grade physics, multiplayer/server tools, a full animation timeline, or complete compatibility between Python scripts and exported standalone games. Python runtime features may need an internet connection to load Pyodide. Projects are saved in browser storage on the device where they were created; export JSON backups regularly.
