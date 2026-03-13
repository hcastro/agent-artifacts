# Jira REST API v3 Reference Guide

A comprehensive guide for using the Jira Cloud REST API v3 with Atlassian Document Format (ADF) for rich text formatting.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Creating Issues](#creating-issues)
- [Updating Issues](#updating-issues)
- [Atlassian Document Format (ADF)](#atlassian-document-format-adf)
  - [Document Structure](#document-structure)
  - [Block Nodes](#block-nodes)
  - [Inline Nodes](#inline-nodes)
  - [Marks (Formatting)](#marks-formatting)
  - [Common ADF Patterns](#common-adf-patterns)
- [Adding Comments](#adding-comments)
- [Field Discovery](#field-discovery)
- [Error Handling](#error-handling)
- [TypeScript Implementation](#typescript-implementation)
- [curl Examples](#curl-examples)
- [Tips and Best Practices](#tips-and-best-practices)

---

## Overview

The Jira Cloud REST API v3 provides native support for Atlassian Document Format (ADF), enabling rich text in issue descriptions, comments, and multi-line text fields.

**Key Differences from API v2:**
- v3 uses ADF for rich text fields (description, comments)
- v2 uses plain text with optional wiki markup
- v3 does NOT accept plain text strings for description — ADF is required

**When to use v3 over acli:**
- Full control over ADF structure
- Complex formatting (tables, panels, code blocks with syntax highlighting)
- Programmatic ticket creation with rich content
- Better error visibility and debugging

---

## Authentication

### API Token Authentication (Required for Cloud)

Jira Cloud requires API tokens for authentication. Password-based basic auth is deprecated.

#### 1. Generate an API Token

1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a descriptive label (e.g., "claude-code-jira")
4. Copy the token immediately (you won't see it again)

> **Note:** As of 2025, API tokens expire after 1 year by default.

#### 2. Build the Authorization Header

```bash
# Format: email:api_token
# Base64 encode the string
echo -n "your.email@company.com:your-api-token" | base64
```

#### 3. Use in Requests

```bash
# Header format
Authorization: Basic <base64-encoded-credentials>

# Example with curl
curl -H "Authorization: Basic $(echo -n '$JIRA_EMAIL:$JIRA_API_TOKEN' | base64)" \
     -H "Content-Type: application/json" \
     "https://$JIRA_BASE_URL/rest/api/3/issue"
```

### Environment Variables

```bash
# Recommended setup
export JIRA_EMAIL="your.email@company.com"
export JIRA_API_TOKEN="your-api-token"
export JIRA_BASE_URL="yoursite.atlassian.net"  # Without https://
```

---

## Base URL

```
https://{your-domain}.atlassian.net/rest/api/3
```

Replace `{your-domain}` with your Jira Cloud instance domain.

---

## Creating Issues

### Endpoint

```
POST /rest/api/3/issue
```

### Request Headers

```
Content-Type: application/json
Authorization: Basic <base64-credentials>
```

### Basic Request Body

```json
{
  "fields": {
    "project": {
      "key": "PROJ"
    },
    "issuetype": {
      "name": "Task"
    },
    "summary": "Issue title here",
    "description": {
      "version": 1,
      "type": "doc",
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "Issue description here"
            }
          ]
        }
      ]
    }
  }
}
```

### Full Request Body with Common Fields

```json
{
  "fields": {
    "project": {
      "key": "PROJ"
    },
    "issuetype": {
      "name": "Task"
    },
    "summary": "Implement user authentication",
    "description": {
      "version": 1,
      "type": "doc",
      "content": []
    },
    "priority": {
      "name": "High"
    },
    "labels": ["backend", "auth"],
    "assignee": {
      "accountId": "5b10a2844c20165700ede21g"
    },
    "reporter": {
      "accountId": "5b10a2844c20165700ede21g"
    },
    "parent": {
      "key": "PROJ-100"
    },
    "components": [
      {
        "name": "Backend"
      }
    ]
  }
}
```

### Response (Success - 201)

```json
{
  "id": "10001",
  "key": "PROJ-123",
  "self": "https://yoursite.atlassian.net/rest/api/3/issue/10001"
}
```

---

## Updating Issues

### Endpoint

```
PUT /rest/api/3/issue/{issueIdOrKey}
```

### Update Description Only

```json
{
  "fields": {
    "description": {
      "version": 1,
      "type": "doc",
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "Updated description"
            }
          ]
        }
      ]
    }
  }
}
```

### Update Custom Fields (Using Config)

Read field IDs from `.jira-config.json` rather than hardcoding:

```typescript
const config = JSON.parse(fs.readFileSync('.jira-config.json', 'utf8'));

// Update story points
await fetch(`https://${config.instance.baseUrl}/rest/api/3/issue/${issueKey}`, {
  method: "PUT",
  headers: { Authorization: authHeader, "Content-Type": "application/json" },
  body: JSON.stringify({
    fields: { [config.fields.storyPoints.id]: 5 }
  })
});
```

### Response (Success - 204)

No content returned on successful update.

---

## Atlassian Document Format (ADF)

ADF is a JSON-based format for representing rich text in Atlassian products.

### Document Structure

Every ADF document has this root structure:

```json
{
  "version": 1,
  "type": "doc",
  "content": [
    // Array of block nodes
  ]
}
```

### Block Nodes

Block nodes form the structural foundation of documents.

#### Paragraph

```json
{
  "type": "paragraph",
  "content": [
    { "type": "text", "text": "Regular paragraph text" }
  ]
}
```

#### Heading (h1-h6)

```json
{
  "type": "heading",
  "attrs": { "level": 2 },
  "content": [
    { "type": "text", "text": "Section Title" }
  ]
}
```

#### Bullet List

```json
{
  "type": "bulletList",
  "content": [
    {
      "type": "listItem",
      "content": [
        {
          "type": "paragraph",
          "content": [{ "type": "text", "text": "First item" }]
        }
      ]
    },
    {
      "type": "listItem",
      "content": [
        {
          "type": "paragraph",
          "content": [{ "type": "text", "text": "Second item" }]
        }
      ]
    }
  ]
}
```

#### Ordered List

```json
{
  "type": "orderedList",
  "attrs": { "order": 1 },
  "content": [
    {
      "type": "listItem",
      "content": [
        {
          "type": "paragraph",
          "content": [{ "type": "text", "text": "Step one" }]
        }
      ]
    }
  ]
}
```

#### Code Block

```json
{
  "type": "codeBlock",
  "attrs": { "language": "typescript" },
  "content": [
    { "type": "text", "text": "const x = 42;" }
  ]
}
```

Supported languages: `javascript`, `typescript`, `python`, `java`, `go`, `bash`, `json`, `yaml`, `sql`, `html`, `css`, and many more.

#### Blockquote

```json
{
  "type": "blockquote",
  "content": [
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Quoted text here" }]
    }
  ]
}
```

#### Horizontal Rule

```json
{
  "type": "rule"
}
```

#### Panel (Info, Note, Warning, Error, Success)

```json
{
  "type": "panel",
  "attrs": { "panelType": "warning" },
  "content": [
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Warning message here" }]
    }
  ]
}
```

Panel types: `info`, `note`, `warning`, `error`, `success`

#### Table

```json
{
  "type": "table",
  "attrs": { "isNumberColumnEnabled": false, "layout": "default" },
  "content": [
    {
      "type": "tableRow",
      "content": [
        {
          "type": "tableHeader",
          "attrs": {},
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "Column 1" }]
            }
          ]
        },
        {
          "type": "tableHeader",
          "attrs": {},
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "Column 2" }]
            }
          ]
        }
      ]
    },
    {
      "type": "tableRow",
      "content": [
        {
          "type": "tableCell",
          "attrs": {},
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "Value 1" }]
            }
          ]
        },
        {
          "type": "tableCell",
          "attrs": {},
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "Value 2" }]
            }
          ]
        }
      ]
    }
  ]
}
```

#### Expand (Collapsible Section)

```json
{
  "type": "expand",
  "attrs": { "title": "Click to expand" },
  "content": [
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Hidden content here" }]
    }
  ]
}
```

### Inline Nodes

Inline nodes contain content within block nodes.

#### Text

```json
{ "type": "text", "text": "Plain text" }
```

#### Hard Break (Line Break)

```json
{ "type": "hardBreak" }
```

#### Emoji

```json
{
  "type": "emoji",
  "attrs": {
    "shortName": ":thumbsup:",
    "id": "1f44d",
    "text": "\ud83d\udc4d"
  }
}
```

#### Mention

```json
{
  "type": "mention",
  "attrs": {
    "id": "5b10a2844c20165700ede21g",
    "text": "@John Smith",
    "accessLevel": ""
  }
}
```

#### Status Badge

```json
{
  "type": "status",
  "attrs": {
    "text": "IN PROGRESS",
    "color": "blue",
    "localId": "unique-id",
    "style": ""
  }
}
```

Colors: `neutral`, `purple`, `blue`, `green`, `yellow`, `red`

#### Inline Card (Smart Link)

```json
{
  "type": "inlineCard",
  "attrs": {
    "url": "https://github.com/owner/repo/pull/123"
  }
}
```

### Marks (Formatting)

Marks are applied to text nodes to add formatting.

#### Bold

```json
{
  "type": "text",
  "text": "Bold text",
  "marks": [{ "type": "strong" }]
}
```

#### Italic

```json
{
  "type": "text",
  "text": "Italic text",
  "marks": [{ "type": "em" }]
}
```

#### Strikethrough

```json
{
  "type": "text",
  "text": "Strikethrough text",
  "marks": [{ "type": "strike" }]
}
```

#### Underline

```json
{
  "type": "text",
  "text": "Underlined text",
  "marks": [{ "type": "underline" }]
}
```

#### Inline Code

```json
{
  "type": "text",
  "text": "code snippet",
  "marks": [{ "type": "code" }]
}
```

#### Link

```json
{
  "type": "text",
  "text": "Click here",
  "marks": [
    {
      "type": "link",
      "attrs": {
        "href": "https://example.com",
        "title": "Link title"
      }
    }
  ]
}
```

#### Text Color

```json
{
  "type": "text",
  "text": "Colored text",
  "marks": [
    {
      "type": "textColor",
      "attrs": { "color": "#ff0000" }
    }
  ]
}
```

#### Subscript / Superscript

```json
{
  "type": "text",
  "text": "2",
  "marks": [{ "type": "subsup", "attrs": { "type": "sub" } }]
}
```

#### Combined Marks

```json
{
  "type": "text",
  "text": "Bold and italic link",
  "marks": [
    { "type": "strong" },
    { "type": "em" },
    { "type": "link", "attrs": { "href": "https://example.com" } }
  ]
}
```

### Common ADF Patterns

#### Ticket Description with Structured Sections

```json
{
  "version": 1,
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 3 },
      "content": [{ "type": "text", "text": "Overview" }]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                { "type": "text", "text": "Source: ", "marks": [{ "type": "strong" }] },
                { "type": "text", "text": "Dependabot" }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                { "type": "text", "text": "Severity: ", "marks": [{ "type": "strong" }] },
                {
                  "type": "status",
                  "attrs": { "text": "HIGH", "color": "red" }
                }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                { "type": "text", "text": "Package: ", "marks": [{ "type": "strong" }] },
                { "type": "text", "text": "lodash@4.17.20", "marks": [{ "type": "code" }] }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "View details",
          "marks": [
            {
              "type": "link",
              "attrs": { "href": "https://github.com/owner/repo/security/dependabot/1" }
            }
          ]
        }
      ]
    },
    { "type": "rule" },
    {
      "type": "heading",
      "attrs": { "level": 3 },
      "content": [{ "type": "text", "text": "Acceptance Criteria" }]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "Issue is resolved" }]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "No regressions introduced" }]
            }
          ]
        }
      ]
    }
  ]
}
```

#### Warning Panel with Details

```json
{
  "version": 1,
  "type": "doc",
  "content": [
    {
      "type": "panel",
      "attrs": { "panelType": "warning" },
      "content": [
        {
          "type": "paragraph",
          "content": [
            { "type": "text", "text": "This issue requires ", "marks": [{ "type": "strong" }] },
            { "type": "text", "text": "immediate attention", "marks": [{ "type": "strong" }, { "type": "em" }] },
            { "type": "text", "text": "." }
          ]
        }
      ]
    }
  ]
}
```

---

## Adding Comments

### Endpoint

```
POST /rest/api/3/issue/{issueIdOrKey}/comment
```

### Request Body

```json
{
  "body": {
    "version": 1,
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "Comment with " },
          { "type": "text", "text": "formatting", "marks": [{ "type": "strong" }] }
        ]
      }
    ]
  }
}
```

---

## Field Discovery

Custom fields vary across Jira instances. Use these techniques to discover field IDs for your environment.

### List All Fields

```bash
curl -s \
  -H "Authorization: Basic $(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)" \
  -H "Accept: application/json" \
  "https://$JIRA_BASE_URL/rest/api/3/field" \
  | jq '[.[] | select(.custom == true) | {name, id, schema: .schema.type}]'
