#!/usr/bin/env npx ts-node
/**
 * List Tags - List all tags with note counts
 *
 * Usage:
 *   npx ts-node list-tags.ts
 *   npx ts-node list-tags.ts --sort count
 *   npx ts-node list-tags.ts --filter "ai"
 */

import {
  getNoteStore,
  parseArgs,
  Evernote,
} from './evernote-client.js';

interface ListOptions {
  sort?: 'name' | 'count';
  filter?: string;
  limit?: number;
  counts?: boolean;
}

interface TagWithCount {
  name: string;
  guid: string;
  count: number;
}

async function listTags(options: ListOptions): Promise<void> {
  const noteStore = getNoteStore();

  try {
    // Get all tags
    const tags = await noteStore.listTags();

    console.log(`Found ${tags.length} tags\n`);

    let tagsWithCounts: TagWithCount[] = [];

    // Get counts if requested or sorting by count
    if (options.counts || options.sort === 'count') {
      console.log('Fetching note counts...\n');

      for (const tag of tags) {
        if (!tag.guid || !tag.name) continue;

        const filter = new Evernote.NoteStore.NoteFilter({
          tagGuids: [tag.guid],
        });

        try {
          const counts = await noteStore.findNoteCounts(filter, false);
          const count = counts.tagCounts?.[tag.guid] ?? 0;

          tagsWithCounts.push({
            name: tag.name,
            guid: tag.guid,
            count,
          });
        } catch {
          tagsWithCounts.push({
            name: tag.name,
            guid: tag.guid,
            count: 0,
          });
        }
      }
    } else {
      // Just use the tags without counts
      tagsWithCounts = tags
        .filter(t => t.name && t.guid)
        .map(t => ({
          name: t.name!,
          guid: t.guid!,
          count: 0,
        }));
    }

    // Filter by name if specified
    if (options.filter) {
      const filterLower = options.filter.toLowerCase();
      tagsWithCounts = tagsWithCounts.filter(t =>
        t.name.toLowerCase().includes(filterLower)
      );
      console.log(`Filtered to ${tagsWithCounts.length} tags matching "${options.filter}"\n`);
    }

    // Sort
    if (options.sort === 'count') {
      tagsWithCounts.sort((a, b) => b.count - a.count);
    } else {
      tagsWithCounts.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Apply limit
    if (options.limit) {
      tagsWithCounts = tagsWithCounts.slice(0, options.limit);
    }

    // Display results
    if (options.counts || options.sort === 'count') {
      console.log('Count | Tag Name');
      console.log('-'.repeat(50));

      for (const tag of tagsWithCounts) {
        console.log(`${String(tag.count).padStart(5)} | ${tag.name}`);
      }
    } else {
      console.log('Tag Name');
      console.log('-'.repeat(50));

      for (const tag of tagsWithCounts) {
        console.log(tag.name);
      }
    }

    // Summary
    console.log('-'.repeat(50));
    console.log(`Total: ${tagsWithCounts.length} tags`);

    if (options.counts || options.sort === 'count') {
      const totalNotes = tagsWithCounts.reduce((sum, t) => sum + t.count, 0);
      console.log(`Total tagged notes: ${totalNotes}`);
    }
  } catch (err) {
    console.error('Error listing tags:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

// CLI entry point
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`
List Tags - List all tags with note counts

Usage:
  npx ts-node list-tags.ts [options]

Options:
  --sort <type>     Sort by: "name" (default) or "count"
  --filter <text>   Filter tags by name (contains)
  --limit <n>       Limit number of results
  --counts          Include note counts (slower)
  --help            Show this help

Examples:
  npx ts-node list-tags.ts --sort count --limit 20
  npx ts-node list-tags.ts --filter "ai" --counts
  npx ts-node list-tags.ts --sort name
`);
    process.exit(0);
  }

  await listTags({
    sort: (args.sort as 'name' | 'count') ?? 'name',
    filter: args.filter as string | undefined,
    limit: args.limit ? parseInt(args.limit as string, 10) : undefined,
    counts: args.counts === true || args.sort === 'count',
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
