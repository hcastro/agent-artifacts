# Voice and language

Rules for how the prose reads. Each section links its page in the Google developer documentation style guide.

## Contents

- Tone
- Timeless documentation and future features
- Second person
- Active voice
- Tense
- Conditions before instructions
- Clear sentences for every reader
- Global audience
- Inclusive language
- Contractions
- Jargon
- Abbreviations
- Numbers
- Units of measurement

## Tone

Source: https://developers.google.com/style/tone

- Be "conversational, friendly, and respectful without using slang or being overly colloquial or frivolous." Sound like a knowledgeable friend, never pedantic or pushy.
- Write more tightly than you speak, and put the information first, because the reader may be in a hurry.
- Leave out buzzwords, cutesy phrasing, figurative language, pop-culture references, internet slang (*tl;dr*, *ymmv*), "let's", exclamation marks, and placeholder phrases such as *please note* and *at this time*.
- Don't start every sentence the same way, such as with *You can* or *To do*.
- Don't write *please* in instructions.
  - Do: "To view the document, click **View**."
  - Don't: "To view the document, please click **View**."
- Aim between too informal and too formal.
  - Do: "This API lets you collect data about what your users like."
  - Don't: "Dude! This API is totally awesome!"
  - Don't: "The API documented by this page may enable the acquisition of information pertaining to user preferences."
