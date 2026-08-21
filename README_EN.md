# WeChat Obsidian Publisher

[简体中文](README.md) · [GitHub](https://github.com/summerchaserwwz/wechat-obsidian-publisher) · [Issues](https://github.com/summerchaserwwz/wechat-obsidian-publisher/issues)

> Turn Markdown into controlled, round-trippable, reusable WeChat draft HTML.
>
> Write in Obsidian, tune the article on the same canvas, validate the final HTML, and send that exact prepared output to the draft box.

![v0.2.10 template workbench with macOS code window](docs/screenshots/workbench-v0210.png)

![v0.2.10 phone reading preview](docs/screenshots/mobile-preview-v0210.png)

## Why this release is worth the update

| Workflow | What changed |
| --- | --- |
| Template switching | Selecting, favoriting, opening, or closing the library restores the visible template anchor instead of jumping to the top. |
| Code blocks | macOS Dark, macOS Light, and Plain Safe profiles materialize the chrome, traffic-light dots, language label, and syntax colours in final HTML. |
| Phone reading | Defaults are `15px` body text, `1.72` line height, `10px` paragraph spacing, and `4px` horizontal padding. Preview and WeChat drafts share the same prepared HTML. |
| Template authoring | Duplicate any built-in template into an editable user template, tune modules and code blocks, and import or export JSON. |

This is not preview-only CSS. The plugin compiles Markdown into WeChat-safe inline HTML first, renders the preview from that prepared document, and submits the same document to WeChat. After publishing, it reads the draft back through `draft/get` and checks parity.

[Open the v0.2.10 local demo](docs/demo-v0210.html) · [Read the release notes](docs/release-notes/v0.2.10.md)

## Highlights

- Preview the active Markdown note in a dedicated side workbench with phone, WeChat article, or desktop framing.
- Choose from 130 built-in templates, including the new **Mac Code Notes**, the MD2 catalog, all 12 original Wenyan themes, and traceable open-source themes. Body copy, lists, quotes, and tables use a left-aligned reading baseline.
- Search, filter, favorite, import, and export templates from a translucent left rail while the article stays visible. Favorites are pinned first.
- Template rows remain text-first with a favorite action. Selecting, favoriting, or opening and closing the library keeps your current list position.
- Duplicate any built-in template into a user template, edit colors, typography, font size, line height, and code-block appearance, or import and export full JSON.
- Compose nine before-and-after content modules: intro, before table, after table, ending, recommendations, author bio, follow card, copyright notice, and custom content.
- Add, edit, enable, delete, and reorder modules. Table modules are placed around the first Markdown table.
- Render tables, highlighted code, KaTeX, Mermaid, local Obsidian images, and regular Markdown images.
- Upload body images and a cover, then create or update a WeChat draft. Reused images upload once and body-image uploads use bounded concurrency.
- Read the draft back through `draft/get`. The plugin does not report success if the title, structure, or inline styles differ from the preview.

## Phone Reading and Preview Parity

Templates without an explicit layout setting use the **Phone Reading** preset: `15px` body text, `1.72` line height, `10px` paragraph spacing, `20px` heading space, `0px` vertical padding, and `4px` horizontal padding. Those values are written as inline WeChat HTML, not borrowed from Obsidian preview CSS, so the preview and the submitted draft share the same styling rules.

There is no separate layout modal. Adjust the current template directly on the preview:

- Use the upper-right controls for Source, Phone, Standard, or Relaxed reading presets
- Switch the upper-right frame between Phone, WeChat, and Desktop
- Decrease, inspect, or increase the body font size in the top control bar
- Decrease, inspect, or increase article padding in the top control bar

**Source Theme** preserves the upstream layout. It is useful for source fidelity but can restore wider web-oriented margins.

The font and spacing controls live in the top bar, so opening the template library cannot make them cover the phone frame or article. Device chrome only simulates the reading context and is never included in the submitted article. The frame contains the same fully prepared HTML that is sent to WeChat. After draft creation, the plugin also reads the result back through `draft/get` and compares the title, structure, and inline styles.

## macOS Code Blocks

Every template defaults to the **macOS Dark** code profile. It does not rely on preview-only CSS: the frame, three window dots, language label, background, and syntax colors are materialized as final inline HTML, so preview and WeChat draft use the same result.

- The code window applies only to fenced code blocks. Inline code stays inline.
- Choose **Mac Code Notes** for a clean left-aligned technical article. Use **Duplicate and edit** to make it your own template.
- The user-template editor offers macOS Dark, macOS Light, and Plain Safe presets, with switches for the title bar and language label.
- Advanced JSON exposes `codeBlockProfile` for precise control of background, foreground, border, window dots, and syntax colours.

## Relationship to Wenyan Core

The plugin does not depend on or run `@wenyan-md/core`. It independently implements Markdown parsing, structural enrichment, template compilation, image preparation, and WeChat draft publishing. "Wenyan Original" means that the corresponding source theme CSS is bundled to preserve details such as Pie heading decorations. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for attribution.

## Installation

The plugin is currently distributed through GitHub source or releases. It is not yet listed in the Obsidian Community plugin directory.

### Build from source

```bash
npm install
npm run check
```

Copy these files to `.obsidian/plugins/wechat-obsidian-publisher/` inside your vault:

```text
main.js
manifest.json
styles.css
```

Then enable **WeChat Obsidian Publisher** under Obsidian Community plugins.

## Quick Start

1. Add an Official Account in plugin settings, or securely import it from `wechat-wenyan-publish`.
2. Set a default author and cover. Individual notes can override both in frontmatter.
3. Use the send icon in the left ribbon to open the publisher workbench.
4. Pick a template from the rail. Use the upper-right controls to tune font size, article padding, reading mode, and device frame.
5. On the **Check** tab, make sure the account, cover, images, and draft-parity preview pass before creating or updating a draft.

Connection testing only requests an access token. It never creates or changes a draft. When WeChat returns `40164`, the settings page extracts the rejected IPv4 and offers a copy action, the whitelist menu path, and a direct entry to the WeChat Developer Platform.

## Article Metadata

```yaml
---
title: Article title
author: Author name
digest: Summary within 120 Chinese characters
cover: images/cover.png
source_url: https://example.com/original
---
```

When `cover` is omitted, the first body image is used. The first publish creates a draft. A later publish of the same note updates the associated draft.

## User Templates

Built-in templates are immutable. Open **Templates**, choose **Duplicate and edit**, then edit the copied user template. The visual editor covers common font, colour, and code-block changes. Its preview includes a heading, body, quote, and a real code block. Open advanced JSON for precise control.

Imports accept one template, an array of templates, or an exported template bundle. Save and import filter selectors, CSS properties, and external resources that are unsuitable for WeChat inline HTML. User templates live in the current vault settings; favorites and template-specific layout settings stay with the template.

```json
{
  "id": "custom-example",
  "name": "My template",
  "description": "A custom template for long-form reading",
  "source": "custom",
  "group": "User templates",
  "sourceLabel": "User template",
  "license": "user-defined",
  "tags": ["user-template"],
  "accent": "#356348",
  "canvas": "#f3f0e9",
  "tokens": {
    "variant": "custom",
    "accent": "#356348",
    "accentSoft": "#9ab69f",
    "tint": "#eef5ef",
    "heading": "#1d3326",
    "body": "#26342d",
    "link": "#356348",
    "strong": "#356348"
  },
  "styles": {
    "body": { "fontSize": "16px", "lineHeight": "1.75" },
    "h2": { "color": "#ffffff", "backgroundColor": "#356348" }
  },
  "codeBlockProfile": {
    "preset": "macos-dark",
    "showChrome": true,
    "showLanguage": true,
    "background": "#1e1e1e",
    "headerBackground": "#2b3038",
    "foreground": "#e6edf3",
    "muted": "#9aa4b2",
    "border": "#3b4350",
    "dotRed": "#ff5f57",
    "dotYellow": "#febc2e",
    "dotGreen": "#28c840",
    "keyword": "#ff7b72",
    "string": "#a5d6ff",
    "function": "#d2a8ff",
    "number": "#79c0ff",
    "comment": "#8b949e",
    "tag": "#7ee787"
  }
}
```

## Safety and Limits

- AppSecrets are stored through Obsidian `SecretStorage`. `data.json` retains only a reference and uses `0600` permissions. The value is read back after storage to confirm persistence.
- AppSecrets are never written to the repository, notifications, or error logs.
- Every real draft submission asks for confirmation.
- The plugin only calls draft APIs. It never calls a mass-send endpoint.
- Desktop Obsidian only. Native WeChat features such as video, polls, and Mini Program cards still need to be added in the WeChat admin editor.

## Development

```bash
npm run dev
npm run test
npm run build
npm run check
```

License: [MIT](LICENSE).
