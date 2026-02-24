# Hop YouTube Sync Workflow

This app uses generated local data at `public/apps/hop/data/artists.generated.json`.

## Local development

- Sync all artists and update cache/output:
  - `npm run hop:sync:all`
- After sync, refresh the app page once to load fresh `artists.generated.json`.
- Sync one artist with direct channel override:
  - `npm run hop:sync -- --artist misho --channel "https://www.youtube.com/@..."`
- Dry-run check (no write):
  - `npm run hop:sync:check`
- Strict check (fails on validation warnings/errors and yt-dlp version mismatch):
  - `npm run hop:sync:check:strict`

## CI-ready checks

Use this command in CI to validate dataset shape without mutating files:

- `npm run hop:sync:check:strict`

Optional gated sync job (if CI runner has `yt-dlp`):

1. `npm run hop:sync:strict`
2. `git diff --exit-code public/apps/hop/data/artists.generated.json`

## Stability controls

- `yt-dlp` expected version is pinned in `apps/hop/config/artists.sources.json` via `ytDlpVersion`.
- Strict commands enforce exact version via `--strict-ytdlp-version`.
- Recommended sync cadence is weekly (`syncCadenceDays: 7`).

## Failure behavior

- If `yt-dlp` fetch fails, script exits non-zero and does not overwrite generated data.
- If strict validation/version checks fail, script exits non-zero before write.
- Last successful `artists.generated.json` stays usable by app as fallback.
