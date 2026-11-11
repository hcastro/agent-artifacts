# natural-voice

This skill helps your agent write and edit text the way a person talks. It works from a voice profile: a markdown file of writing rules, each with a one-line definition and a Bad and Better example, followed by a checklist to run before sending. The default profile favors short paragraphs that lead with the point and cuts the patterns that make text read as machine-written.

Use it for anything a person will read, such as texts, emails, letters, posts, cards, and notes.

## Before you begin

The skill needs no setup.

## Install the skill

Follow [Install a skill](../../README.md#install-a-skill) in the repository README, selecting `natural-voice`.

## Use the skill

The skill has three modes. The agent picks one from your request:

- **Write.** The agent drafts in the profile's voice, runs the checklist, and returns the finished text. For example: "Write a thank-you note to my neighbor for watching the dog."
- **Edit.** The agent keeps your meaning, facts, and wording that already passes, and rewrites the rest. For example: "Clean up this email before I send it." To see what changed, ask for a list of changes.
- **Adapt.** The agent builds a new profile from three to five samples of another writer's own text. For example: "Make a voice profile from these letters my dad wrote."

The agent never invents a detail to satisfy a rule. When a rule calls for a name or a number your draft doesn't have, the agent cuts the vague claim or asks you for the fact.

## Voice profiles

The default profile is `references/voice.md`. To use another profile, name it in your request.

Profiles you build with the adapt mode go in `profiles/PROFILE_NAME.md` inside the skill folder, where `PROFILE_NAME` is the name you give it. Git ignores the `profiles/` folder, because profiles quote private writing samples.

## Contents

The skill folder holds the following files:

- `SKILL.md`: the three modes and how the agent chooses a profile.
- `references/voice.md`: the default voice profile and its pre-send checklist.
- `references/adapting.md`: how to gather samples, read them for habits, and write and test a new profile.

## Acknowledgments

The patterns of AI writing in the default profile are condensed from [humanizer](https://github.com/blader/humanizer) by blader.
