# Structure and formatting

Rules for headings, lists, procedures, tables, notices, code, UI text, links, and dates. Each section links its page in the Google developer documentation style guide.

## Contents

- Headings and titles
- Lists
- Procedures
- Tables
- Notices
- Code in text
- Code samples
- UI elements
- Links and cross-references
- Text formatting
- Dates and times

## Headings and titles

Sources: https://developers.google.com/style/headings and https://developers.google.com/style/capitalization

- Use sentence case: capitalize the first word, the first word after a colon, and proper nouns. Don't end a heading with a period.
- Base the page title on the page's main purpose, and each heading on its section's content.
- Start a task heading with a bare infinitive: "Create an instance," not "Creating an instance."
- Make a conceptual heading a noun phrase: "Migration to Google Cloud," not "Migrating to Google Cloud."
- Avoid an *-ing* word as the first word of any heading, because it translates inconsistently. "Billing" and "Pricing" are fine when nothing better exists.
- Prefix a section that not every reader needs with `Optional:`: "Optional: Customize your alias," not "Customize your alias (optional)."
- Use one `h1` per page, unique across the doc set. Don't skip heading levels, and don't leave a heading with no text under it before the next heading.
- Don't number headings, put links in them, or add code unless a descriptive noun follows the code: "The `--hostname` flag."
- Introduce a group of subsections with "the following sections," not "this section" or "these sections."
- When you refer to another doc's title, use sentence case if that doc follows this guide.

## Lists

Source: https://developers.google.com/style/lists

- Use a numbered list when order matters, a bulleted list when it doesn't, and a description list for terms with definitions. Don't make a list of one item, except a one-step procedure.
- Introduce a list with a complete sentence, not a fragment the items finish.
  - Do: "Use the **Submit** button for any of the following purposes:"
  - Don't: "Use the **Submit** button to:"
- End the introduction with a colon when the list follows it directly, or with a period when other material comes between. Skip it when the heading already says enough.
- Start each item with a capital letter. End it with a period, unless it's a single word, has no verb, or is all code or all link text. If that leaves the list inconsistent, rewrite the items to match.
- Keep items parallel in structure.
- For run-in headings, end the bold heading with a period or a colon, the same way in every item. Never separate the heading from its description with a dash.
- In a series inside a sentence, use the serial comma. Don't end it with *etc.* or *and so on*. Word the introduction so the reader knows the list is partial: "data such as event logs, clickstream data, and e-commerce transactions."

## Procedures

Source: https://developers.google.com/style/procedures

- Put prerequisites before the steps.
- Introduce the steps with a sentence that adds something the heading doesn't. "To customize the buttons, follow these steps:" works. "To customize the buttons:" doesn't.
- Write a one-step procedure as a sentence: "To clear the entire log, click **Clear logcat**."
- Use one action per step, and start each step with an imperative verb. A menu path can share a step: "Click **File > New > Document**."
- Say where before what: "In the Google Cloud console, go to the **Monitoring** page."
- Put the goal before the action: "To start a new document, click **File > New > Document**." If "To..." could make a required step read as optional, write "Start a new document: click **File > New > Document**."
- Put the action first and its result after it, in the same step: "Click **Run**. The query results appear after the query runs."
- Start an optional step with `Optional:`, not "(Optional)."
- Fold "press **Enter**" into the step that needs it, instead of giving it a step of its own.
- Label sub-steps with lowercase letters, and sub-sub-steps with lowercase Roman numerals.
- Order a step that has a command like this:
  1. The action, ending with a colon.
  2. The command.
  3. What each placeholder stands for.
  4. More detail about the command.
  5. "The output is similar to the following:" and the output.
  6. What the output means, in its own paragraph.
- Say what a command does, not "Run the following command:"
  - Do: "Define a firewall rule to allow internal traffic:"
  - Don't: "Run the following command:"
- Give one way to do the task, the one everyone can follow. Leave out keyboard shortcuts and alternative methods.
- Don't repeat a procedure. Link to it.

## Tables

Source: https://developers.google.com/style/tables

- Use a table for three or more related pieces of data per item. Use a list for single items, and a description list for pairs.
- Don't use a table for layout, for one column, for code, or in the middle of a numbered procedure.
- Introduce every table with a complete sentence that says what it shows. Not all screen readers announce tables.
- Use sentence case and no end punctuation in column heads. Use header cells only in the first row and first column, and don't merge cells.
- Refer to a table as "the following table" or "the preceding table." With several tables close together, caption them as "**Table 1.** Description," and refer to them by number.

## Notices

Source: https://developers.google.com/style/notices

- Use a notice only for information outside the flow of the text, and use few of them. Never stack two in a row. If you aren't sure, write it as regular text first.
- Pick the type:
  - **Note:** a useful aside the reader can skip and still succeed.
  - **Caution:** tells the reader to proceed carefully.
  - **Warning:** "Don't do this," or the step is irreversible, or the reader could lose data or money, or open a security hole.
