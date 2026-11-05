# Diego GG 👑🐐

A dark-mode League of Legends stats tracker with the **Tribunal de la Grieta**: a transparent, role-aware statistical performance review of recent matches with optional playful roasts. Powered by Riot Games API.

## Deployment

1. Import this GitHub repository into Vercel as an **Other** framework project.
2. In Vercel → Project Settings → Environment Variables, create `RIOT_API_KEY` with a **new**, rotated Riot Games API key (never put keys in GitHub).
3. (Optional) Set `DIEGO_ACCESS_CODE` to a **long, private access phrase** if you want to restrict Riot queries to friends who know the code. Without the variable, visitors are not asked for a password.
4. Deploy. The `api/` directory contains Vercel serverless functions, and the root contains static frontend assets.

This is an independent project, not endorsed by Riot Games. Performance verdicts are estimates, not proof of intent or sole blame.

## Private community

For a 10–15 person group, apply for a **Personal API Key** as a private project. Riot does not permit public consumption with a personal key, including open betas. **Without `DIEGO_ACCESS_CODE` the deployed site and Riot-proxy endpoints can be accessed by anyone who learns the URL**, even if you only send the link to friends. A small intended audience does not make an unprotected URL private; ensure your deployment/access and Riot key tier match Riot's policies. If making it openly accessible, apply for a Production Key. Always rotate exposed Riot keys before production. When configured, the optional group code is checked server-side using timing-safe comparison; the browser retains it for the current session.

## Endpoints

- `GET /api/status` readiness (no secrets)
- `GET /api/player?region=LA1&name=Name&tag=TAG` account and ranked stats
- `GET /api/history?region=LA1&puuid=...&start=0&count=6` Match-V5 history and all ten players

`/api/player` and `/api/history` only require the `x-diego-access-code` request header when `DIEGO_ACCESS_CODE` is configured. Without it, searches work without a password.

## Scoring

The performance score (12–99) is an independently designed heuristic based on KDA context, team kill participation, damage share, farm and support vision; Jungle objectives get credit where available. It is **not** a probability of causing a defeat or an assessment of intentional misconduct. When several losing players fall below the threshold, the Tribunal marks shared responsibility. Unsupported modes receive no verdict. Only recent retrieved matches are summarized; the sample size is visible.

## Run tests

`npm test` (Node 20+). Live Riot requests need environment variables; demo data loads without them.

© Riot Games game content and names belong to their respective owners. This product is not endorsed by Riot Games.

## UX updates

- Savage Mode starts ON; visitors can toggle it from the header.
- Ranked cards use Riot Games' in-game ranked emblems via CommunityDragon's documented asset mirror. Supported tiers: Iron, Bronze, Silver, Gold, Platinum, Emerald, Diamond, Master, Grandmaster and Challenger.
- Autocomplete suggests players from **this browser's previously searched accounts and real retrieved match participants** (stored in localStorage). The Riot API cannot search all accounts by partially typed name, so this does not pretend to provide global autocomplete. The dropdown supports arrow keys, Enter, and mouse click.
- For crisp hero branding, upload the provided 1024px `diego-logo-hd.webp` to `assets/diego-logo-hd.webp`. Until then, the site gracefully falls back to its original logo.
