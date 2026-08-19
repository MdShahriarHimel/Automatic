
# Automatic

> **Never used Claude Code?** Start at [jaredrhod.com](https://jaredrhod.com): pick your situation and it routes you to the right path.

Move things on your screen with your bare hands. barehands turns your webcam into a hand-tracked interface: notes, images, and 3D models float over your camera as glass cards. You pinch them, throw[...]

And it's a body waiting for a brain: wire in your AI and the on-screen ring becomes its face, while two small scripts give it hands and eyes on your board. Free to use, share, and build on, includi[...]

**Watch it in action:**

[![barehands demo video](https://img.youtube.com/vi/cV02finVi4o/maxresdefault.jpg)](https://youtu.be/cV02finVi4o)

## Run it (nothing needed)

```
git clone https://github.com/jaredrhod/barehands
cd barehands
python3 server.py
```

On Windows the command is `python server.py`. Open **http://127.0.0.1:8794/stage.html** in Chrome, allow the camera, and wave. That's the whole install: the server is stdlib Python, and the page l[...]

**Already in a Claude Code session with your agent?** One sentence does it all: *"clone https://github.com/jaredrhod/barehands.git, then read barehands/barehands.md and set me up."* Your agent ins[...]

Tap the ring → orbs bloom → tap an orb → your files unfold on glass. The sample notes teach the gestures from inside the board itself.

## Give it your notes

The "vault" on the board is just a folder of markdown, which means **an Obsidian vault works as-is**, and so does any folder of `.md` files. Point an orb at it in `barehands.json`:

```json
{
  "name": "Assistant",
  "orbs": [
    { "title": "Notes", "path": "~/Documents/MyVault", "kind": "notes" },
    { "title": "Props", "path": "media",               "kind": "media" }
  ]
}
```

One line per orb. Add more folders, rename them, point them anywhere. The `media` orb is the props airlock: drop images in `media/misc/`, transparent props in `media/fx/`, 3D models in `media/mode[...]

## Wire in your AI

**The easy way:** open the repo in Claude Code and say *"read barehands.md and set me up."* The setup wizard interviews you, writes the config, and wires your assistant in end to end.

**The manual way:** barehands speaks two dead-simple protocols:

- **The ring is a face.** It reads tiny files in `state/`: write `thinking` (or `idle` / `listening` / `speaking`) to `state/state` and the ring reacts. No files, no problem: it idles beautifully.[...]
- **The board is a stage.** `bin/board.sh '{"a":"present","title":"THE PLAN","body":"..."}'` and the thing flies center stage, enlarged and spotlit, everything else dimmed: that's the show-me verb[...]

Anything that can write a file or curl localhost can be the brain: Claude, a local LLM, a cron job, a Stream Deck button.

If your assistant doesn't have a memory yet, pair this with [ai-memory-vault](https://github.com/jaredrhod/ai-memory-vault); the vault it builds becomes a notes orb on this board.

## The gestures

Tap (quick pinch) opens and closes. Pinch-drag moves. Hold still while carrying to rotate in 3D. Two hands scale. Flick to throw. **Clap** (palms together, fingers up) sweeps the board clean. **Th[...]

Every threshold was tuned on a real hand across weeks of live use, and because the gates measure hand *shape* as ratios, not size, they hold at any camera distance. The full cheat sheet is on the [...]

## Streaming / recording (advanced)

Two pages, one scene: the tracker page owns your camera; `stage.html?role=render` is a truly transparent mirror of it, built for an OBS browser source: the glass composites over your camera feed w[...]

## Credits

Hand tracking by [Google MediaPipe](https://developers.google.com/mediapipe) (Apache 2.0). 3D rendering by [three.js](https://threejs.org) (MIT). Both load from public CDNs; this repo redistribute[...]

## The rest of it

A board is better with an agent behind it. Give it a voice and you can talk while you move things around, and a memory vault turns the notes orb into your agent's actual brain instead of a folder [...]

- **The whole stack, one command.** [fullstack-agent](https://github.com/jaredrhod/fullstack-agent) installs the memory, the voice, the face, and the hands, and wires them together for you. Pick o[...]
- **The videos.** Free series on all of it: https://youtube.com/@jaredrhod
- **The Discord.** Thousands of builders, and the fastest place to get unstuck: https://discord.gg/YSdsqMv3V8
- **Everything else,** free and open source: https://jaredrhod.com

## Support

Free to use, and always will be. If this helped you out, you can buy me a coffee:

[![Support me on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/jaredrhod)

## License

Copyright (c) 2026 Jared Rhodenizer.

Licensed under the GNU Affero General Public License, version 3 or later (AGPL-3.0-or-later). **Use it in your business, commercially, for free.** Run it, change it, build your workflow on top of it, and charge for the work you do with it. The one rule is that it stays open: if you hand it to someone else, or run a modified version as a service other people use, your version ships under this same license with its source available. Credit me when you build on it. Want it inside a closed-source commercial product? Email license@jaredrhod.com. Full terms are in the LICENSE file and at https://www.gnu.org/licenses/agpl-3.0.html
