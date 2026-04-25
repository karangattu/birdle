# Birdle 🐦

A fast-paced backyard bird-spotting game. Birds appear in the trees and play their calls - tap the matching button before they fly off. Build combos for big multipliers; misidentify and lose points (and your streak).

## How to play
1. **Start** the game from the title screen.
2. Choose a difficulty:
   - **Regular** – slower birds, fewer at once.
   - **Expert** – faster birds, crowded trees, bigger rewards.
3. When a bird appears, listen for its call and tap its name from the bottom panel.
4. Correct ID = points + combo multiplier. Wrong ID = points off + combo reset.
5. You have 60 seconds. Best score per difficulty is saved locally.

## Birds you'll spot
American Crow · American Robin · Black Phoebe · California Towhee · Cedar Waxwing · Dark-eyed Junco · Hermit Thrush · House Finch · Scrub Jay · Spotted Towhee

## Run locally
It's a static site — no build step.

```bash
# any static server works, for example:
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy
A GitHub Actions workflow at [.github/workflows/deploy.yml](.github/workflows/deploy.yml) publishes the repository contents to GitHub Pages on every push to `main`.

**One-time setup:** in your repo, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Project structure
```
index.html              # Markup + screens (start, difficulty, game, end)
styles.css              # Layout, animations, responsive HUD
js/game.js              # Game engine: spawning, scoring, combos, sound
assets/                 # Backdrop, binoculars, bird images, bird calls, poster
.github/workflows/      # GitHub Pages deploy
```

## Tweaking difficulty
Edit the `DIFFICULTY` object in [js/game.js](js/game.js) to change spawn rates, bird lifetime, max concurrent birds, and points.