```

### Search by Name

```typescript
const fields = await fetch(`https://${baseUrl}/rest/api/3/field`, {
  headers: { Authorization: authHeader, Accept: "application/json" }
}).then(r => r.json());

// Find story point fields
const storyPointFields = fields.filter(f =>
  f.name.toLowerCase().includes("story") ||
  f.name.toLowerCase().includes("point")
);
console.log(storyPointFields.map(f => `${f.name}: ${f.id} (${f.schema?.type})`));

// Find acceptance criteria
const acFields = fields.filter(f =>
  f.name.toLowerCase().includes("acceptance") ||
  f.name.toLowerCase().includes("criteria")
);
```

### Inspect an Existing Issue

Create an issue manually with desired formatting, then GET it to see the exact ADF structure:

```bash
curl -s \
  -H "Authorization: Basic $(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)" \
  "https://$JIRA_BASE_URL/rest/api/3/issue/PROJ-123?fields=description" \
  | jq '.fields.description'
```

### Discover Issue Types

```bash
curl -s \
  -H "Authorization: Basic $(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)" \
  "https://$JIRA_BASE_URL/rest/api/3/issuetype" \
  | jq '[.[] | {name, id, subtask}]'
```

### Discover Statuses

```bash
curl -s \
  -H "Authorization: Basic $(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)" \
  "https://$JIRA_BASE_URL/rest/api/3/status" \
  | jq '[.[] | {name, id, statusCategory: .statusCategory.name}]'
