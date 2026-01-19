#!/usr/bin/env npx ts-node
/**
 * Read Note - Get full content of a note with section extraction
 *
 * Usage:
 *   npx ts-node read-note.ts --guid "note-guid-here"
 *   npx ts-node read-note.ts --guid "note-guid" --section "Notes"
 *   npx ts-node read-note.ts --guid "note-guid" --raw
 */

import {
  getNoteStore,
  parseArgs,
  formatDate,
  stripEnml,
} from './evernote-client.js';

interface ReadOptions {
  guid: string;
  section?: string;
  raw?: boolean;
}

/**
 * Extract a specific section from ENML content
 * Looks for <h1>Section Name</h1> and extracts content until next <h1>
 */
function extractSection(content: string, sectionName: string): string | null {
  // Find the section header
  const headerRegex = new RegExp(`<h1[^>]*>\\s*${sectionName}\\s*</h1>`, 'i');
  const headerMatch = content.match(headerRegex);

  if (!headerMatch || headerMatch.index === undefined) {
    return null;
  }

  const startIndex = headerMatch.index + headerMatch[0].length;

  // Find the next h1 or end of content
  const nextHeaderMatch = content.slice(startIndex).match(/<h1[^>]*>/i);
  const endIndex = nextHeaderMatch?.index
    ? startIndex + nextHeaderMatch.index
    : content.indexOf('</en-note>');

  const sectionContent = content.slice(startIndex, endIndex);
  return stripEnml(sectionContent);
}

/**
 * Extract all sections from ENML content
 */
function extractAllSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const headerRegex = /<h1[^>]*>([^<]+)<\/h1>/gi;
  let match;

  while ((match = headerRegex.exec(content)) !== null) {
    const sectionName = match[1].trim();
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
  npx ts-node read-note.ts --guid <note-guid> [options]

Options:
  --guid <guid>       Note GUID (required)
  --section <name>    Extract specific section only
  --raw               Output raw ENML
  --help              Show this help

Examples:
  npx ts-node read-note.ts --guid "abc123"
  npx ts-node read-note.ts --guid "abc123" --section "Notes"
  npx ts-node read-note.ts --guid "abc123" --raw
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
