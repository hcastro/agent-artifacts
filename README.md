# Agent artifacts

Agent skills for Claude Code and Codex. Each skill is a folder with a `SKILL.md` file that tells the agent what the skill does and when to use it, plus optional scripts, reference files, and templates.

## Skills

The following table lists each skill in this repository and what it needs before you use it:

| Skill | What it does | Setup |
|-------|--------------|-------|
| [`capture-pr-evidence`](skills/capture-pr-evidence) | Captures screenshots and short video of a user-facing change and attaches them to a pull request. Keeps a durable copy outside the repository and never commits media. | Install `adb` for Android and Playwright for web, and authenticate `gh`. Optional: sign in to github.com in the Playwright browser for automated upload. Works with the optional `ui-recording-verification` and `pull-request` skills, which aren't in this repository. |
| [`developer-docs-style`](skills/developer-docs-style) | Writes, edits, and reviews developer documentation in the style of the Google developer documentation style guide, with core rules, a review format, and references for voice, structure, punctuation, reference docs, images, and word choice. | None. |
| [`evernote`](skills/evernote) | Searches, reads, creates, and updates Evernote notes and tags with bundled TypeScript scripts, converts markdown to ENML, and appends to named note sections. | Node.js 18 or later. Run `npm install` in the skill folder, export `EVERNOTE_TOKEN` (an OAuth token from a full-access API key, or a developer token you already have), then run `npx tsx scripts/auth-verify.ts`. |
| [`jira`](skills/jira) | Queries and updates Jira Cloud tickets. Uses `acli` for JQL searches, views, transitions, and assignment, and REST API v3 with ADF for rich-text descriptions, comments, and custom fields such as story points. Asks before any write. | Install `acli` (`brew tap atlassian/homebrew-acli && brew install acli`) and export `JIRA_EMAIL`, `JIRA_API_TOKEN`, and `JIRA_BASE_URL` in your shell profile. Optional: say "configure jira" to write a `.jira-config.json` file with your field and board IDs. |
| [`lastpass`](skills/lastpass) | Searches, reads, generates, creates, updates, moves, and exports LastPass vault entries through `lpass`, with rules that keep passwords out of the transcript. | Install `lastpass-cli` and sign in with `lpass login EMAIL`, where `EMAIL` is your LastPass account email. |
| [`natural-voice`](skills/natural-voice) | Writes and edits text the way a person talks, from a voice profile with defined rules and Bad/Better examples, and builds new profiles from another writer's samples. | None. Profiles you build go in `profiles/`, which git ignores. |
| [`presenter-deck`](skills/presenter-deck) | Turns HTML slides into a presentable page with a presenter view, speaker notes, a timer, and a synced audience window. | Python 3. For `check_deck.mjs`, Node.js with Playwright and Chromium (`npm i -g playwright && npx playwright install chromium`). |
| [`qmd-memory`](skills/qmd-memory) | Retrieves project memory from a qmd-indexed markdown knowledge base before broad grep, condenses it into a short context pack, and writes discoveries back with dated frontmatter and a dry-run index refresh. In beta. | Install qmd (`npm install -g @tobilu/qmd`) and export `QMD_KB_PATH`. From your project root, run `bash ~/.claude/skills/qmd-memory/scripts/qmd-memory.sh setup`, review the commands it prints, then run it again with `--apply`. |
| [`read-long-screenshot`](skills/read-long-screenshot) | Reads a full-page or scrolling screenshot at full detail by slicing it into overlapping tiles that stay inside Claude's vision limits. | Python 3 with Pillow (`python3 -m pip install pillow`), or `sips` on macOS. |
| [`research-social-video`](skills/research-social-video) | Researches Instagram posts, Reels, ordered carousels and saved collections with originals, timestamped frames and local speech transcription. Includes a TikTok download path. Runs through Codex shell and image-viewing tools without Juniper. | Python 3.11+, FFmpeg, yt-dlp, and a signed-in research browser profile for Instagram. Optional MLX Whisper runtime and local model for speech on Apple Silicon. |
| [`run-design-tournament`](skills/run-design-tournament) | Runs a blind, multi-round tournament between design directions, with rubric scoring by lens judges, a code tally, and owner checkpoints. | Claude Code with the Workflow tool, or subagents as a fallback. Headless Chrome or Playwright for renders. |
| [`strategic-code-design`](skills/strategic-code-design) | Reviews and shapes code design for low complexity with deep modules, information hiding, simple error models, and a severity rubric for reviews. | None. The optional scanner needs Python 3.8 or later and uses only the standard library. |
| [`write-implementation-plan`](skills/write-implementation-plan) | Writes a self-contained HTML plan with real code excerpts, diffs, Mermaid diagrams, and a step checklist before coding starts. | None. The page loads fonts, highlight.js 11.9.0, and Mermaid 11.4.1 from CDNs. |

Each skill's folder has a `README.md` with setup and usage in more detail. To open it, click the skill's name in the table.

## Install a skill

Claude Code loads personal skills from `~/.claude/skills/` and project skills from `.claude/skills/` in a repository. To install a skill for your user account, follow these steps:

1. Clone this repository:

   ```bash
   git clone https://github.com/hcastro/agent-artifacts.git
   ```

2. Link the skill into your skills folder, so that `git pull` keeps it current:

   ```bash
   mkdir -p ~/.claude/skills
   ln -s "$PWD/agent-artifacts/skills/SKILL_NAME" ~/.claude/skills/SKILL_NAME
   ```

   Replace `SKILL_NAME` with a folder name from the table in the [Skills](#skills) section.

3. Complete the setup listed in the skill's row of the table.
4. Start a new Claude Code session. Claude loads the skill when a request matches its description. To run it directly, type `/SKILL_NAME`.

To share a skill with everyone who works in a project, put it in that project's `.claude/skills/` folder instead of `~/.claude/skills/`.

## Install in Codex

Codex user skills live in `~/.codex/skills/`. From this repository root, link a skill into that directory:

```bash
mkdir -p ~/.codex/skills
ln -s "$PWD/skills/SKILL_NAME" ~/.codex/skills/SKILL_NAME
```

Inspect an existing destination before replacing it. Complete the skill's setup and use it on the next Codex turn. Some older skills assume Claude-specific tools; check their requirements before installing them in Codex. `research-social-video` bundles its executable helpers for Codex.

## Repository layout

The repository has the following structure:

```
agent-artifacts/
├── README.md          # This document
├── skills/            # One folder per skill
│   ├── README.md      # Points back to this document
│   └── SKILL_NAME/
│       ├── SKILL.md   # Frontmatter and instructions for the agent
│       ├── README.md  # Setup and usage for people
│       ├── scripts/   # Code the agent runs
│       ├── references/
│       ├── assets/
│       └── evals/     # Test prompts and expected behavior
├── CONTRIBUTING.md    # Conventions for adding a skill
└── LICENSE
```

Each skill folder holds only the parts it uses.

## Add a skill

To add a skill, see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

This repository uses the MIT License. For details, see [LICENSE](LICENSE).

## Acknowledgments

- [Anthropic skills](https://github.com/anthropics/skills): the skill-creator template and skill patterns.
- [Evernote JavaScript SDK](https://github.com/evernote/evernote-sdk-js): used by the `evernote` skill.
- [Google developer documentation style guide](https://developers.google.com/style): the source of the rules in the `developer-docs-style` skill.
- [humanizer](https://github.com/blader/humanizer) by blader: the source of the AI-writing patterns condensed in the `natural-voice` skill.
- [qmd](https://github.com/tobi/qmd): the markdown search engine behind the `qmd-memory` skill.
