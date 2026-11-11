# capture-pr-evidence

This skill lets your agent capture screenshots and short video of a user-facing change and attach them to a pull request. Reviewers see the before and after of a bug fix, or the end-to-end flow of a new feature, next to the diff.

The skill keeps a durable copy of every capture outside the repository and never commits media to the repository.

## When to use it

Use the skill when you open or update a pull request for a UI change or a native app change. It covers Android devices through `adb` and web apps through Playwright.

Skip it for changes with no visible surface, such as refactors, infrastructure, or type-only changes.

## Before you begin

The skill needs the following tools:

- `adb` (Android platform-tools) and a device that `adb devices` lists, for Android capture.
- Playwright, as the library or as an MCP server, for web capture and for uploading media to the pull request.
- The GitHub CLI `gh`, signed in. To check, run `gh auth status`.
- For automated upload, a github.com session signed in inside the Playwright browser. Without one, the agent stages the files and asks you to drag them into the pull request.

## Install the skill

Follow [Install a skill](../../README.md#install-a-skill) in the repository README, selecting `capture-pr-evidence`.

## How it works

The agent follows the workflow in [`SKILL.md`](SKILL.md):

1. **Decide what to show.** A bug fix gets a before shot and an after shot. A feature gets one shot per surface it touches. Motion and timing get video.
2. **Capture.** On Android, [`scripts/capture.sh`](scripts/capture.sh) saves one screenshot and fails if the device didn't return a PNG. Video comes from `adb shell screenrecord` on Android and from Playwright's `recordVideo` option on the web.
3. **Curate.** The agent names files in order, crops each shot to the element that proves the point, and saves the full set to an evidence folder outside the repository. That folder is the project's knowledge base if it has one, or a folder such as `~/pr-evidence/REPO/PR_NUMBER/`, where `REPO` is the repository name and `PR_NUMBER` is the pull request number.
4. **Attach.** The agent writes a `## Screenshots` section in the pull request body with one caption per shot. Then it uploads the files through GitHub's web editor in a signed-in Playwright browser, or asks you to drag them in.

GitHub serves private-repo images reliably only from its user-attachments CDN, and only the web editor can upload to it. For the details, see [`references/embedding.md`](references/embedding.md).

The skill never commits screenshots or video to the repository, including to the pull request branch.

## Example requests

The following requests trigger the skill:

- "Add before and after screenshots of the login fix to PR 42."
- "Record the new checkout flow on my Android device and put it in the PR."
- "Show what this settings page change looks like on the web."

## Related skills

- `ui-recording-verification`: Optional. Records video and analyzes frames to confirm the behavior. It isn't in this repo.
- `pull-request`: Optional. Offers this skill for user-facing changes and uses its `## Screenshots` section. It isn't in this repo.
- [`qmd-memory`](../qmd-memory): A knowledge base where the durable copy can live.
