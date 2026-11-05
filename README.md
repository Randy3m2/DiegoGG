# Diego GG 👑🐐

A dark-mode League of Legends stats tracker with the **Tribunal de la Grieta**: a transparent, role-aware statistical performance review of recent matches with optional playful roasts. Powered by Riot Games API.

## Deployment

1. Import this GitHub repository into Vercel as an **Other** framework project.
2. In Vercel → Project Settings → Environment Variables, create `RIOT_API_KEY` with a **new**, rotated Riot Games API key (never put keys in GitHub).
3. Also set `DIEGO_ACCESS_CODE` to a **long, private access phrase** and share it only with your invited friends. Every visitor is prompted for it before Riot queries.
4. Deploy. The `api/` directory contains Vercel serverless functions, and the root contains static frontend assets.

This is an independent project, not endorsed by Riot Games. Performance verdicts are estimates, not proof of intent or sole blame.

## Private community

For a 10–15 person group, apply for a **Personal API Key** as a private project. Riot does not permit public consumption with a personal key. Share the Vercel URL and private invite code only with the small group, and rotate any exposed Riot keys before production. The group code is checked server-side using timing-safe comparison; the browser retains it for the current session.

## Endpoints

- `GET /api/status` readiness (no secrets)
- `GET /api/player?region=LA1&name=Name&tag=TAG` account and ranked stats
- `GET /api/history?region=LA1&puuid=...&start=0&count=6` Match-V5 history and all ten players

`/api/player` and `/api/history` require a `x-diego-access-code` request header. The browser prompts for the code when needed.

## Scoring

The performance score (12–99) is an independently designed heuristic based on KDA context, team kill participation, damage share, farm and support vision; Jungle objectives get credit where available. It is **not** a probability of causing a defeat or an assessment of intentional misconduct. When several losing players fall below the threshold, the Tribunal marks shared responsibility. Unsupported modes receive no verdict. Only recent retrieved matches are summarized; the sample size is visible.

## Run tests

`npm test` (Node 20+). Live Riot requests need environment variables; demo data loads without them.

© Riot Games game content and names belong to their respective owners. This product is not endorsed by Riot Games.