```

### Save to Configuration

After discovery, save field mappings to `.jira-config.json` so they don't need to be re-discovered:

```typescript
const config = {
  instance: { baseUrl: process.env.JIRA_BASE_URL },
  project: { key: "PROJ", name: "My Project" },
  fields: {
    storyPoints: { id: "customfield_XXXXX", name: "Story Points" },
    sprint: { id: "customfield_10020", name: "Sprint" },
    acceptanceCriteria: { id: "customfield_XXXXX", name: "Acceptance Criteria" }
  }
};
fs.writeFileSync('.jira-config.json', JSON.stringify(config, null, 2));
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request - Invalid ADF

```json
{
  "errorMessages": [],
  "errors": {
    "description": "Operation value must be a valid Atlassian Document"
  }
}
```

**Causes:**
- Missing `version` or `type` at root level
- Invalid node type
- Incorrect nesting (e.g., text directly in bulletList)
- Missing required `content` array in block nodes

#### 400 Bad Request - Invalid Field

```json
{
  "errorMessages": [],
  "errors": {
    "project": "project is required"
  }
}
```

#### 401 Unauthorized

```json
{
  "message": "Client must be authenticated to access this resource."
}
```

**Causes:**
- Missing or invalid Authorization header
- Expired API token
- Incorrect email/token combination

