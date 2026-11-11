# The structure pass

Give this file to the agent that rewrites the sample, with the reader, the checks and the draft. A voice pass comes after it.

## What the pass may change

- **Order.** Tell what happens in the order a person would tell it. Put the verdict first in an answer, a summary or a conclusion.
- **Load.** Split a sentence that carries two ideas. Aim for one idea and at most two technical names per sentence.
- **Names.** Describe a thing in plain words and give its identifier once, where the reader needs it to find the thing. When the reader can see the code, the figure or the table, point at it ("the script shown") and leave the identifier out.
- **Length.** A part may grow by up to 60% when the extra words make it easier to follow. Shorten where the draft repeats itself.
- **Consequence.** After the mechanism, say what the reader sees, loses or has to do. Use only what the draft states or directly implies.
- **Ending.** Close on the action the draft already recommends. Do not add a closing line that restates the point.
- **Paragraphs.** Break any block that runs past four sentences, when the place the text is shown renders paragraphs. A rewrite that splits packed sentences makes more of them, and one long block reads worse than the dense original.

## What must hold

- No new facts, numbers, names, times or stakes. A livelier scene is not a reason to invent one.
- An opening verdict says only what the draft says. "Neither check tells you much" is a new judgment when the draft says one check proves a little and the other proves nothing.
- Every claim in the draft survives. Reword and reorder a claim. Do not drop one.
- Quoted speech stays as written.
- A part that holds something back keeps holding it back. Hints, primers, teasers and wrong options say nothing they did not say before.
- Parallel items stay parallel. In a list of options, no item stands out by length or tone.
- An identifier that is kept is kept character for character. None is added.
- The writer's style rules apply to every sentence.

## Patterns a livelier rewrite invites

Check the result for these before the voice pass:

- a run of short sentences written for drama
- a one-line closer that repeats the point
- a question or a colon that holds the point back
- "X, not Y" frames
- an adjective that asserts something the draft did not ("careful", "quietly", "simply")

## Example

Draft:

> The cache key includes the user id, so entries are per user and a shared entry is never served. Eviction is LRU with a 10 minute TTL, so a stale entry lives at most 10 minutes. `refresh_cache` is called on write, so the writer sees new data at once and others wait for expiry.

After the structure pass:

> Nobody is ever served another person's entry, because the cache key includes the user id. A stale entry lives 10 minutes at most: eviction is least-recently-used with a 10 minute time limit. The person who made the change sees it at once, since a write calls `refresh_cache`. Everyone else keeps the old data until their entry expires.

The claims are the same four. The verdict leads, each sentence carries one idea, and the last sentence says what the other users experience.
