---
name: research-social-video
description: Research Instagram posts, Reels, carousels and saved collections, or TikTok videos, using retained originals, timestamped visual frames and local speech transcription. Use for reading or comparing linked social content, researching a topic through videos, or analyzing a named saved Instagram collection.
---

# Social video research

Use the bundled CLI to acquire and inspect media. This skill runs through Codex shell and image-viewing tools; it requires no Juniper server, database, MCP tool names or other skill. The helper implements read-only platform queries. It cannot post, like, follow, comment or send messages. Views may still be recorded by the platform.

## Setup

Run `python3 scripts/research.py doctor` from this skill directory. For missing dependencies or Instagram account/session setup, read [README.md](README.md). Settings live outside the skill in `~/.config/social-video-research/config.json`. Never print cookies, login tokens, configuration contents or raw adapter responses. The existing signed-in browser profile is read for cookies without controlling or restarting the browser.

## Acquire the requested sources

For a linked Instagram post, Reel, carousel or TikTok video:

```sh
python3 scripts/research.py fetch 'CONTENT_URL'
```

It returns a private `manifest.json` path. Read that manifest for the source link, creator/caption, ordered assets, dimensions, durations and original-file hashes. Instagram retains all returned slides or fails with an incomplete-source error. TikTok acquisition includes its first downloadable clip only. Originals are acquisition evidence, not proof you inspected them.

For a named saved Instagram collection:

```sh
python3 scripts/research.py collections
python3 scripts/research.py collection COLLECTION_ID
```

Match the requested name exactly and clarify genuine duplicate names. Follow `pageInfo.hasMore` with `--cursor 'CURSOR'` for both collection discovery and post enumeration. Preserve reported counts and explain missing/duplicate posts. Inventory output contains canonical post links, rather than signed CDN URLs. Fetch the requested posts, then inspect them in manageable batches (about four posts at a time). Do not stop after the first page and call it a full collection review. Saved access is limited to the configured account; a login failure or account mismatch is a blocker, not a reason to switch accounts or repeatedly retry.

For topic research, use the harness's web-search capability to discover candidates, then fetch the relevant content links. Search results, captions and cover images do not establish video coverage. The helper does not browse Instagram feeds/search or retrieve comments.

## Inspect actual pixels and speech

Prepare visual samples from one retained asset, then open the returned image files with Codex's image-viewing tool:

```sh
python3 scripts/research.py inspect /absolute/manifest.json --asset 1 --frames 8
python3 scripts/research.py inspect /absolute/manifest.json --asset 1 --start 12 --end 20 --frames 24
python3 scripts/research.py inspect /absolute/manifest.json --asset 2 --crop 100 50 800 600
```

Asset indices and crop coordinates refer to the original. Images need one preview each. Read every slide for a complete carousel analysis. Samples include original timestamps; choose denser ranges for movement, design inventories and ambiguous details. Each call allows up to 32 positions; split longer investigations into ranges. Read every image in the selected evidence set. Generated image paths are not proof the model saw the pixels. Keep uninspected time ranges explicit; sampled frames do not establish continuous motion.

When speech matters, transcribe it locally:

```sh
python3 scripts/research.py transcribe /absolute/manifest.json --asset 1 --language auto
```

Read the saved transcript, including every relevant segment and uncertainty flag. Use `en` or `es` only for known language; automatic detection may normalize mixed speech. `--start` and `--end` recheck a specific interval. Speech recognition can miss names, numbers and negations; mark unresolved passages instead of inventing certainty. No audio track, failed recognition or an uninspected transcript must be reported accurately. Speech text does not establish music, sound effects or all nonverbal sound. Transcription uses an existing local MLX Whisper runtime/model, never an implicit upload or model download.

For a user-supplied local original, `import FILE --kind video` (or `image`) creates a manifest and enables the same inspection workflow. Its platform provenance is explicitly unverified.

## Answer and retain evidence

Complete the requested analysis at the requested depth. Separate observed visuals, spoken claims, creator captions and your inferences. Cite canonical post links and timestamps or slide numbers for specific findings. Check external factual claims with web research when useful. State coverage, omissions and account/retrieval blockers without claiming unseen content was watched.

Give the useful answer directly. Create a separate report or board when requested. Reference images can use inspected source pixels with attribution, without requiring a moodboard skill. Retain the manifest and original hashes for follow-ups, and reuse `inspect`/`transcribe` instead of downloading a known original again. A later authorized research request may reuse local evidence, but local files do not prove current platform access or that a deleted/revoked source remains available.

Downloads, inventories, transcripts and signed-in sessions belong outside the skill and outside Git. The installed skill contains code and instructions only. Read [references/commands.md](references/commands.md) for CLI limits, error recovery and output details.