#### 403 Forbidden

```json
{
  "errorMessages": ["You do not have permission to create issues in this project."]
}
```

#### 404 Not Found

```json
{
  "errorMessages": ["Issue does not exist or you do not have permission to see it."]
}
```

### Validating ADF

Use the JSON schema for validation: http://go.atlassian.com/adf-json-schema

---

## TypeScript Implementation

### ADF Builder Utilities

```typescript
// adf-builder.ts

export interface AdfNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

export interface AdfDocument {
  version: 1;
  type: "doc";
  content: AdfNode[];
}

// Text with optional marks
export function text(content: string, marks?: AdfNode["marks"]): AdfNode {
  const node: AdfNode = { type: "text", text: content };
  if (marks?.length) node.marks = marks;
  return node;
}

// Paragraph
export function paragraph(...content: AdfNode[]): AdfNode {
  return { type: "paragraph", content };
}

// Heading
export function heading(level: 1 | 2 | 3 | 4 | 5 | 6, content: string): AdfNode {
  return {
    type: "heading",
    attrs: { level },
    content: [text(content)],
  };
}

// Bullet list from strings
export function bulletList(items: string[]): AdfNode {
  return {
    type: "bulletList",
    content: items.map((item) => ({
      type: "listItem",
      content: [paragraph(text(item))],
    })),
  };
}

// Link
export function link(label: string, href: string): AdfNode {
  return text(label, [{ type: "link", attrs: { href } }]);
}

// Code (inline)
export function code(content: string): AdfNode {
  return text(content, [{ type: "code" }]);
}

// Bold
export function bold(content: string): AdfNode {
  return text(content, [{ type: "strong" }]);
}

// Code block
export function codeBlock(content: string, language?: string): AdfNode {
  return {
    type: "codeBlock",
    attrs: language ? { language } : {},
    content: [text(content)],
  };
}

// Horizontal rule
export function rule(): AdfNode {
  return { type: "rule" };
}

// Panel
export function panel(
  panelType: "info" | "note" | "warning" | "error" | "success",
  ...content: AdfNode[]
): AdfNode {
  return {
    type: "panel",
    attrs: { panelType },
    content,
  };
}

// Status badge
export function status(
  label: string,
  color: "neutral" | "purple" | "blue" | "green" | "yellow" | "red"
): AdfNode {
  return {
    type: "status",
    attrs: {
      text: label.toUpperCase(),
      color,
      localId: `status-${Date.now()}`,
      style: "",
    },
  };
}

// Build complete document
export function doc(...content: AdfNode[]): AdfDocument {
  return {
    version: 1,
    type: "doc",
    content,
  };
}
```

