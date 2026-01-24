#!/usr/bin/env npx tsx
/**
 * Search Notes - Find notes by tag, title, content, or date range
 *
 * Usage:
 *   npx tsx search-notes.ts --tag "weekly-work-notes" --limit 10
 *   npx tsx search-notes.ts --query "authentication JWT"
 *   npx tsx search-notes.ts --title "Sprint"
 *   npx tsx search-notes.ts --tag "ai" --days 7 --sort created
 */

import {
  getNoteStore,
  findTagByName,
  parseArgs,
  formatDate,
  stripEnml,
  Evernote,
} from './evernote-client.js';

interface SearchOptions {
  tag?: string;
  query?: string;
  title?: string;
  days?: number;
  limit?: number;
  content?: boolean;
  sort?: 'updated' | 'created';
}

async function searchNotes(options: SearchOptions): Promise<void> {
  const noteStore = getNoteStore();
  const limit = options.limit ?? 20;

  // Determine sort order (default to UPDATED for most recent modifications)
  const sortOrder = options.sort === 'created'
    ? Evernote.Types.NoteSortOrder.CREATED
    : Evernote.Types.NoteSortOrder.UPDATED;

  // Build the filter
  const filter = new Evernote.NoteStore.NoteFilter({
    order: sortOrder,
    ascending: false,
  });

  // Filter by tag
  if (options.tag) {
    const tag = await findTagByName(options.tag);
    if (!tag) {
      console.error(`Tag not found: "${options.tag}"`);
      process.exit(1);
    }
    filter.tagGuids = [tag.guid!];
    console.log(`Searching notes with tag: ${options.tag}\n`);
  }

  // Filter by content query
  if (options.query) {
    filter.words = options.query;
    console.log(`Searching for: "${options.query}"\n`);
  }

  // Filter by days
  if (options.days) {
    const since = Date.now() - options.days * 24 * 60 * 60 * 1000;
    filter.words = (filter.words ?? '') + ` created:day-${options.days}`;
    console.log(`Filtering to last ${options.days} days\n`);
  }

  // Metadata to retrieve
  const spec = new Evernote.NoteStore.NotesMetadataResultSpec({
    includeTitle: true,
    includeCreated: true,
    includeUpdated: true,
    includeTagGuids: true,
  });

  try {
    const result = await noteStore.findNotesMetadata(filter, 0, limit, spec);

    console.log(`Found ${result.totalNotes} total notes (showing ${result.notes?.length ?? 0})\n`);
    console.log('='.repeat(70));

    // Filter by title if specified (client-side)
    let notes = result.notes ?? [];
    if (options.title) {
      const titleLower = options.title.toLowerCase();
      notes = notes.filter((n: any) => n.title?.toLowerCase().includes(titleLower));
      console.log(`Filtered to ${notes.length} notes matching title: "${options.title}"\n`);
    }

    for (const note of notes) {
      console.log(`\nTitle: ${note.title}`);
      console.log(`GUID: ${note.guid}`);
      console.log(`Created: ${formatDate(note.created!)}`);
      console.log(`Updated: ${formatDate(note.updated!)}`);

      // Get content preview if requested
      if (options.content) {
        const fullNote = await noteStore.getNote(note.guid!, true, false, false, false);
        const preview = stripEnml(fullNote.content ?? '').substring(0, 300);
        console.log(`Preview: ${preview}...`);
      }

      console.log('-'.repeat(70));
    }

    if (notes.length === 0) {
      console.log('\nNo notes found matching your criteria.');
    }
  } catch (err) {
    console.error('Error searching notes:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

// CLI entry point
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`
Search Notes - Find notes by tag, title, content, or date range

Usage:
  npx tsx search-notes.ts [options]

Options:
  --tag <name>      Filter by tag name
  --query <text>    Search note content
  --title <text>    Filter by title (contains)
  --days <n>        Limit to last n days
  --limit <n>       Max results (default: 20)
  --sort <type>     Sort by: "updated" (default) or "created"
  --content         Include content preview
  --help            Show this help

Examples:
  npx tsx search-notes.ts --tag "weekly-work-notes" --limit 5
  npx tsx search-notes.ts --query "authentication" --content
  npx tsx search-notes.ts --tag "ai" --days 7 --sort created
`);
    process.exit(0);
  }

  await searchNotes({
    tag: args.tag as string | undefined,
    query: args.query as string | undefined,
    title: args.title as string | undefined,
    days: args.days ? parseInt(args.days as string, 10) : undefined,
    limit: args.limit ? parseInt(args.limit as string, 10) : undefined,
    content: args.content === true,
    sort: (args.sort as 'updated' | 'created') ?? 'updated',
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
