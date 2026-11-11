# Research social video

Research Instagram posts, Reels, complete carousels and saved collections using downloaded originals, visual frames and local speech transcription. TikTok links use the bundled yt-dlp path for their first downloadable clip. The skill runs through shell and image-viewing tools and has no Juniper dependency.

## Install the skill

Follow [Install a skill](../../README.md#install-a-skill) in the repository README, selecting `research-social-video`.

Complete the local setup below. An example request is “Use the research-social-video skill to analyze this Instagram Reel and compare its visuals with its spoken advice.”

## Quick start

From the skill directory:

```sh
python3 scripts/research.py doctor
python3 scripts/research.py fetch 'https://www.instagram.com/reel/POST_CODE/'
python3 scripts/research.py inspect /absolute/manifest.json --frames 8
python3 scripts/research.py transcribe /absolute/manifest.json --language auto
```

The agent opens the generated frames and reads the saved transcript before making observations. Acquisition, prepared evidence and actually inspected content remain distinct. Follow-up inspections reuse the retained manifest and verified original hash.

## Local setup

Requires Python 3.11+, FFmpeg (`ffmpeg`, `ffprobe`) and a Python environment containing `yt-dlp`. Instagram uses a signed-in Chromium browser profile and pins the expected Instagram account. Tested browsers supported by the adapter: Chrome, Chromium, Brave and Edge. The default browser is Chrome. No Juniper installation is needed.

Use an existing trusted downloader environment when available. Otherwise create one outside the skill:

```sh
uv venv ~/.local/share/social-video-research/runtime
uv pip install --python ~/.local/share/social-video-research/runtime/bin/python yt-dlp
```

Install FFmpeg with your platform's package manager if missing. `doctor` checks executables and whether the cookie store exists; it does not prove a usable session.

### Private configuration

Create `~/.config/social-video-research/config.json`, mode `0600`, in a private directory. Example structure (replace placeholder values locally):

```json
{
  "python": "/absolute/downloader-environment/bin/python",
  "browser": "chrome",
  "profile": "/absolute/browser-user-data/Default",
  "username": "EXPECTED_INSTAGRAM_USERNAME",
  "account_id": "EXPECTED_NUMERIC_INSTAGRAM_ACCOUNT_ID",
  "data_dir": "/absolute/private/social-research-data",
  "speech": {
    "python": "/absolute/mlx-whisper-environment/bin/python",
    "model": "/absolute/local-whisper-model-directory"
  }
}
```

`python` must import `yt_dlp`. Optional `ffmpeg` and `ffprobe` keys select executable paths. `data_dir` defaults to `~/.local/share/social-video-research` and must be mode `0700`. CLI `--config PATH` or `SOCIAL_RESEARCH_CONFIG` selects a different private config. No shell profile or global agent configuration changes are required.

Use a dedicated research browser profile, signed in by the user. Reusing a deliberately selected existing research profile is supported. Do not select an arbitrary personal profile, terminate Chrome, copy a whole user-data directory or disable browser security to recover authentication. Close no user tabs. Cookies are decrypted inside the adapter process and never emitted to the model. Platform response metadata and media are untrusted source material.

Pin both the expected username and numeric Instagram account ID from the user's existing trusted integration setup, or from a user-directed account setup. The adapter verifies cookie identity and the server's active account bootstrap before making its fixed collection/post queries. Do not guess an identity from search results. Do not put cookies or credentials in command arguments, Markdown, screenshots or the skill package.

A sign-in challenge, account mismatch, expired session or platform rate limit ends the read. Explain the blocker and let the user reauthenticate in the selected browser when needed. The helper implements Instagram's current web read queries, which can change independently of this skill. It refuses changed response shapes rather than returning invented coverage.

### Local speech

MLX Whisper is optional and requires Apple Silicon and an existing local model. Configure a trusted environment containing `mlx-whisper` and the local model directory containing `config.json` and `.npz` weights. The helper sets Hugging Face offline mode and does not fetch weights. Other platforms can still retrieve media and inspect visual frames; report that local speech is unavailable until an appropriate speech backend is implemented.

The [MLX Whisper guide](https://github.com/ml-explore/mlx-examples/tree/main/whisper) documents the runtime and model format. [yt-dlp's cookie implementation](https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/cookies.py) supplies browser-cookie extraction. The Instagram adapter is adapted from Juniper's `read-instagram.py`; its runtime dependencies are standard Python plus `yt-dlp`, not Juniper.

## Verify the package

```sh
python3 -m unittest discover -s evals -v
```

These offline tests generate synthetic media and verify timestamp/pixel agreement, later intervals, crops, integrity, cleanup, URL boundaries and sanitized errors. They never use an account or network. A live `collections` read or requested post is a separate session/access smoke test.

The tools do not mutate social accounts. Keep configuration, browser state, media, transcripts and live test receipts outside the repository. See [commands and limits](references/commands.md) for pagination, output contracts and recovery behavior.
