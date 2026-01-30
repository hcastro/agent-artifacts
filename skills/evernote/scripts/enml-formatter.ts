/**
 * ENML Formatter - Content-to-ENML conversion
 *
 * ENML (Evernote Markup Language) is a strict subset of XHTML. This module
 * bridges human-writable formats (plain text, markdown) to valid ENML.
 *
 * Key ENML constraints:
 * - All tags must be self-closing or properly balanced (<br/>, not <br>)
 * - Only inline styles allowed (no class attributes, no <style> blocks)
 * - Top-level wrapper is <en-note>, not <html>/<body>
 * - No active elements (script, form, iframe, etc.)
 */

import { Marked } from 'marked';

// ─── Types ───────────────────────────────────────────────────────────

export type ContentFormat = 'markdown' | 'plain' | 'enml';

// ─── ENML document envelope ─────────────────────────────────────────

const ENML_HEADER = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">`;

/**
 * Wrap body HTML in a complete ENML document.
 */
export function wrapEnml(bodyHtml: string): string {
  return `${ENML_HEADER}\n<en-note>\n${bodyHtml}\n</en-note>`;
}

// ─── Escaping ────────────────────────────────────────────────────────

/**
 * Escape plain text for safe insertion into ENML.
 * Converts special XML characters and newlines.
 */
export function escapeForEnml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>');
}

// ─── Markdown → ENML ────────────────────────────────────────────────

/**
 * Convert markdown to ENML-compliant XHTML body content.
 *
 * ENML requires:
 *  - Self-closing tags (<br/>, <hr/>, <img .../>)
 *  - Inline styles only (no class attributes, no <style> blocks)
 *
 * We use a Marked instance with custom renderer overrides for XHTML
 * compliance and inline styling, keeping defaults for everything else.
 */
function markdownToBody(md: string): string {
  const enmlMarked = new Marked({
    gfm: true,
    breaks: true,
    renderer: {
      // XHTML self-closing tags
      br: () => '<br/>',
      hr: () => '<hr/>',
      image(token: any) {
        const titleAttr = token.title ? ` title="${token.title}"` : '';
        return `<img src="${token.href}" alt="${token.text}"${titleAttr}/>`;
      },
      // Table cells — inline styles for borders and padding
      tablecell(token: any) {
        const tag = token.header ? 'th' : 'td';
        const baseStyle = 'border: 1px solid #ccc; padding: 8px 12px;';
        const headerExtra = token.header ? ' background-color: #f5f5f5; font-weight: bold;' : '';
        const alignExtra = token.align ? ` text-align: ${token.align};` : (token.header ? ' text-align: left;' : '');
        return `<${tag} style="${baseStyle}${headerExtra}${alignExtra}">${token.text}</${tag}>`;
      },
    } as any,
  });

  return enmlMarked.parse(md) as string;
}

// ─── Format dispatch ─────────────────────────────────────────────────

/**
 * Convert content to an ENML body fragment (no envelope).
 *
 * This is the low-level conversion used by both full-document creation
 * and section-level insertion.
 *
 * @param content  - The raw content string
 * @param format   - 'markdown' (default), 'plain', or 'enml'
 * @returns ENML-safe body HTML (not wrapped in <en-note>)
 */
export function toEnmlBody(content: string, format: ContentFormat = 'markdown'): string {
  switch (format) {
    case 'markdown':
      return markdownToBody(content);
    case 'plain':
      return escapeForEnml(content);
    case 'enml':
      return content; // Pass through — caller is responsible for validity
  }
}

/**
 * Convert content to a complete ENML document.
 *
 * @param content  - The raw content string
 * @param format   - 'markdown' (default), 'plain', or 'enml'
 * @returns Full ENML document with XML declaration and <en-note> wrapper
 */
export function toEnmlDocument(content: string, format: ContentFormat = 'markdown'): string {
  if (format === 'enml') {
    // Assume the caller provided a complete document
    return content;
  }
  return wrapEnml(toEnmlBody(content, format));
}
