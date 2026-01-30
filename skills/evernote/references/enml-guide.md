# ENML Guide

Evernote Markup Language (ENML) is a subset of XHTML used by Evernote to store note content.

## Basic Structure

Every ENML document follows this structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note>
  <!-- Content here -->
</en-note>
```

## Supported Elements

### Text Formatting

```xml
<b>Bold</b>
<i>Italic</i>
<u>Underline</u>
<strike>Strikethrough</strike>
<br/> <!-- Line break -->
```

### Headers

```xml
<h1>Heading 1</h1>
<h2>Heading 2</h2>
<h3>Heading 3</h3>
```

### Lists

```xml
<!-- Unordered -->
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>

<!-- Ordered -->
<ol>
  <li>First</li>
  <li>Second</li>
</ol>
```

### Links

```xml
<a href="https://example.com">Link text</a>
```

### Divisions

```xml
<div>Block content</div>
<span>Inline content</span>
```

## Prohibited Elements

ENML does **NOT** support:

- `<script>` - No JavaScript
- `<style>` - No external CSS
- `<form>` - No forms
- `<input>` - No input elements
- `<iframe>` - No embedded frames
- `<object>`, `<embed>` - No plugins
- `<applet>` - No Java applets

## Special Evernote Elements

### Tasks (Read-only)

Evernote Tasks appear as special divs with custom attributes:

```xml
<div style="--en-task-group:true; --en-id:...">
  <!-- Task content managed by Evernote client -->
</div>
```

**Note:** Tasks cannot be created/modified via the API. They show as placeholder blocks with a warning icon when accessed via API.

### Media (Images, Audio, etc.)

```xml
<en-media hash="..." type="image/png"/>
```

Media is referenced by content hash and must be attached as a Resource.

## Section Pattern

For structured notes with sections:

```xml
<en-note>
  <h1>Tasks</h1>
  <div>Task content here</div>

  <h1>Links</h1>
  <div><a href="...">Link 1</a></div>

  <h1>Notes</h1>
  <div>Freeform notes here</div>
</en-note>
```

## Rich Text Formatting

ENML supports a wide range of XHTML elements for rich formatting. The skill's
`enml-formatter.ts` module handles conversion from markdown to valid ENML
automatically. Content passed to `create-note.ts` and `update-note.ts` is
**markdown by default**.

### Supported ENML Elements (full list)

```
a, abbr, acronym, address, area, b, bdo, big, blockquote, br, caption,
center, cite, code, col, colgroup, dd, del, dfn, div, dl, dt, em, font,
h1, h2, h3, h4, h5, h6, hr, i, img, ins, kbd, li, map, ol, p, pre, q,
s, samp, small, span, strike, strong, sub, sup, table, tbody, td, tfoot,
th, thead, title, tr, tt, u, ul, var, xmp
```

### Tables

Tables require inline styles since ENML has no `<style>` blocks:

```xml
<table style="border-collapse: collapse; width: 100%;">
  <tr>
    <th style="border: 1px solid #ccc; padding: 8px 12px; background-color: #f5f5f5;">Header</th>
  </tr>
  <tr>
    <td style="border: 1px solid #ccc; padding: 8px 12px;">Cell</td>
  </tr>
</table>
```

### XHTML Compliance

ENML is strict XHTML. All tags must be properly closed:

- `<br/>` not `<br>`
- `<hr/>` not `<hr>`
- `<img src="..." />` not `<img src="...">`

The `enml-formatter.ts` module handles this automatically when converting
from markdown.

### Content Formats

The `--format` flag controls how content is interpreted:

| Format | Behavior |
|--------|----------|
| `markdown` | Default. Converts markdown to rich ENML via `marked` library. |
| `plain` | Escapes all HTML. Newlines become `<br/>`. |
| `enml` | Pass-through. Caller provides valid ENML body content. |

## Escaping Content

When inserting user content as plain text into ENML:

```typescript
function escapeForEnml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>');
}
```

## Extracting Text

To extract plain text from ENML:

```typescript
function stripEnml(content: string): string {
  return content
    .replace(/<[^>]*>/g, ' ')  // Remove tags
    .replace(/\s+/g, ' ')       // Normalize whitespace
    .trim();
}
```

## Resources

- [Official ENML DTD](http://xml.evernote.com/pub/enml2.dtd)
- [Evernote API Documentation](https://dev.evernote.com/doc/)
- [ENML Developer Reference](https://dev.evernote.com/doc/articles/enml.php)
