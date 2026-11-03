# Getting media into a pull request (the part that bites)

**Hard rule: media never gets committed to the repository.** No screenshots on the PR branch, no `docs/screenshots/` folders, no "temporary" image commits. Source history is for source. The durable copy of every capture lives in the evidence folder (SKILL.md step 3). This rule comes from the human and overrides any rendering convenience.

GitHub renders images in a PR/issue body through an image proxy (camo) that fetches the source URL **without the viewer's auth**. For a **private repo**, that means there is no URL automation can produce that reliably renders inline: `raw.githubusercontent.com` and `blob/...?raw=true` URLs need auth the proxy doesn't have. GitHub's user-attachments CDN (`user-attachments.githubusercontent.com`) is the only host that always works, and it is populated only by the web editor's upload flow, driven either by a logged-in browser session or by a human drag-drop. There is no token-based API for it.

## The flow that works

1. **Curate and stage.** Keep the curated, ordered set (e.g. `01-before-...png`, `02-after-...png`) in a `pr-curated/` subfolder of the evidence folder (SKILL.md step 3), e.g. `<evidence-folder>/pr-curated/`.
2. **Write the `## Screenshots` section** in the PR body: one caption per shot, written so the section reads sensibly on its own. Fetch the current body first and append to it, so the existing description survives. Always use `--body-file`, never inline `--body`:
   ```bash
   gh pr view <n> --json body --jq .body > body.md
   # append the ## Screenshots section to body.md
   gh pr edit <n> --body-file body.md
   ```
3. **Attach via the web editor.** Two ways, in preference order:
   - **Playwright with a logged-in GitHub session** (fully automated once the human logs github.com in inside the Playwright browser; ask them to if it isn't). Open the PR, kebab menu on the description → "Edit comment", then `setInputFiles` on the edit form's `input[type=file]`. That is the programmatic equivalent of drag-drop, and GitHub performs its own native upload. Gotchas learned the hard way: move the cursor to the END of the textarea before `setInputFiles` or GitHub splices `<img>` tags mid-word into the body; wait until no "Uploading" placeholder remains and the expected number of `user-attachments/assets` URLs are present; GitHub inserts HTML `<img ... alt="<filename>" src=...>` tags (not markdown), so extract by `alt`, strip them, and rebuild the Screenshots section with each URL under its caption; set the textarea through the native value setter + `input` event or the framework ignores the change; verify after saving that every image loads (`img.complete && naturalWidth > 0`, since GitHub rewrites to signed `private-user-images` URLs).
   - **Human drag-drop** of the staged files into the PR description, slotting each under its caption.
4. Optional zero-render fallback if neither is available: leave the captions and the evidence folder path in the section so a reviewer knows the evidence exists and where it lives.

## Video

Video uses the same web-editor upload as images: the Playwright `setInputFiles` route in step 3, or a human drag-drop. Keep the durable copy with the rest of the evidence set. Never claim a video is embedded from the CLI.

## Bottom line

Automation curates, captions, and stages the set. A logged-in browser session or a human drag-drop attaches it. Nothing gets committed.