- Never put a prerequisite, a step, a result, or a cross-reference in a note. A prerequisite goes before the step that needs it.
- Use the site's standard notice markup. Without one, write the label in bold: "**Note:** All VPC networks include firewall rules."

## Code in text

Source: https://developers.google.com/style/code-in-text

- Put code font on anything the reader types or the system shows verbatim. That includes commands and CLI tool names, flags, file names and paths, environment variables, method and class names, attribute names and values, data types, HTTP verbs and status codes, IP addresses, port numbers, placeholders, and output.
- Use regular font for product names, domain names, and URLs that the reader opens in a browser. Prefer a link with descriptive text over a visible URL.
- Don't put quotation marks around code unless they're part of the code.
- Don't use a code element as a verb, a plural, or a possessive. Add a noun and inflect the noun.
  - Do: "To add the data, send a `POST` request."
  - Don't: "`POST` the data."
  - Do: "The `ADDRESS` constant's value is defined in the `settings.h` file."
  - Don't: "`ADDRESS`'s value is defined in `settings.h`."
- Write status codes as "an HTTP `400 Bad Request` status code." Call it a status code, not a response code or an error code.
- When a UI element shows text that the reader entered, use bold and code font together: "In the **Network** list, select **`my-net-2`**."

## Code samples

Source: https://developers.google.com/style/code-samples

- Introduce each sample with a sentence. End it with a colon when the sample follows directly: "The following code sample shows how to use the `get` method:"
- Mark omitted code with a comment in the sample's language, never with `...`: `# Several lines of code are omitted here.`
- Wrap lines at 80 characters, and indent the way the language's style guide does, which is usually spaces.
- Follow the language's style guide, unless the project has its own.

## UI elements

Source: https://developers.google.com/style/ui-elements

- Bold every UI element name, and match its on-screen capitalization. If the label is in all caps, use sentence case: "Click **Refresh**," not "Click **REFRESH**."
- Refer to a button by its label, without the word *button* or quotation marks: "Click **OK**."
- Describe the goal when the widget doesn't matter: "Refresh the page."
- Don't use a UI label as a verb.
  - Do: "To save the settings, click **Save**."
  - Don't: "**Save** the settings."
- Write a menu path once in bold, with `>` between the items: "Select **File > New > Document**."
- Use the right preposition: *in* for dialogs, fields, lists, menus, panes, and windows, and *on* for pages, tabs, and toolbars. "On the **Edit** tab, click **Save**."
- Name things precisely: a *dialog* (never "pop-up window"), a *page* in a web app, a *checkbox* that you *select* or *clear*, and a *toggle* that you click to the on position. Don't use slang such as "hamburger icon."
- Write keys as `Control+S`, with modifiers spelled out, and give macOS in parentheses: "Control+C (or Command+C on macOS)." Use *press* for keys and *enter* or *type* for text.

## Links and cross-references

Source: https://developers.google.com/style/cross-references

- Use short, unique, descriptive link text that makes sense out of context: the exact page title, or a phrase that names the destination. Never "click here," "this document," or a bare URL.
  - Do: "For more information, see [Make headings into link targets]."
  - Don't: "See [this blog post]."
- Introduce a reference with "For more information, see..." or "For more information about TOPIC, see..." Use *about*, not *on*.
- Put the condition or goal first, then the link: "For more information, see [link]," not "See [link] for more information."
- Include an abbreviation and a code element's noun inside the link: "[Google Kubernetes Engine (GKE)]," "the [`--hostname` flag]."
- Say when a link downloads a file or jumps within the page: "[download the security features PDF]," "see the [Write descriptive link text] section of this document."
- Link to each destination once per page, and keep punctuation outside the link.
- Give short help in context instead of linking away for a definition or a couple of steps.

## Text formatting

Source: https://developers.google.com/style/text-formatting

- Use bold only for UI elements, run-in headings, and notice labels.
- Use italics sparingly, for a term you're defining or a word used as a word. Let the words carry emphasis where you can.
- Underline only links.
- Write placeholders in code font and all caps.
- Don't override fonts or colors inline.

## Dates and times

Source: https://developers.google.com/style/dates-times

- Spell out the month, and use a four-digit year: "January 19, 2017." Never write months as numbers such as "03/04/2026," which readers in different regions read differently.
- If a numeric date is required, use `YYYY-MM-DD`, such as "2017-04-15."
- Use a 12-hour clock with AM or PM after a space ("3:45 PM," "3 PM"), unless the product uses 24-hour time.
- Avoid time zones unless you need one. Then spell out the region and give UTC in parentheses: "US and Canadian Pacific Standard Time (UTC-8)."
- Avoid seasons. Write the month or the quarter.