- Never use exclamation points in concept or reference docs. In procedures, end a completion step with a period: "The VM is created." (https://developers.google.com/style/periods#exclamation-points)

## Timeless documentation and future features

Sources: https://developers.google.com/style/timeless-documentation and https://developers.google.com/style/future

- Describe how the product works now. Don't describe how it changed or how it might change.
- Don't pre-announce features or products, "even in innocuous ways." A sentence such as "Windows support is planned" is a pre-announcement. State the current fact instead: "Ledger doesn't support Windows."
- When describing capabilities, avoid *as of this writing*, *currently*, *does not yet*, *eventually*, *existing*, *in the future*, *latest*, *new*, *now*, *old*, *presently*, and *soon*. *Currently* is implied by the documentation existing at all.
  - Do: "The emulator supports the following filters:"
  - Don't: "The emulator now supports the following filters:"
- If you must say *new*, give a reference point: "The January 14, 2021 release of BigQuery includes a new resource panel."
- Time words are fine in release notes, blog posts, and press releases. *Soon* is fine for a state change after a step: "The VM goes offline soon after you send the shutdown command."

## Second person

Source: https://developers.google.com/style/person

- Address the reader as *you*. Don't write *we*, *our*, *us*, or *let's* for the reader's actions.
  - Do: "This document shows you how to develop an app for your organization."
  - Don't: "This document shows the user how to develop an app for their organization."
- Use the imperative to tell the reader to do something: "Click **Submit**."
- Use *user* only for the person using the software that the reader builds.
- Use *we* only for the organization that wrote the docs, with a clear antecedent.

## Active voice

Source: https://developers.google.com/style/voice

- Make clear who performs the action.
  - Do: "Send a query to the service. The server sends an acknowledgment."
  - Don't: "The service is queried, and an acknowledgment is sent."
- Passive voice is fine to emphasize the object ("The file is saved."), or when the actor doesn't matter ("Over 50 conflicts were found in the file.").

## Tense

Source: https://developers.google.com/style/tense

- Use present tense for how things work: "The server sends an acknowledgment," not "will send."
- Use *will* only for something that happens later, such as an asynchronous event: "The file will be archived the next time the backup process runs."
- Avoid the hypothetical *would*.
  - Do: "If you send an unsubscribe message, the server removes you from the mailing list."
  - Don't: "You can send an unsubscribe message. The server would then remove you from the mailing list."

## Conditions before instructions

Source: https://developers.google.com/style/sentence-structure

Put the circumstance, condition, or goal before the instruction, so a reader can skip an instruction that doesn't apply.

- Do: "To delete the entire document, click **Delete**."
- Don't: "Click **Delete** if you want to delete the entire document."
- Do: "For more information, see [link]."
- Don't: "See [link] for more information."

## Clear sentences for every reader

Source: https://developers.google.com/style/accessibility#ease-of-reading

- Try to keep sentences under 26 words. Break walls of text into paragraphs, headings, and lists.
- Put the key information in a paragraph's first sentence.
- Define acronyms on first use, and give similar things parallel structure.
- Avoid double negatives and exceptions to exceptions.
  - Do: "You can continue without a path."
  - Don't: "A missing path won't prevent you from continuing."
- Refer to controls by their label, never by color, size, or position.
  - Do: "Click **Notifications**."
  - Don't: "Click the bell icon."
- Don't use directional words such as *above*, *below*, or *right-hand side*. They fail with screen readers and flip in right-to-left languages. Write *earlier*, *preceding*, *later*, or *following*.
  - Do: "In the preceding diagram, clients run jobs."
  - Don't: "In the diagram above, clients run jobs."
- Don't use `&` for *and* in text or headings. Use it only in a UI label that contains it, in code, or where a table heading or diagram label has no room.
- Avoid unneeded bold and italics, which screen readers announce.

## Global audience

Source: https://developers.google.com/style/translation

- Use the simple word: *start*, not *commence*. *Use*, not *utilize* or *leverage*. *Some* or *many*, not *a number of*.
- Avoid phrasal verbs, except *set up*, *log in*, and *sign in*.
  - Do: "This document uses the following terms:"
  - Don't: "This document makes use of the following terms:"
- Don't stack more than two nouns in front of another noun.
- Put *only* right before the word it limits: "Request only one token," not "Only request one token."
- Replace a gerund or participle with a clause where you can.
  - Do: "You must configure the VPC firewall rules before you deploy the VM instance."
  - Don't: "Configuring the VPC firewall rules is required before deploying the VM instance."
- Use each word in one sense only. Watch *once*, *while*, *as*, and *since*, which can each mean time or something else.
- Give a technical keyword a noun: "the `example.yaml` file."
- Keep helper words that a translator needs, such as *then*, *that*, and *of*.
  - Do: "If the attribute key isn't found, then the default value is returned."
  - Do: "Update the rules that you previously defined."
  - Don't: "Update the rules you previously defined."
- Replace an ambiguous pronoun with its noun: "make sure that the ad is targeted," not "make sure that it's targeted."
- Use one term for each concept, with the same capitalization every time.
- Use subject, verb, object order, with the subject and verb near the start of the sentence.
- Write dates and times unambiguously. Avoid idioms, humor, seasons, holidays, and sports references.

## Inclusive language

Source: https://developers.google.com/style/inclusive-documentation

- Avoid gendered language: "16 person-hours," not "16 man-hours." Use singular *they* for an unknown person.
- Avoid ableist words such as *crazy*, *insane*, *cripple*, *dumb*, *sanity check*, and *dummy*.
  - Do: "Replace the placeholder."
  - Don't: "Replace the dummy variable."
- Use precise words over violent or graphic ones.
  - Do: "If the connection doesn't respond."
  - Don't: "If the connection hangs."
- Don't use subjective words such as *simple*, *easy*, *quick*, *careful*, *thorough*, and *proper*. What's simple for one reader isn't for another.
  - Do: "Open the configuration file and add your custom key."
  - Don't: "Simply open the configuration file to quickly add your custom key."
  - Do: "To verify that the daemon is running, run `systemctl status DAEMON_NAME` and confirm that the output shows `Active: active (running)`."
  - Don't: "Ensure the daemon is properly installed and running."
- Use *allowlist* and *denylist*, and *primary* and *replica*. When an established term must appear, give it once in parentheses: "add them to an allowlist (sometimes called a whitelist)."
- Rewrite the sentence rather than verbing the new term.
  - Do: "You can allow requests from a range of IP addresses."
  - Don't: "You can allowlist a range of IP addresses."
- Keep a non-inclusive term only when it's literally in the code, in code font: "Start the replica by using the `START SLAVE` statement."
- Use varied names, genders, and locations in examples.

## Contractions

Source: https://developers.google.com/style/contractions

- Use common contractions such as *you're*, *don't*, and *there's*.
- Prefer negation contractions such as *isn't* and *can't*, because a scanning reader can miss *not*.
- Don't invent contractions such as *guides're* or *mightn't've*.

## Jargon

Source: https://developers.google.com/style/jargon

- Avoid jargon. Replace overloaded words such as *solution*, *support*, and *workload* when a more specific word fits, such as *app* for *solution*.
- Write around the term, or use a specific one: *affected area* for *blast radius*, *import* for *ingest*, *pre-built* for *off-the-shelf*.
- If you need the term, define it in parentheses on first use: "a cold standby (a backup system that's identical to a primary system)."

## Abbreviations

Source: https://developers.google.com/style/abbreviations

- Spell out an unfamiliar abbreviation on first use, with the abbreviation in parentheses: "Border Gateway Protocol (BGP)." Capitalize the long form only if it's a proper noun: "data manipulation language (DML)."
- Common ones such as API, HTML, PDF, URL, and USB rarely need spelling out.
- Don't write *i.e.*, *e.g.*, or *approx.* Write "that is," "for example," and "approximately." Avoid *etc.*
- Spell out symbols that stand in for words: "10 times faster," not "10x faster."
- Don't use an abbreviation as a verb.
  - Do: "Use SSH to log in to your remote shell."
  - Don't: "Then ssh into your remote shell."
- Choose *a* or *an* by sound: "a SQL query," "an SAP system."

## Numbers

Source: https://developers.google.com/style/numbers

- Spell out zero through nine, ordinals ("first," not "1st"), and a number that starts a sentence. Rearranging the sentence is often better.
- Use numerals for 10 and up, and always for versions, technical quantities, measurements, percentages, prices, and step numbers: "version 3," "6 queries per second."
- Use commas in four-digit numbers and up: "2,000 vertices."
- Write percentages without a space ("40%"), ranges with a hyphen and no spaces ("2012-2016"), and dimensions as "192x192."
- Write fractions as decimals with a leading zero where you can: "0.75."

## Units of measurement

Source: https://developers.google.com/style/units-of-measure

- Put a nonbreaking space between a number and its unit ("64&nbsp;GB"). Write money, percent, and degrees with no space: "$10," "65%," "180°."
- Repeat the unit in a range and use *to*: "-40 °C to 85 °C."
- Write *per* instead of a slash where space allows: "requests per day."
- Don't write MB when you mean MiB, or GB when you mean GiB.
