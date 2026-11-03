---
name: capture-pr-evidence
description: >-
  Captures reviewer-facing screenshots and short video of a user-facing change and
  attaches them to a pull request, so reviewers see the before and after of a fix or the
  end-to-end flow of a feature. Use when opening or updating a PR for a UI or native app
  change, or on requests such as "add screenshots or video to the PR", "show what this
  looks like", "get visual evidence", or "prove the fix on device". Covers Android
  devices through adb and web through Playwright, keeps a durable copy outside the
  repository, and never commits media to the repository.
---

# Capture PR evidence

A reviewer trusts what they can see. For any user-facing change, attach visual proof so the reviewer reads the result, not just the diff. This skill decides what to shoot, captures it, curates it, and gets it into the PR, and is honest about what a host like GitHub will and won't render.

This skill owns what to shoot for a reviewer, how to curate it, and how to get it into the PR.

## When this runs

Run only when the user opts in or asks. Skip changes with no visible surface, such as refactors, infra, or type-only changes. If you can't tell whether a change is user-facing, ask.

## Requirements

- `adb` (Android platform-tools) and a device listed by `adb devices`, for Android capture
- Playwright (the library or an MCP server), for web capture and for the PR upload in `references/embedding.md`
- `gh`, authenticated (`gh auth status`), for reading and editing the PR body
- For automated upload, a github.com session signed in inside the Playwright browser

## 1. Decide what to show

Match the artifact to the change:

- **Bug fix** → the symptom **before** and the **after**. Without a before, the fix is unprovable; if a before can't be captured (already merged, hard to reproduce), say so.
- **New feature or capability** → the **end-to-end flow**, and for a change that spans surfaces, **one shot per surface** (for example the form, then the confirmation screen, then the updated list). Mirror the surfaces the diff touches.
- **Motion or timing** (jank, transitions, async appearance, layout shift, keyboard) → **video**, not a screenshot. A still can't show timing.
- **Static result** (a card renders, a label is right, a row looks correct) → **screenshots**, which are cheaper to review and the only thing reliably embeddable (see below).

Use one **consistent, realistic example input** across every shot (a specific URL, a specific account). If the input is visible and could matter to the reviewer, confirm it with the requester rather than guessing.

## 2. Capture

Prerequisites: the app pointed at the backend that has the change (the local stack when validating local work), the device unlocked and attached, the build current.

- **Video or frame-by-frame**: on Android, run `adb -s SERIAL shell screenrecord --time-limit 30 /sdcard/evidence.mp4`, then `adb -s SERIAL pull /sdcard/evidence.mp4`. On web, use Playwright's `recordVideo` context option. If the `ui-recording-verification` skill is installed, use it instead, since it also analyzes the frames to confirm the behavior.
- **Android screenshots**: `scripts/capture.sh <device-serial> <out.png>` (runs `adb exec-out screencap` and checks the result is a PNG). Frame with scroll or swipe so the relevant element sits cleanly in view.
- **Wait out async UI before capturing.** Debounced previews, lazy images, and server enrichment land after a delay; capture after they settle or the shot shows a half-rendered state. A debounced link preview, for example, needs about a second after the last keystroke.
- Drive the UI by element where you can. Run `adb -s SERIAL shell uiautomator dump /sdcard/ui.xml`, pull it, and read element bounds from it, then use `adb -s SERIAL shell input tap X Y` and `adb -s SERIAL shell input text`. If a mobile MCP server is connected, use its element-listing and tap tools by their fully qualified `Server:tool` names.

## 3. Curate and save a durable copy

- One concern per file. Name by order plus surface: `00-list.png`, `01-form.png`, `02-confirmation.png`, so the set reads top to bottom.
- **Crop to the element that proves the point.** A full desktop viewport (sidebars, nav) or a full phone frame (status bar, gesture bar) buries the evidence and wrecks PR layout; crop web shots to the relevant card or form and trim phone chrome. Keep full-frame originals in the evidence folder described below; attach the crops.
- **Lay the PR set out as small tables** (e.g. a 3-column before row and a 3-column after row with a header caption per cell). Mixed aspect ratios stacked as loose `<img>` paragraphs render with huge gaps; table cells scale and align them.
- Save the set to the project's knowledge base if it has one, at `knowledge-base/<topic>/media/<YYYY-MM-DD>-<slug>/`. Otherwise use a folder outside the repository, such as `~/pr-evidence/<repo>/<pr-number>/`. Add a short `README.md` index: a table of `file | surface | what it shows`, the example input used, and the capture context (app, build, backend). This is the durable copy and outlives the PR branch.
- If the knowledge base is indexed by qmd, refresh it after writing (the `qmd-memory` skill in this repo covers how).

## 4. Put it in the PR

**NEVER commit screenshots (or any media) to the repository.** Not to the PR branch, not to a `docs/screenshots/` folder, not "temporarily". Media does not belong in source history; the durable copy lives in the evidence folder from step 3. This is a hard rule from the human. Do not trade it away for rendering convenience.

Getting media to render for a reviewer without committing it: **read `references/embedding.md`** for the details. The short version:

- Add a `## Screenshots` section to the PR body with a caption per shot describing what the reviewer will see. Fetch the current body first (`gh pr view <n> --json body --jq .body > body.md`), append the section to `body.md`, then run `gh pr edit <n> --body-file body.md`. Writing only the new section to `body.md` overwrites the existing description.
- The images reach the PR through GitHub's user-attachments CDN, which only the web editor's upload flow can populate (no token API). Preferred path: drive the editor with **Playwright using a logged-in GitHub session**. `setInputFiles` on the edit form's file input is the programmatic drag-drop (full recipe and gotchas in `references/embedding.md`). Fallback: stage the curated set in the evidence folder from step 3 and ask the human to drag the files in.
- **Video** uses the same web-editor upload, which is the only route. Keep the durable copy in the evidence folder, then upload through the browser session or a human drag-drop. Never claim it's embedded from a CLI.

## Pairing

- `ui-recording-verification` (optional, not in this repo): records video and analyzes frames.
- `pull-request` (optional, not in this repo): offers this skill for user-facing changes and consumes the `## Screenshots` section.
- `qmd-memory` (in this repo): where the durable copy can live.
