# Images and figures

Rules for diagrams, screenshots, alt text, and captions. Source for every section: https://developers.google.com/style/images

## When to use an image

- Use an image only when it explains something that's hard to express in words. Images aren't translated, searched, or read the same way by every reader.
- Never use an image of text, code, or terminal output. Use real text.
- Never put information only in an image. Anything a figure shows must also be in the text.

## Introduce the image

- Introduce most images with a complete sentence. End it with a colon when the image follows directly, or a period when something comes between.
  - Do: "The following diagram shows how you can apply bounded contexts to an existing ecommerce application:"
- A screenshot that directly follows a step describing the same UI needs no introduction.
- Refer to a figure by number or as "the preceding diagram," never by position, such as "the image above."

## Alt text

- Always include an `alt` attribute. Without one, screen readers might read the file name aloud.
- Keep alt text to 155 characters or less. Write a noun phrase or a sentence, with punctuation, about what the image shows in its context: "Architecture of an app that's built with Apps Script."
- Don't start alt text with "Image of" or "Photo of," and don't write it in all caps.
- Use `alt=""` for a decorative image, or one that only repeats the surrounding text.
- Put the full description in the text, not in the alt text. A caption doesn't replace alt text.

## Captions and descriptions

- Captions are optional. When you use one, write a complete sentence with end punctuation, in the form "**Figure 1.** Application capabilities are separated into bounded contexts that migrate to services." A label such as "Bounded contexts" isn't a caption.
- Put captions and descriptions in the text after the image, never inside it.
- When the caption doesn't carry the figure's full meaning, write a description with the same information as the figure: "In figure 1, the application's capabilities are separated into bounded contexts and migrated to services as follows:" and then a list.

## Text inside a figure

- Avoid explanatory text in an image. It hurts accessibility, search, and translation.
- Keep any text brief, with no complete sentences or end punctuation. Use sentence case.
- Don't invent abbreviations to save space.
- Numbered callouts are fine, but don't use them for detailed annotations. Explain each callout in the text.
- Leave the title out of the image. The text before the figure introduces it.

## Making the image

- Use SVG for diagrams, so they stay sharp when zoomed. Otherwise use PNG. Don't use animated GIFs.
- Don't use a transparent background.
- Crop screenshots to the part that matters, and use one operating system and one look for every screenshot in a doc set.
- Hide personal data with a solid, fully opaque box. Blurs and mosaics can be reversed.
- Provide a 2x version for high-resolution screens. Don't make it by scaling up the 1x image.
- Don't use image maps. Put a list of text links after the image instead.
- Use descriptive, lowercase, hyphenated file names.
