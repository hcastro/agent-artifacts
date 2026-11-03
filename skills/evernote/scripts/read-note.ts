#!/usr/bin/env npx tsx
/**
 * Read Note - Get full content of a note with section extraction
 *
 * Usage:
 *   npx tsx scripts/read-note.ts --guid "note-guid-here"
 *   npx tsx scripts/read-note.ts --guid "note-guid" --section "Notes"
 *   npx tsx scripts/read-note.ts --guid "note-guid" --raw
 */

import {
  getNoteStore,
  parseArgs,
  formatDate,
  stripEnml,
  sectionHeaderRegex,
} from './evernote-client.js';

interface ReadOptions {
  guid: string;
  section?: string;
  raw?: boolean;
}

/**
 * Extract a specific section from ENML content
 * Looks for an <h1> to <h3> header with the section name and extracts content
 * until the next heading at the same or a higher level
 */
function extractSection(content: string, sectionName: string): string | null {
  // Find the section header
  const headerMatch = content.match(sectionHeaderRegex(sectionName));

  if (!headerMatch || headerMatch.index === undefined) {
    return null;
  }

  const level = headerMatch[1];
  const startIndex = headerMatch.index + headerMatch[0].length;

  // Find the next heading at the same or higher level, or end of content
  const nextHeaderMatch = content.slice(startIndex).match(new RegExp(`<h[1-${level}][^>]*>`, 'i'));
  const endNoteIndex = content.indexOf('</en-note>');
  const endIndex = nextHeaderMatch?.index !== undefined
    ? startIndex + nextHeaderMatch.index
    : (endNoteIndex === -1 ? content.length : endNoteIndex);

  const sectionContent = content.slice(startIndex, endIndex);
  return stripEnml(sectionContent);
}

/**
 * Extract all sections from ENML content
 */
function extractAllSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const headerRegex = /<h([123])[^>]*>([^<]+)<\/h\1>/gi;
  let match;

  while ((match = headerRegex.exec(content)) !== null) {
    const sectionName = match[2].trim();
    const sectionContent = extractSection(content, sectionName);
    if (sectionContent) {
      sections[sectionName] = sectionContent;
    }
  }

  return sections;
}

async function readNote(options: ReadOptions): Promise<void> {
  const noteStore = getNoteStore();

  try {
    // Get full note with content
    const note = await noteStore.getNote(options.guid, true, false, false, false);

    console.log(`Title: ${note.title}`);
    console.log(`GUID: ${note.guid}`);
    console.log(`Created: ${formatDate(note.created!)}`);
    console.log(`Updated: ${formatDate(note.updated!)}`);
    console.log('='.repeat(70));

    const content = note.content ?? '';

    if (options.raw) {
      // Output raw ENML
      console.log('\nRaw ENML:\n');
      console.log(content);
    } else if (options.section) {
      // Extract specific section
      const sectionContent = extractSection(content, options.section);
      if (sectionContent) {
        console.log(`\n## ${options.section}\n`);
        console.log(sectionContent);
      } else {
        console.log(`\nSection "${options.section}" not found in note.`);
        console.log('Available sections:');
        const sections = extractAllSections(content);
        Object.keys(sections).forEach(s => console.log(`  - ${s}`));
      }
    } else {
      // Extract and display all sections
      const sections = extractAllSections(content);

      if (Object.keys(sections).length > 0) {
        for (const [name, text] of Object.entries(sections)) {
          console.log(`\n## ${name}\n`);
          console.log(text || '(empty)');
          console.log('-'.repeat(70));
        }
      } else {
        // No sections found, just show stripped content
        console.log('\nContent:\n');
        console.log(stripEnml(content));
      }
    }
  } catch (err) {
    console.error('Error reading note:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

// CLI entry point
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.guid) {
    console.log(`
Read Note - Get full content of a note with section extraction

Usage:
  npx tsx scripts/read-note.ts --guid <note-guid> [options]

Options:
  --guid <guid>       Note GUID (required)
  --section <name>    Extract specific section only
  --raw               Output raw ENML
  --help              Show this help

Examples:
  npx tsx scripts/read-note.ts --guid "abc123"
  npx tsx scripts/read-note.ts --guid "abc123" --section "Notes"
  npx tsx scripts/read-note.ts --guid "abc123" --raw
`);
    process.exit(args.help ? 0 : 1);
  }

  await readNote({
    guid: args.guid as string,
    section: args.section as string | undefined,
    raw: args.raw === true,
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
