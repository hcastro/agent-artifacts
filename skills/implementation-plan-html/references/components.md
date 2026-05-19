# Component snippets

Copy-paste HTML fragments that match the styling in `assets/template.html`. Use these to build sections. All classes are already styled by the template; do not add inline CSS.

## Code excerpt (real file, with path + line range)

Use when quoting existing code so the reader can locate it.

```html
<div class="excerpt">
  <div class="file-bar">
    <span class="path">src/auth/session.ts</span>
    <span class="lines">L42–L58</span>
  </div>
  <pre><code class="language-typescript">// exact excerpt from the file
export async function getSession(token: string) { ... }</code></pre>
</div>
```

Rules:
- `path` must be the real path from repo root.
- `lines` must reflect actual line numbers — read the file to confirm.
- Inside `<code>`, escape `<` as `&lt;` and `&` as `&amp;`.
- Use a `language-*` class hljs recognizes (`language-typescript`, `language-python`, `language-tsx`, `language-rust`, `language-go`, `language-bash`, `language-json`, `language-sql`).

## Diff block (proposed change)

```html
<div class="diff">
  <div class="file-bar">src/auth/session.ts</div>
  <pre><code class="language-diff"> unchanged context line
<span class="hl-del">-  removed line</span>
<span class="hl-add">+  added line</span>
 unchanged context line</code></pre>
</div>
```

Rules:
- Wrap each removed line in `<span class="hl-del">-  …</span>` and each added line in `<span class="hl-add">+  …</span>` so the row is fully background-tinted.
- Keep at least one unchanged context line above and below the change.

## File tree (with new/modified markers)

```html
<div class="tree">project/
├── src/
│   ├── <span class="mod">auth/session.ts</span>     <span class="comment"># modify</span>
│   └── <span class="new">auth/refresh.ts</span>      <span class="comment"># new</span>
└── tests/
    └── <span class="del">auth/legacy.test.ts</span>  <span class="comment"># delete</span></div>
```

Use the box-drawing characters `├ ─ │ └` and align comments with spaces — the container is `white-space: pre`.

## Mermaid diagram

```html
<div class="mermaid">
flowchart LR
  Client -->|request| API
  API --> DB[(Postgres)]
</div>
```

Useful diagram types: `flowchart`, `sequenceDiagram`, `stateDiagram-v2`, `erDiagram`, `classDiagram`. Theme is set to dark in the template.

## Mockup frame (ASCII)

```html
<div class="mockup">
  <div class="title-bar">
    <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    <span class="url">app.example.com/path</span>
  </div>
  <div class="frame">
<pre class="ascii">┌─────────────────────────────┐
│  Header                     │
│  ┌───────────────────────┐  │
│  │  content area         │  │
│  └───────────────────────┘  │
└─────────────────────────────┘</pre>
  </div>
</div>
```

Keep ASCII width under ~70 chars to fit the main column on small screens.

## Mockup frame (live HTML)

When ASCII is not expressive enough, render a real-ish HTML mockup inside the frame:

```html
<div class="mockup">
  <div class="title-bar">
    <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    <span class="url">app.example.com/dashboard</span>
  </div>
  <div class="frame">
    <h3 style="margin-top:0">Dashboard</h3>
    <p>Quick sketch of layout using normal HTML.</p>
  </div>
</div>
```

Inline `style=` is fine inside mockup frames — it's the one place where layout-specific styling is expected.

## Callout (info / warn / danger / ok)

```html
<div class="callout">
  <div class="label">Note</div>
  Plain context the reader should not miss.
</div>

<div class="callout warn">
  <div class="label">Decision</div>
  <strong>Chose X over Y.</strong> Because Z.
</div>

<div class="callout danger">
  <div class="label">Risk</div>
  <strong>Failure mode.</strong> Mitigation: …
</div>

<div class="callout ok">
  <div class="label">Confirmed</div>
  Verified against staging on 2026-05-18.
</div>
```

## Step checklist

```html
<ul class="checklist">
  <li><input type="checkbox">
    <div>
      <strong>Add the <code>RefreshClient</code> interface</strong>
      <div class="step-meta">src/auth/refresh.ts · new file · ~20 LOC</div>
    </div>
  </li>
</ul>
```

Each step should name the file(s) touched and a rough LOC or scope hint. Checkboxes are clickable in the browser; they're a working scratchpad for the reader.

## Comparison table

```html
<table>
  <thead><tr><th>Option</th><th>Pros</th><th>Cons</th></tr></thead>
  <tbody>
    <tr><td>A</td><td>…</td><td>…</td></tr>
    <tr><td>B</td><td>…</td><td>…</td></tr>
  </tbody>
</table>
```

## Badges (in the hero meta row)

```html
<span class="badge">main</span>
<span class="badge ok">ready for review</span>
<span class="badge warn">draft</span>
<span class="badge danger">blocked</span>
```

## Lede paragraph (editorial opening)

For the top of the Summary section, or anywhere you want the first sentence to land with weight:

```html
<p class="lede">Two or three confident sentences. No hedging. This is the magazine lede of the document.</p>
```

The `.lede` class renders in Fraunces at 19px with relaxed leading. Use it sparingly — once or twice per document.

## Hero title with italic accent

The hero `h1` supports an italicized continuation in the accent color:

```html
<h1>Refactor the auth layer<br><em>without breaking sessions</em></h1>
```

This is the one place inline `<em>` is styled with intent — use it for a phrase that completes the title, not for arbitrary emphasis.

## Two-column layout

For goals/non-goals, before/after, or trade-off pairs:

```html
<div class="cols">
  <div><h4>Before</h4>…</div>
  <div><h4>After</h4>…</div>
</div>
```
