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

## Escaping Content

When inserting user content into ENML:

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
