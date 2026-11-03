# Reference docs, commands, and examples

Rules for API reference comments, command-line syntax, placeholders, example values, and file names. Each section links its page in the Google developer documentation style guide.

## Contents

- API reference comments
- Command-line syntax
- Command output
- Placeholders
- Example values
- File names
- How a document refers to itself

## API reference comments

Source: https://developers.google.com/style/api-reference-comments

- Describe every public class, interface, constant, field, enum, and method, with each parameter, the return value, and every exception it throws.
- Put every API name in code font, linked to its reference page, and spell class names exactly as in code. Don't pluralize a class name. Add a noun: "`Intent` objects," not "`Intents`."
- Make the first sentence short and unique, because tools extract it as the summary. Don't repeat the class name, don't write "This class...," and don't put a period before the sentence really ends. That's one reason to write "for example," not "e.g."
- Open a class description with its purpose and what the name and signature don't say.
- Open a method description with what it does, in present tense:
  - A method that returns data starts with its verb: "Adds a new bird to the ornithology list and returns the ID of the new entry."
  - A boolean getter starts with "Checks whether..."
  - Another getter starts with "Gets the..."
  - A method with no return value starts with "Sets the...," "Updates the...," "Deletes the...," or "Registers..."
  - A callback starts with "Called by..."
  - A convenience constructor starts with "Creates a..."
- Document required permissions and what happens without them, such as throwing an exception or returning null.
- Parameters: capitalize the first word and end with a period. Start with "The" or "A": "The ID of the bird you want to get." For a boolean that triggers an action, state both outcomes: "If true, validates the SSL certificate before proceeding. If false, trusts the certificate without validating it." For a state boolean, write "True if the zoom is set; false otherwise." Give defaults as "Default: VALUE."
- Return values: keep them brief. Start with "The...": "The bird specified by the given ID." For a boolean, write "True if...; false otherwise."
- Exceptions: start with "If..." where the tool adds "Throws," or "Thrown when..." otherwise: "Thrown when no key is assigned."
- Deprecations: put the replacement in the first sentence, and tell the reader what to do: "Deprecated. Use `CameraPose` instead."

## Command-line syntax

Source: https://developers.google.com/style/code-syntax

- Introduce a command by what it does, and link the command reference from that sentence: "To connect to the instance, use the `gcloud compute ssh` command:"
- Put commands in code blocks. Break lines longer than 80 characters with a continuation character (` \` on Linux and macOS, ` ^` on Windows), and indent continued lines four spaces.
- Keep a command that the reader copies runnable as copied. Leave out `[]`, `{}`, `|`, and `...`, and give an optional flag its own sentence and code block instead: "If you're importing an image with an existing license, specify the `--byol` flag:"
- In syntax descriptions, put each optional argument in square brackets (`[FILENAME]`), mutually exclusive choices in braces with pipes (`{FILE_1|FILE_2}`), and repeatable arguments with three dots (`[FLAG ...]`).
- Use as few optional arguments as possible outside reference pages.
- Don't show the current directory before the prompt. If a page mixes one-line and multi-line commands, start every command line with `$`.
- Describe what the whole command does instead of naming its parts. Call the contents "commands," and their parts "flags" or "options."

## Command output

Source: https://developers.google.com/style/code-syntax#output

- Show output only when it helps, such as when the reader must copy or check a value.
- Put input and output in separate code blocks.
- Introduce output with "The output is similar to the following:" and you can add what to look for: "...in which the `IP` column shows the IP address for each resource:"
- Mark omitted output lines with `...` on a line of its own, never the `…` character.

## Placeholders

Source: https://developers.google.com/style/placeholders

- Write placeholders in uppercase with underscores: `PROJECT_ID`, `API_NAME`. Not `api-name`, `apiName`, or `x`.
- Don't put possessives in placeholders: `API_NAME`, not `YOUR_API_NAME` or `MY_API_NAME`.
- In Markdown running text, write an inline placeholder as `` *`PLACEHOLDER_NAME`* ``. In a fenced code block, write it plainly, because fences can't hold formatting.
- Explain every placeholder the first time it appears, even if its meaning seems obvious.
  - For one placeholder: "Replace `BUILD_ID` with the ID of the build that you copied in the preceding step."
  - For two or more, write "Replace the following:" and then one item per placeholder, in the order they appear: "`ZONE`: a zone that's close to your location, such as `us-east1`." Start each description with a lowercase letter.
- For placeholders in output, introduce the list with "This output includes the following values:"

## Example values

Source: https://developers.google.com/style/examples

- Never use real domains, email addresses, names, or phone numbers.
- Domains: `example.com`, `example.org`, or `example.net`. Email: a listed name at one of them, such as `dana@example.com`.
- People: use names from the guide's list, such as Alex, Amal, Bola, Dana, Hao, Kiran, Noam, Quinn, Sasha, and Yuri, with an initial for a surname ("Quinn N."). Use *they* as the pronoun. Don't use Alice and Bob unless a spec does.
- Companies: "Example Organization."
- Phone numbers: 800-555-0100 through 800-555-0199.
- IP addresses: `192.0.2.0/24`, `198.51.100.0/24`, or `203.0.113.0/24` for IPv4, and `2001:db8::/32` for IPv6.
- Projects: meaningful names such as `staging` or `production-1`, never `foo` or `bar`.

## File names

Source: https://developers.google.com/style/filenames

- Name files and folders in lowercase ASCII, with hyphens between words: `query-data.html`. Follow an existing folder's convention if it differs.
- Refer to a file in code font, with the word *file* after it: "the `build.sh` file."
- Name a file type by its name, not its extension: "a PNG file," not "a `.png` file."
- Don't use a file type as a verb: "Extract a zip file," not "Unzip a zip file."

## How a document refers to itself

Sources: https://developers.google.com/style/word-list#documentation and https://developers.google.com/style/anthropomorphism

- Call it "this document," not "this article," "this page," or "this topic." "This tutorial" and "this quickstart" are fine for those doc types.
- Open a document with what it covers: "This document provides a high-level overview of ways to transfer your data to Google Cloud."
- Point within the document with *earlier*, *preceding*, *later*, and *following*, never *above* or *below*.
- Don't give software human qualities.
  - Do: "The PC detects a new device."
  - Don't: "The PC sees a new device."
