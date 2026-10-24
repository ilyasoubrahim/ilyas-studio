# Ilyas Studio — Mini Game Maker

A browser-based **2D game creation prototype** with a scene editor, object library, inspector, playtesting, local project storage, JSON import/export, image sprites, and a Scratch-style visual-block programming workspace.

## Quick start
1. Open the published GitHub Pages site or open `index.html` in a modern desktop browser.
2. Choose a starter template or select **New project**.
3. Choose **AI Combat Arena** to try the new top-down combat starter, or add objects from **Object Library**.
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

## Visual blocks programming
- Choose **AI Combat Arena** from the dashboard to create a ready-to-play combat project with one player and three enemies.
- Move with **WASD** or the **arrow keys**; press **E** to attack an enemy in range.
- The player and enemies have health. Defeating an enemy awards 10 points; when player HP reaches zero, the playtest ends.
- Open **Blocks** to choose a character and add movement, message, wait, touch-condition, color, speed, and score blocks.
- The **if touching… add points** block lets you choose another object and customize the number of points.
- The **wait for seconds** block accepts a custom duration. Changes are saved directly to the character, so removing a block removes that behavior too.

## Publish with GitHub Pages
1. Open **Settings → Pages** in this repository.
2. Choose **Deploy from a branch**, select **main** and **/(root)**, then save.
3. Open the Pages URL shown in repository settings once deployment completes.

## Current scope and limitations
This is a lightweight browser-based 2D editor, **not a full replacement** for Godot or Roblox Studio. It does not yet provide a full 3D editor, production-grade physics, multiplayer/server tools, a full animation timeline, or complete visual-block runtime support in exported standalone games. Visual blocks run in the editor playtest; the current standalone HTML export does not include their runtime yet. Projects are saved in browser storage on the device where they were created; export JSON backups regularly.
