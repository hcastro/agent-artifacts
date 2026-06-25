# Getting media into a pull request (the part that bites)

GitHub renders images in a PR/issue body through an image proxy (camo) that fetches the source URL **without the viewer's auth**. For a **private repo**, a `raw.githubusercontent.com` or `blob/...?raw=true` URL to the repo's own files is not guaranteed to render inline, because the proxy can't authenticate. Plan for that instead of being surprised by broken-image icons.

## Reliable options, in order

1. **Commit the screenshots to the PR branch.** Put them somewhere tidy, e.g. `docs/screenshots/<TICKET>/`, and push. GitHub renders added image files in the **Files changed** tab regardless of repo visibility. This is the guaranteed floor: even if nothing renders in the body, the reviewer can see every shot in Files changed.
   - Verify they're served after pushing: `gh api "repos/<owner>/<repo>/contents/docs/screenshots/<TICKET>?ref=<branch>" --jq '.[].name'`.

2. **Embed in the body** with width-constrained tags so tall phone screenshots don't dominate, and a caption per shot:
   ```html
   **Compose-time preview**
   <img src="https://github.com/<owner>/<repo>/blob/<branch>/docs/screenshots/<TICKET>/01-composer.png?raw=true" width="270">
   ```
   Same-repo embeds often do render for authenticated collaborators; when they don't (private-repo proxy), the captions still read and the Files-changed copies cover it. Always write the section so it makes sense even if the images don't load.

3. **Clickable links** as the safe fallback if you want zero chance of broken-image icons: link each shot (`[Level-1 comment](<blob-url>)`) instead of embedding. One click, always works.

## Video

GitHub does **not** accept video via committed-file URLs or the CLI. Inline video in a PR only works when a human drags the file into the web editor, which uploads it to GitHub's user-attachments CDN (`user-attachments.githubusercontent.com`) — a session-authenticated flow with no token-based API. So:

- Record video to the knowledge base and **link** to it, or
- Hand the file to a human to drag-drop into the PR.
- Do not claim "video embedded in the PR" from automation. Be explicit about this limit when video is requested.

## Mechanics

- Append the `## Screenshots` section with the pull-request skill's `--body-file` (never inline `--body` for multi-line). Fetch the current body first so you append rather than overwrite:
  ```bash
  gh pr view <n> --json body --jq .body > body.md
  # append the Screenshots section to body.md
  gh pr edit <n> --body-file body.md
  ```
- Keep the set tight: the key surfaces, not every frame. Width ~270 for phone screenshots.
- Same-repo blob URLs need the branch ref; the branch tip is fine for an open PR.

## Bottom line

Screenshots: commit-to-branch (floor) + body embed (best effort) + captions. Video: KB + link or human drag-drop. Tell the requester which they're getting.