### Jira API Client

```typescript
// jira-client.ts

import { AdfDocument } from "./adf-builder";

interface JiraConfig {
  baseUrl: string; // e.g., "yoursite.atlassian.net"
  email: string;
  apiToken: string;
}

interface CreateIssueParams {
  projectKey: string;
  issueType: string;
  summary: string;
  description: AdfDocument;
  labels?: string[];
  priority?: string;
  assigneeAccountId?: string;
}

interface CreateIssueResponse {
  id: string;
  key: string;
  self: string;
}

export class JiraClient {
  private authHeader: string;
  private apiUrl: string;

  constructor(private config: JiraConfig) {
    const credentials = Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");
    this.authHeader = `Basic ${credentials}`;
    this.apiUrl = `https://${config.baseUrl}/rest/api/3`;
  }

  async createIssue(params: CreateIssueParams): Promise<CreateIssueResponse> {
    const body: Record<string, unknown> = {
      fields: {
        project: { key: params.projectKey },
        issuetype: { name: params.issueType },
        summary: params.summary,
        description: params.description,
      },
    };

    if (params.labels?.length) {
      (body.fields as Record<string, unknown>).labels = params.labels;
    }

    if (params.priority) {
      (body.fields as Record<string, unknown>).priority = { name: params.priority };
    }

    if (params.assigneeAccountId) {
      (body.fields as Record<string, unknown>).assignee = { accountId: params.assigneeAccountId };
    }

    const response = await fetch(`${this.apiUrl}/issue`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create issue: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  async updateIssue(issueKey: string, fields: Record<string, unknown>): Promise<void> {
    const response = await fetch(`${this.apiUrl}/issue/${issueKey}`, {
      method: "PUT",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to update issue: ${JSON.stringify(error)}`);
    }
  }

  async addComment(issueKey: string, body: AdfDocument): Promise<void> {
    const response = await fetch(`${this.apiUrl}/issue/${issueKey}/comment`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to add comment: ${JSON.stringify(error)}`);
    }
  }

  async discoverFields(): Promise<Array<{ name: string; id: string; custom: boolean; schema?: { type: string } }>> {
    const response = await fetch(`${this.apiUrl}/field`, {
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch fields: ${response.status}`);
    }

    return response.json();
  }

  getIssueUrl(key: string): string {
    return `https://${this.config.baseUrl}/browse/${key}`;
  }
}
```

### Usage Example

```typescript
import {
  doc,
  heading,
  bulletList,
  paragraph,
  text,
  bold,
  link,
  code,
  rule,
  panel,
  status,
} from "./adf-builder";
import { JiraClient } from "./jira-client";

const client = new JiraClient({
  baseUrl: process.env.JIRA_BASE_URL!,
  email: process.env.JIRA_EMAIL!,
  apiToken: process.env.JIRA_API_TOKEN!,
});

// Build rich description
const description = doc(
  heading(3, "Overview"),
  bulletList([
    "Source: Dependabot",
    "Package: lodash@4.17.20",
  ]),
  paragraph(link("View details", "https://github.com/owner/repo/issues/1")),
  rule(),
  heading(3, "Acceptance Criteria"),
  bulletList([
    "Issue is resolved",
    "No regressions introduced",
  ])
);

// Create issue
const result = await client.createIssue({
  projectKey: "PROJ",
  issueType: "Task",
  summary: "Update lodash dependency",
  description,
  labels: ["dependency", "maintenance"],
  priority: "High",
});

console.log(`Created: ${client.getIssueUrl(result.key)}`);
```

---

## curl Examples

### Create Issue with Rich Description

```bash
curl -X POST \
  -H "Authorization: Basic $(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)" \
  -H "Content-Type: application/json" \
  "https://$JIRA_BASE_URL/rest/api/3/issue" \
  -d '{
    "fields": {
      "project": { "key": "PROJ" },
      "issuetype": { "name": "Task" },
      "summary": "Test issue with rich text",
      "description": {
        "version": 1,
        "type": "doc",
        "content": [
          {
            "type": "heading",
            "attrs": { "level": 3 },
            "content": [{ "type": "text", "text": "Overview" }]
          },
          {
            "type": "paragraph",
            "content": [
              { "type": "text", "text": "This is " },
              { "type": "text", "text": "important", "marks": [{ "type": "strong" }] }
            ]
          }
        ]
      },
      "labels": ["test"]
    }
  }'
```

### Get Issue Description (to inspect ADF)

```bash
curl -s \
  -H "Authorization: Basic $(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)" \
  "https://$JIRA_BASE_URL/rest/api/3/issue/PROJ-123?fields=description" \
  | jq '.fields.description'
```

### Add Comment

```bash
curl -X POST \
  -H "Authorization: Basic $(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)" \
  -H "Content-Type: application/json" \
  "https://$JIRA_BASE_URL/rest/api/3/issue/PROJ-123/comment" \
  -d '{
    "body": {
      "version": 1,
      "type": "doc",
      "content": [
        {
          "type": "paragraph",
          "content": [{ "type": "text", "text": "Work in progress" }]
        }
      ]
    }
  }'
```

### Discover Custom Fields

```bash
curl -s \
  -H "Authorization: Basic $(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)" \
  "https://$JIRA_BASE_URL/rest/api/3/field" \
  | jq '[.[] | select(.custom == true) | {name, id, type: .schema.type}]'
```

### Move Issue to Sprint (Agile API)

```bash
curl -X POST \
  -H "Authorization: Basic $(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)" \
  -H "Content-Type: application/json" \
  "https://$JIRA_BASE_URL/rest/agile/1.0/sprint/<SPRINT_ID>/issue" \
  -d '{ "issues": ["PROJ-123"] }'
```

---

## Tips and Best Practices

### 1. Validate Before Sending

Use the ADF JSON schema to validate documents before making API calls:
http://go.atlassian.com/adf-json-schema

### 2. Start Simple

Begin with basic structures (paragraphs, headings, lists) before adding complex elements like tables.

### 3. Inspect Existing Issues

Create an issue manually with desired formatting, then fetch it via API to see the exact ADF:

```bash
curl -s \
  -H "Authorization: Basic $(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)" \
  "https://$JIRA_BASE_URL/rest/api/3/issue/PROJ-123?fields=description" \
  | jq '.fields.description'
```

### 4. Handle Empty Content

Some nodes require non-empty content arrays. Use this pattern for optional sections:

```typescript
const content: AdfNode[] = [];
if (condition) {
  content.push(paragraph(text("Conditional content")));
}
// Only add if content exists
if (content.length > 0) {
  doc.content.push(...content);
}
```

### 5. Avoid Common Mistakes

- **Wrong:** Text directly in bulletList
- **Right:** Text in paragraph in listItem in bulletList

- **Wrong:** Missing `version: 1` at root
- **Right:** Always include `version: 1` and `type: "doc"`

- **Wrong:** Using plain string for description in v3
- **Right:** Always use ADF object for description

### 6. Environment Variables

Keep credentials secure:

```bash
# .env (never commit)
JIRA_BASE_URL=yoursite.atlassian.net
JIRA_EMAIL=your.email@company.com
JIRA_API_TOKEN=your-api-token
```

### 7. Rate Limiting

Jira Cloud has rate limits. Implement exponential backoff for bulk operations:

```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}
```

### 8. Use Configuration Files

Store instance-specific values (custom field IDs, board IDs, sprint IDs) in `.jira-config.json` rather than hardcoding them. See the [Field Discovery](#field-discovery) section and the main SKILL.md for configuration setup.

---

## Additional Resources

- [Jira Cloud REST API v3 - Official Docs](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
- [Atlassian Document Format Structure](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/)
- [ADF JSON Schema](http://go.atlassian.com/adf-json-schema)
- [Basic Auth for REST APIs](https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/)
- [Manage API Tokens](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/)
