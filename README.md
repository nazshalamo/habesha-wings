# Habesha Wings

An Ethiopian-themed Flappy Bird-style browser game with illustrated highland scenery, a golden bird wearing a woven scarf, patterned obstacles, and keyboard and touch controls.

## Play locally

This is a static HTML, CSS, and JavaScript game. No npm packages or build step are required.

From this directory, run:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000 in your browser. Serve the folder over HTTP rather than opening index.html directly, because the game uses JavaScript modules.

## Controls

| Action | Control |
| --- | --- |
| Flap or start | Tap, Space, Up arrow, or W |
| Pause or resume | P or Escape |
| Toggle sound | M or the sound button |
| Restart | Fly again or Space |

Your personal best and sound preference are stored in the current browser. The game pauses when you switch away from its tab.

## Files

- `index.html`: game interface and metadata
- `style.css`: responsive layout and visual styling
- `game.js`: game loop, controls, scoring, sound, and rendering
- `physics.mjs`: movement settings and collision detection
- `assets/bird.png`: original bird character illustration
- `assets/highlands.png`: original highlands illustration
- `favicon.svg`: application icon

The artwork was generated for this game. All game assets are included locally; no external services or API keys are required. Relative asset paths allow the game to run from a subdirectory on a static web host.
