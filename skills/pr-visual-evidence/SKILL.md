---
name: pr-visual-evidence
description: >-
  Capture reviewer-facing visual evidence (screenshots, and short video where the host
  allows) of a user-facing change and attach it to a pull request, so reviewers see the
  actual before/after and end-to-end flow instead of inferring from the diff. Use when
  opening or updating a PR for a user-facing change (UI, feed, composer, navigation, native
  app behavior), or on requests like "add screenshots/video to the PR", "show what this
  looks like", "get visual evidence", "prove the fix on device". Captures on a connected
  Android device (and web via Playwright), delegates recording and frame analysis to the
  ui-recording-verification skill, saves a durable copy to the knowledge base, and embeds or
  links the media in the PR. Pairs with the pull-request skill, which invokes it for
  user-facing changes.
---

# PR Visual Evidence

A reviewer trusts what they can see. For any user-facing change, attach visual proof so the reviewer reads the result, not just the diff. This skill decides what to shoot, captures it, curates it, and gets it into the PR, and is honest about what a host like GitHub will and won't render.

The recording mechanics live in the **ui-recording-verification** skill; this skill owns *what to shoot for a reviewer*, *curation*, and *getting it into the PR*.

## When this runs

This is opt-in, not automatic. The **pull-request** skill *offers* it for a user-facing change and asks the human; run it when they opt in or ask directly ("add screenshots/video", "show what this looks like", "prove it on device"). Worth offering for most user-facing changes, but not every one needs it — a tiny tweak, or a change with no visible surface (pure refactor, infra, types), can skip it. When unsure whether a change is user-facing, ask.

## 1. Decide what to show

Match the artifact to the change:

- **Bug fix** → the symptom **before** and the **after**. Without a before, the fix is unprovable; if a before can't be captured (already merged, hard to reproduce), say so.
- **New feature or capability** → the **end-to-end flow**, and for a change that spans surfaces, **one shot per surface** (e.g. composer preview, then level-1, then level-2, then the resulting screen). Mirror the surfaces the diff touches.
- **Motion or timing** (jank, transitions, async appearance, layout shift, keyboard) → **video**, not a screenshot. A still can't show timing.
- **Static result** (a card renders, a label is right, a row looks correct) → **screenshots**, which are cheaper to review and the only thing reliably embeddable (see below).

Use one **consistent, realistic example input** across every shot (a specific URL, a specific account). If the input is visible and could matter to the reviewer, confirm it with the requester rather than guessing.

## 2. Capture

Prerequisites: the app pointed at the backend that has the change (the local stack when validating local work), the device unlocked and attached, the build current.

- **Video or frame-by-frame**: use the **ui-recording-verification** skill (`adb screenrecord` on Android, Playwright video on web). That skill also covers analyzing the recording to confirm the behavior is real.
- **Android screenshots**: `scripts/capture.sh <device-serial> <out.png>` (a thin `screencap` plus `pull`). Frame with scroll or swipe so the relevant element sits cleanly in view.
- **Wait out async UI before capturing.** Debounced previews, lazy images, and server enrichment land after a delay; capture after they settle or the shot shows a half-rendered state. A debounced link preview, for example, needs about a second after the last keystroke.
- Drive the UI with the device-control tools (element listing plus tap/type) rather than guessing pixel coordinates where possible.

## 3. Curate and save to the knowledge base

- One concern per file. Name by order plus surface: `00-feed.png`, `01-composer-preview.png`, `02-comment.png`, so the set reads top to bottom.
- Save to `knowledge-base/<topic>/media/<YYYY-MM-DD>-<slug>/` with a short `README.md` index: a table of `file | surface | what it shows`, the example input used, and the capture context (app, build, backend). This is the durable copy and outlives the PR branch.
- If the knowledge base is qmd-indexed, refresh it after writing (see the qmd skill).

## 4. Put it in the PR

Getting media to actually render for a reviewer is the part that bites. **Read `references/embedding.md` before embedding** — it covers the private-repo rendering trap, the commit-to-branch plus Files-changed floor, and why video can't be embedded from the CLI. The short version:

- Commit the screenshots to the PR branch (for example `docs/screenshots/<TICKET>/`) so they're always viewable in the **Files changed** tab. That is the guaranteed floor.
- Add a `## Screenshots` section to the PR body (via the pull-request skill's `--body-file`) with width-constrained images and a caption per shot.
- Do not promise inline **video** from automation. Record it to the knowledge base and link it, or hand it to a human to drag-drop into the PR.

## Pairing

- **ui-recording-verification** — the capture and frame-analysis engine this skill delegates to.
- **pull-request** — invokes this skill for user-facing changes; this skill produces the `## Screenshots` section it asks for.
- **qmd / knowledge base** — where the durable copy lives.
