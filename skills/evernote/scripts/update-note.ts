#!/usr/bin/env npx ts-node
/**
 * Update Note - Modify existing notes (append, modify sections)
 *
 * Usage:
 *   npx ts-node update-note.ts --guid "note-guid" --append "New content"
 *   npx ts-node update-note.ts --guid "note-guid" --section "Notes" --append "New bullet point"
 *   npx ts-node update-note.ts --guid "note-guid" --add-tags "tag1,tag2"
 */

import {
  getNoteStore,
  findTagsByNames,
  parseArgs,
  formatDate,
  Evernote,
} from './evernote-client.js';

interface UpdateOptions {
  guid: string;
  append?: string;
  prepend?: string;
  section?: string;
  addTags?: string[];
  removeTags?: string[];
}

/**
 * Prepend content to the top of a specific section in ENML (right after the header)
 */
function prependToSection(content: string, sectionName: string, newContent: string): string {
  const escapedContent = newContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  // Find the section header
  const headerRegex = new RegExp(`(<h1[^>]*>\\s*${sectionName}\\s*</h1>)`, 'i');
  const match = content.match(headerRegex);

  if (!match || match.index === undefined) {
    throw new Error(`Section "${sectionName}" not found in note`);
  }

  // Insert right after the header
  const insertIndex = match.index + match[0].length;
  const before = content.slice(0, insertIndex);
  const after = content.slice(insertIndex);

  return `${before}<div>${escapedContent}</div>${after}`;
}

/**
 * Append content to a specific section in ENML
 */
function appendToSection(content: string, sectionName: string, newContent: string): string {
  const escapedContent = newContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  // Find the section header
  const headerRegex = new RegExp(`(<h1[^>]*>\\s*${sectionName}\\s*</h1>)`, 'i');
  const match = content.match(headerRegex);

  if (!match || match.index === undefined) {
    throw new Error(`Section "${sectionName}" not found in note`);
  }

  const insertIndex = match.index + match[0].length;

  // Find appropriate insertion point (after the header, before next section or end)
  const afterHeader = content.slice(insertIndex);

  // Find the next h1 or end of note
  const nextSectionMatch = afterHeader.match(/<h1[^>]*>/i);
  const endNoteMatch = afterHeader.match(/<\/en-note>/i);

  let insertPosition: number;
  if (nextSectionMatch?.index !== undefined) {
    insertPosition = insertIndex + nextSectionMatch.index;
  } else if (endNoteMatch?.index !== undefined) {
    insertPosition = insertIndex + endNoteMatch.index;
  } else {
    insertPosition = content.length;
  }

  // Insert the new content
  const before = content.slice(0, insertPosition);
  const after = content.slice(insertPosition);

  return `${before}<div>${escapedContent}</div>${after}`;
}

/**
 * Append content to the end of a note (before </en-note>)
 */
function appendToEnd(content: string, newContent: string): string {
  const escapedContent = newContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  const endTagIndex = content.lastIndexOf('</en-note>');
  if (endTagIndex === -1) {
    throw new Error('Invalid ENML: missing </en-note> tag');
  }

  const before = content.slice(0, endTagIndex);
  const after = content.slice(endTagIndex);

  return `${before}<div>${escapedContent}</div>${after}`;
}

async function updateNote(options: UpdateOptions): Promise<void> {
  const noteStore = getNoteStore();

  try {
    // Get the existing note
    const note = await noteStore.getNote(options.guid, true, false, false, false);

    console.log(`Updating note: ${note.title}`);
    console.log(`GUID: ${note.guid}`);
    console.log('-'.repeat(50));

    let content = note.content ?? '';
    let modified = false;

    // Prepend content (to top of section)
    if (options.prepend) {
      if (options.section) {
        content = prependToSection(content, options.section, options.prepend);
        console.log(`✅ Prepended to top of section: ${options.section}`);
      } else {
        throw new Error('--prepend requires --section to specify where to insert');
      }
      note.content = content;
      modified = true;
    }

    // Append content (to bottom of section)
    if (options.append) {
      if (options.section) {
        content = appendToSection(content, options.section, options.append);
        console.log(`✅ Appended to section: ${options.section}`);
      } else {
        content = appendToEnd(content, options.append);
        console.log('✅ Appended to end of note');
      }
      note.content = content;
      modified = true;
    }

    // Add tags
    if (options.addTags && options.addTags.length > 0) {
      const existingTagGuids = note.tagGuids ?? [];
      const tagsToAdd = await findTagsByNames(options.addTags);

      for (const tagName of options.addTags) {
        let tag = tagsToAdd.find(t => t.name?.toLowerCase() === tagName.toLowerCase());

        // Create tag if it doesn't exist
        if (!tag) {
          console.log(`Creating new tag: ${tagName}`);
          const newTag = new Evernote.Types.Tag();
          newTag.name = tagName;
          tag = await noteStore.createTag(newTag);
        }

        if (tag.guid && !existingTagGuids.includes(tag.guid)) {
          existingTagGuids.push(tag.guid);
          console.log(`✅ Added tag: ${tag.name}`);
        }
      }

      note.tagGuids = existingTagGuids;
      modified = true;
    }

    // Remove tags
    if (options.removeTags && options.removeTags.length > 0) {
      const tagsToRemove = await findTagsByNames(options.removeTags);
      const removeGuids = tagsToRemove.map(t => t.guid).filter(Boolean) as string[];

      note.tagGuids = (note.tagGuids ?? []).filter(g => !removeGuids.includes(g));

      for (const tag of tagsToRemove) {
        console.log(`✅ Removed tag: ${tag.name}`);
      }
      modified = true;
    }

    // Update the note if modified
    if (modified) {
      await noteStore.updateNote(note);
      console.log('\n✅ Note updated successfully!');
      console.log(`Updated: ${formatDate(Date.now())}`);
    } else {
      console.log('\nNo changes made.');
    }
  } catch (err) {
    console.error('Error updating note:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

// CLI entry point
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.guid) {
    console.log(`
Update Note - Modify existing notes (append, modify sections, manage tags)

Usage:
  npx ts-node update-note.ts --guid <note-guid> [options]

Options:
  --guid <guid>           Note GUID (required)
  --prepend <text>        Prepend text to TOP of section (requires --section)
  --append <text>         Append text to BOTTOM of section or note
  --section <name>        Target section (e.g., "Tasks", "Notes", "Links")
  --add-tags <list>       Comma-separated tags to add
  --remove-tags <list>    Comma-separated tags to remove
  --help                  Show this help

Examples:
  npx ts-node update-note.ts --guid "abc123" --section "Tasks" --prepend "[ ] New task"
  npx ts-node update-note.ts --guid "abc123" --section "Notes" --append "Decision: use JWT"
  npx ts-node update-note.ts --guid "abc123" --add-tags "important,reviewed"
`);
    process.exit(args.help ? 0 : 1);
  }

  const addTags = args['add-tags']
    ? (args['add-tags'] as string).split(',').map(t => t.trim())
    : undefined;

  const removeTags = args['remove-tags']
    ? (args['remove-tags'] as string).split(',').map(t => t.trim())
    : undefined;

  await updateNote({
    guid: args.guid as string,
    prepend: args.prepend as string | undefined,
    append: args.append as string | undefined,
    section: args.section as string | undefined,
    addTags,
    removeTags,
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
