#!/usr/bin/env npx tsx
/**
 * Create Note - Create new notes with title, content, and tags
 *
 * Usage:
 *   npx tsx scripts/create-note.ts --title "My Note" --content "Content here"
 *   npx tsx scripts/create-note.ts --title "Sprint Note" --tags "weekly-notes,project-alpha" --template sprint
 */

import {
  getNoteStore,
  findTagsByNames,
  parseArgs,
  Evernote,
} from './evernote-client.js';

interface CreateOptions {
  title: string;
  content?: string;
  tags?: string[];
  notebook?: string;
  template?: 'sprint' | 'blank';
}

/**
 * Generate ENML content for a sprint note template
 */
function generateSprintTemplate(title: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note>
<h1>Tasks</h1>
<div><br/></div>

<h1>Links</h1>
<div><br/></div>

<h1>Notes</h1>
<div><br/></div>
</en-note>`;
}

/**
 * Generate ENML content from plain text
 */
function textToEnml(text: string): string {
  // Escape special characters
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note>
${escaped}
</en-note>`;
}

async function createNote(options: CreateOptions): Promise<void> {
  const noteStore = getNoteStore();

  try {
    // Build the note
    const note = new Evernote.Types.Note();
    note.title = options.title;

    // Set content based on template or provided content
    if (options.template === 'sprint') {
      note.content = generateSprintTemplate(options.title);
      console.log('Using sprint template (Tasks/Links/Notes sections)');
    } else if (options.content) {
      note.content = textToEnml(options.content);
    } else {
      note.content = textToEnml('');
    }

    // Add tags
    if (options.tags && options.tags.length > 0) {
      const existingTags = await findTagsByNames(options.tags);
      const existingTagNames = existingTags.map(t => t.name?.toLowerCase());

      // Create any missing tags
      const tagGuids: string[] = [];

      for (const tagName of options.tags) {
        const existing = existingTags.find(
          t => t.name?.toLowerCase() === tagName.toLowerCase()
        );

        if (existing?.guid) {
          tagGuids.push(existing.guid);
        } else {
          // Create new tag
          console.log(`Creating new tag: ${tagName}`);
          const newTag = new Evernote.Types.Tag();
          newTag.name = tagName;
          const created = await noteStore.createTag(newTag);
          if (created.guid) {
            tagGuids.push(created.guid);
          }
        }
      }

      note.tagGuids = tagGuids;
      console.log(`Tags: ${options.tags.join(', ')}`);
    }

    // Set notebook if specified
    if (options.notebook) {
      const notebooks = await noteStore.listNotebooks();
      const notebook = notebooks.find(
        (nb: any) => nb.name?.toLowerCase() === options.notebook?.toLowerCase()
      );

      if (notebook?.guid) {
        note.notebookGuid = notebook.guid;
        console.log(`Notebook: ${notebook.name}`);
      } else {
        console.warn(`Notebook "${options.notebook}" not found, using default`);
      }
    }

    // Create the note
    const created = await noteStore.createNote(note);

    console.log('\n✅ Note created successfully!');
    console.log(`Title: ${created.title}`);
    console.log(`GUID: ${created.guid}`);
    console.log(`Created: ${new Date(created.created!).toLocaleString()}`);

    // Note: Use the GUID to find this note in Evernote
    console.log('\nOpen Evernote and search by title, or use the GUID with the read-note script.');
  } catch (err) {
    console.error('Error creating note:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

// CLI entry point
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.title) {
    console.log(`
Create Note - Create new notes with title, content, and tags

Usage:
  npx ts-node create-note.ts --title <title> [options]

Options:
  --title <text>      Note title (required)
  --content <text>    Note content (plain text)
  --tags <list>       Comma-separated tag names
  --notebook <name>   Target notebook name
  --template <type>   Use template: "sprint" or "blank"
  --help              Show this help

Templates:
  sprint    Creates note with Tasks/Links/Notes sections
  blank     Creates empty note (default)

Examples:
  npx tsx scripts/create-note.ts --title "Meeting Notes" --content "Discussion points..."
  npx tsx scripts/create-note.ts --title "Sprint 2026-01-20" --tags "weekly-notes,project-alpha" --template sprint
`);
    process.exit(args.help ? 0 : 1);
  }

  const tags = args.tags
    ? (args.tags as string).split(',').map(t => t.trim())
    : undefined;

  await createNote({
    title: args.title as string,
    content: args.content as string | undefined,
    tags,
    notebook: args.notebook as string | undefined,
    template: args.template as 'sprint' | 'blank' | undefined,
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
