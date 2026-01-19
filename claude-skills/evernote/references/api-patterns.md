# Evernote API Patterns

Common patterns for working with the Evernote API.

## Authentication

### Developer Token

For personal use, developer tokens are the simplest approach:

```typescript
import Evernote from 'evernote';

const client = new Evernote.Client({
  token: process.env.EVERNOTE_TOKEN,
  sandbox: false,  // Use true for sandbox environment
});
```

### Token Validation

Always validate the token before operations:

```typescript
async function verifyToken(): Promise<boolean> {
  try {
    const userStore = client.getUserStore();
    const user = await userStore.getUser();
    console.log(`Authenticated as: ${user.username}`);
    return true;
  } catch (err) {
    console.error('Invalid token:', err.message);
    return false;
  }
}
```

## Searching Notes

### By Tag

```typescript
const noteStore = client.getNoteStore();

// Find the tag first
const tags = await noteStore.listTags();
const tag = tags.find(t => t.name === 'my-tag');

// Search with tag filter
const filter = new Evernote.NoteStore.NoteFilter({
  tagGuids: [tag.guid],
  order: Evernote.Types.NoteSortOrder.CREATED,
  ascending: false,
});

const spec = new Evernote.NoteStore.NotesMetadataResultSpec({
  includeTitle: true,
  includeCreated: true,
});

const results = await noteStore.findNotesMetadata(filter, 0, 50, spec);
```

### By Content

```typescript
const filter = new Evernote.NoteStore.NoteFilter({
  words: 'search terms here',
});
```

### By Date Range

```typescript
// Notes from last 7 days
const filter = new Evernote.NoteStore.NoteFilter({
  words: 'created:day-7',
});
```

## Reading Notes

### Get Full Content

```typescript
// Parameters: guid, withContent, withResourcesData, withResourcesRecognition, withResourcesAlternateData
const note = await noteStore.getNote(guid, true, false, false, false);
console.log(note.title);
console.log(note.content);  // ENML format
```

### Get Note with Resources (Images)

```typescript
const note = await noteStore.getNote(guid, true, true, false, false);

for (const resource of note.resources || []) {
  if (resource.mime?.startsWith('image/')) {
    // resource.data.body contains the binary data
    const imageBuffer = Buffer.from(resource.data.body);
  }
}
```

## Creating Notes

### Basic Note

```typescript
const note = new Evernote.Types.Note();
note.title = 'My Note Title';
note.content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note>
  <div>Note content here</div>
</en-note>`;

const created = await noteStore.createNote(note);
console.log('Created:', created.guid);
```

### Note with Tags

```typescript
const note = new Evernote.Types.Note();
note.title = 'Tagged Note';
note.tagGuids = [tag1.guid, tag2.guid];
// ... set content
```

### Note in Specific Notebook

```typescript
const notebooks = await noteStore.listNotebooks();
const notebook = notebooks.find(nb => nb.name === 'My Notebook');

const note = new Evernote.Types.Note();
note.notebookGuid = notebook.guid;
// ... set content
```

## Updating Notes

### Update Content

```typescript
const note = await noteStore.getNote(guid, true, false, false, false);
note.content = newContent;
await noteStore.updateNote(note);
```

### Add Tags

```typescript
const note = await noteStore.getNote(guid, false, false, false, false);
note.tagGuids = [...(note.tagGuids || []), newTagGuid];
await noteStore.updateNote(note);
```

## Managing Tags

### List All Tags

```typescript
const tags = await noteStore.listTags();
for (const tag of tags) {
  console.log(`${tag.name}: ${tag.guid}`);
}
```

### Create Tag

```typescript
const tag = new Evernote.Types.Tag();
tag.name = 'new-tag';
const created = await noteStore.createTag(tag);
```

### Get Note Counts per Tag

```typescript
const filter = new Evernote.NoteStore.NoteFilter({
  tagGuids: [tag.guid],
});
const counts = await noteStore.findNoteCounts(filter, false);
const count = counts.tagCounts?.[tag.guid] || 0;
```

## Error Handling

### Common Errors

```typescript
try {
  await noteStore.getNote(guid, true, false, false, false);
} catch (err) {
  if (err.errorCode === Evernote.Errors.EDAMErrorCode.DATA_REQUIRED) {
    console.error('Note not found');
  } else if (err.errorCode === Evernote.Errors.EDAMErrorCode.PERMISSION_DENIED) {
    console.error('Access denied');
  } else if (err.errorCode === Evernote.Errors.EDAMErrorCode.AUTH_EXPIRED) {
    console.error('Token expired - generate a new one');
  } else {
    console.error('Unknown error:', err.message);
  }
}
```

### Rate Limiting

The API has rate limits. For bulk operations, add delays:

```typescript
async function processNotes(guids: string[]) {
  for (const guid of guids) {
    await processNote(guid);
    await new Promise(r => setTimeout(r, 100)); // 100ms delay
  }
}
```

## Best Practices

1. **Cache tag lookups** - Tags rarely change, cache the list
2. **Use metadata queries** - Don't fetch full content unless needed
3. **Batch operations** - Group related operations to minimize API calls
4. **Handle token expiration** - Developer tokens expire after 1 year
5. **Validate ENML** - Malformed ENML causes note creation to fail
