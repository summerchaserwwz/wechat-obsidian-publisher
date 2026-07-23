# Third-party notices

## Wenyan Core

This project vendors the 12 built-in CSS themes from [Wenyan Core](https://github.com/caol64/wenyan), licensed under Apache License 2.0, into the generated `src/core/wenyan-theme-css.ts` module. The original CSS comments retain each theme author's attribution.

No `@wenyan-md/core` package is bundled or used at runtime. The renderer and WeChat-safe inline conversion layer in this repository are independently implemented. The 12 Wenyan original entries use the original CSS, then convert compatible selectors and pseudo-elements into publishable inline HTML.

## Source-original template library

The generated `src/core/external-source-themes.ts` module vendors 40 reviewed source themes. `scripts/sync-external-source-themes.mjs` regenerates that module from the vendored source checkouts and rejects external URLs, duplicate IDs, and stylesheets larger than the user-template safety limit.

- 18 themes from [Health-525/wechat-article-formatter](https://github.com/Health-525/wechat-article-formatter), MIT License, copyright 2025 墨排 (Mopai).
- 15 themes from [tenngoxars/WeMD](https://github.com/tenngoxars/WeMD), MIT License, copyright 2025 WeMD Team.
- 4 themes from [tianyaxiang/neurapress](https://github.com/tianyaxiang/neurapress), MIT License, copyright 2025 neurapress.
- 3 themes from [doocs/md](https://github.com/doocs/md), WTFPL-2.0, copyright 2025 Doocs.

Each entry retains its `sourceLabel`, `license`, and `upstream` metadata through copy, JSON export, and JSON re-import. The plugin converts compatible CSS into inline declarations for WeChat and applies a left-reading override only to body copy, lists, quotes, tables, captions, and footnotes.

## md2wechat-publisher

The workbench layout, 100-entry theme catalog, module vocabulary and template workflow were informed by the user-provided [md2wechat-publisher](https://github.com/summerchaserwwz/md2wechat-publisher) project. This repository contains a new Obsidian implementation and does not bundle the Electron application or its renderer.

Each built-in template keeps its own `sourceLabel`, `license` and `upstream` metadata. Catalog sources include Wenyan Core, markdown-nice, doocs/md, WeMD, WeChat Format, NeuraPress, the md2wechat API catalog, source-original template libraries, and source-informed internal adaptations. These fields remain present when a built-in template is copied or exported.
