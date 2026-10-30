# FUCKING TYPE RACE

An original dark-industrial multiplayer typing race starter project. Up to 8 players can create or join a room, race in real time, and view results.

## Run locally

1. Install Node.js 18 or newer.
2. In this folder run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000` in your browser.

## Deploy to Render

- Push the contents of this folder to a GitHub repository.
- In Render choose **New + → Web Service** and connect the repository.
- Runtime: Node.
- Build command: `npm install`.
- Start command: `npm start`.
- Render assigns `PORT` automatically.

## Features in this build

- Dark industrial animated interface.
- English, Uzbek and Russian UI.
- Create room / join by four-character code.
- Up to 8 players per room.
- Server-authoritative lobby and race state using Socket.IO.
- Countdown, typing validation, WPM, accuracy and progress.
- Live leaderboard and finish results.
- Original synthesized UI beeps using Web Audio (no external audio files).
- Health endpoint at `/health`.

## Notes

This is the first playable foundation, not a byte-for-byte copy of another game's proprietary assets or code. The current race uses one fixed passage per language. Persistent accounts, matchmaking, multiple modes, moderation, anti-cheat hardening, and a production database are planned follow-up work. Render's free instances may sleep when idle; use a persistent service for a continuously available game.
