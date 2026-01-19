/**
 * Evernote Client - Core API wrapper
 *
 * Provides authenticated access to Evernote API with helper methods
 * for common operations.
 */

import Evernote from 'evernote';

/**
 * Get the Evernote token from environment variable
 * @throws Error if EVERNOTE_TOKEN is not set
 */
export function getToken(): string {
  const token = process.env.EVERNOTE_TOKEN;
  if (!token) {
    console.error('Error: EVERNOTE_TOKEN environment variable is not set.');
    console.error('');
    console.error('To get a developer token:');
    console.error('1. Go to https://dev.evernote.com/doc/');
    console.error('2. Sign in with your Evernote account');
    console.error('3. Generate a developer token');
    console.error('4. Set it: export EVERNOTE_TOKEN="your-token-here"');
    process.exit(1);
  }
  return token;
}

/**
 * Create an authenticated Evernote client
 */
export function createClient(): Evernote.Client {
  const token = getToken();
  return new Evernote.Client({
    token,
    sandbox: false,
  });
}

/**
 * Get the NoteStore for note operations
 */
export function getNoteStore(): Evernote.NoteStoreClient {
  const client = createClient();
  return client.getNoteStore();
}

/**
 * Get the UserStore for user operations
 */
export function getUserStore(): Evernote.UserStoreClient {
  const client = createClient();
  return client.getUserStore();
}

/**
 * Verify the token is valid by fetching user info
 */
export async function verifyToken(): Promise<{ valid: boolean; username?: string; error?: string }> {
  try {
    const userStore = getUserStore();
    const user = await userStore.getUser();
    return { valid: true, username: user.username ?? undefined };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { valid: false, error };
  }
}

/**
 * Find a tag by name (case-insensitive)
 */
export async function findTagByName(tagName: string): Promise<Evernote.Types.Tag | null> {
  const noteStore = getNoteStore();
  const tags = await noteStore.listTags();
  return tags.find(t => t.name?.toLowerCase() === tagName.toLowerCase()) ?? null;
}

/**
 * Find tags by names (case-insensitive)
 */
export async function findTagsByNames(tagNames: string[]): Promise<Evernote.Types.Tag[]> {
  const noteStore = getNoteStore();
  const tags = await noteStore.listTags();
  const lowerNames = tagNames.map(n => n.toLowerCase());
  return tags.filter(t => t.name && lowerNames.includes(t.name.toLowerCase()));
}

/**
 * Strip HTML/ENML tags and normalize whitespace
 */
export function stripEnml(content: string): string {
  return content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse command line arguments into key-value pairs
 * Supports: --key value, --key=value, --flag
 */
export function parseArgs(args: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);

      if (key.includes('=')) {
        const [k, v] = key.split('=');
        result[k] = v;
      } else if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        result[key] = args[i + 1];
        i++;
      } else {
        result[key] = true;
      }
    }
  }

  return result;
}

/**
 * Format a date for display
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Re-export Evernote types for convenience
export { Evernote };
