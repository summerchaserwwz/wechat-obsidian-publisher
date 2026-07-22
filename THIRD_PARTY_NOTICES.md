# Third-party notices

## Wenyan Core

This project studies the staged rendering architecture and built-in theme vocabulary of [Wenyan Core](https://github.com/caol64/wenyan), licensed under Apache License 2.0.

No `@wenyan-md/core` package is bundled or used at runtime. The renderer and template token compiler in this repository are independently implemented. The 12 Wenyan compatibility entries preserve theme vocabulary and attribution while using the local inline-style compiler.

## md2wechat-publisher

The workbench layout, 100-entry theme catalog, module vocabulary and template workflow were informed by the user-provided [md2wechat-publisher](https://github.com/summerchaserwwz/md2wechat-publisher) project. This repository contains a new Obsidian implementation and does not bundle the Electron application or its renderer.

Each built-in template keeps its own `sourceLabel`, `license` and `upstream` metadata. Catalog sources include Wenyan Core, markdown-nice, doocs/md, WeMD, WeChat Format, NeuraPress, the md2wechat API catalog and source-informed internal adaptations. These fields remain present when a built-in template is copied or exported.
