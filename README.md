# WeChat Obsidian Publisher

[English](README_EN.md)

在 Obsidian 里完成微信公众号文章的排版、预览和草稿发布。`0.2.10` 修复了模板点击后跳回列表顶部的问题，并把代码块升级为真实、可导出的 macOS 风格窗口。手机阅读默认保持 `15px` 左对齐正文和 `4px` 横向留白。

![紧凑模板工作台](docs/screenshots/template-workbench-v029.jpeg)

![手机文章预览](docs/screenshots/mobile-preview-v029.jpeg)

## 能做什么

- 打开当前 Markdown 笔记，在右侧工作台实时预览手机、微信文章或桌面宽度。
- 使用 130 套内置模板，包括新的“Mac 代码手记”、MD2 目录、12 套 Wenyan 原始主题和可追溯的开源主题；正文、列表、引用、表格均以左对齐阅读为基线。
- 在半透明的左侧模板导轨中搜索、筛选、收藏、导入或导出模板，收藏自动置顶，文章预览始终可见。
- 模板条目保持纯文字和收藏按钮。切换模板、收藏、展开或收起模板库后，列表会留在你正在看的位置。
- 复制内置模板为用户模板，直接修改颜色、字体、字号、行高和代码块外观，或导入、导出完整 JSON。
- 使用 9 类前后内容模块：开头、表格前、表格后、结尾、往期推荐、作者介绍、关注卡片、版权声明和自定义模块。
- 新增、编辑、启用、删除和排序内容模块。表格前后模块会围绕正文的第一个 Markdown 表格插入。
- 渲染表格、代码高亮、KaTeX、Mermaid、Obsidian 本地图片和普通 Markdown 图片。
- 上传正文图片与封面，创建或更新微信草稿。重复图片只上传一次，正文图片采用受限并发上传以缩短等待时间。
- 发布后调用 `draft/get` 回读草稿。标题、结构或内联样式与预览不一致时，不会报告成功。

## 手机阅读和草稿一致性

未单独配置的模板使用“手机阅读”预设：`15px` 正文、`1.72` 行高、`10px` 段距、`20px` 标题留白、上下 `0px` 与左右 `4px` 内边距。它不会依赖 Obsidian 的预览 CSS，而是作为公众号 HTML 的内联样式写入预览和草稿。

不再打开单独的排版弹窗。当前模板的排版可以直接在预览上调整：

- 右上角切换原版、手机、标准或舒展阅读模式
- 右上角切换手机、微信或桌面外框
- 顶部直接减小、查看或增大正文字号
- 顶部直接减小、查看或增大正文边距

“原模板”会保留来源主题的排版规则，适合需要还原网页主题的情况，也可能带回较大的边距。

字号与边距调节器位于顶部工具区，不会覆盖手机外框或正文。手机、微信和桌面外框只负责模拟阅读环境，不会混进发布内容。外框内部加载的就是准备提交给微信的完整 HTML；创建草稿后，插件还会通过 `draft/get` 回读并比较标题、结构和内联样式。

## macOS 代码块

所有模板默认使用“macOS 深色”代码块。它不是预览专用 CSS，而是把外框、三色窗口按钮、语言名称、背景色和语法颜色写进最终 HTML，因此预览与微信草稿是一致的。

- 代码窗口只作用于 fenced code block，不会影响行内代码。
- 选择“Mac 代码手记”可获得白底左读的技术文章模板；点击“复制并编辑”即可变成自己的用户模板。
- 用户模板编辑器可切换 macOS 深色、macOS 浅色或朴素安全三种代码块外观，并控制是否显示窗口栏与语言名称。
- 高级 JSON 中的 `codeBlockProfile` 可进一步改背景、文字、边框、三色圆点和语法颜色。

## 与 Wenyan Core 的关系

插件不依赖、也不运行 `@wenyan-md/core`。渲染器独立实现 Markdown 解析、结构增强、模板编译、图片处理和微信草稿发布。"Wenyan 原版"仅表示内置了对应主题的原始 CSS，用于保留 Pie 等主题的标题装饰和细节。归因见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 安装

当前通过 GitHub 源码或 Release 安装，尚未进入 Obsidian 社区插件市场。

### 从源码构建

```bash
npm install
npm run check
```

将以下文件复制到 Vault 的 `.obsidian/plugins/wechat-obsidian-publisher/`：

```text
main.js
manifest.json
styles.css
```

然后在 Obsidian 的社区插件设置中启用 `WeChat Obsidian Publisher`。

## 快速开始

1. 在插件设置中添加公众号账号，或从 `wechat-wenyan-publish` 安全导入。
2. 填写默认作者和默认封面，也可以在每篇文章的 frontmatter 中覆盖。
3. 点击左侧功能区的发送图标，打开“微信发布工作台”。
4. 在模板导轨选择模板；右上角调整字号与正文边距，并切换阅读模式或设备外框。
5. 在“检查”页确认账号、封面、图片和草稿一致预览均通过，再创建或更新草稿。

连接检查只请求 access token，不会创建或修改草稿。微信返回 `40164` 时，设置页会提取被拒绝的 IPv4，并提供复制按钮、白名单菜单路径和微信开发者平台入口。

## 文章元数据

```yaml
---
title: 文章标题
author: 作者名
digest: 120 字以内摘要
cover: images/cover.png
source_url: https://example.com/original
---
```

未填写 `cover` 时，发布会使用正文第一张图片。首次发布创建草稿，同一篇笔记再次发布会更新已关联草稿。

## 用户模板

内置模板不可直接修改。进入“模板”面板后，点击“复制并编辑”创建用户模板。常用字体、颜色和代码块外观可以在可视化编辑器中改动；需要精确控制时，展开高级 JSON。编辑器中的示意稿会同时显示标题、正文、引用和一段真实代码块。

导入支持单个模板、模板数组和插件导出的模板包。保存和导入时会过滤不适合微信内联 HTML 的选择器、样式属性和外部资源。用户模板保存在当前 Vault 的插件配置中，收藏状态和模板专属排版设置会随模板保存。

```json
{
  "id": "custom-example",
  "name": "我的模板",
  "description": "适合长文阅读的自定义模板",
  "source": "custom",
  "group": "用户模板",
  "sourceLabel": "用户模板",
  "license": "user-defined",
  "tags": ["用户模板"],
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

## 安全和边界

- AppSecret 使用 Obsidian `SecretStorage` 保存，`data.json` 只保留引用并设为 `0600` 权限。写入后会立即回读确认。
- 插件不会把 AppSecret 写入仓库、通知或错误日志。
- 每次真实提交草稿前都会再次确认。
- 只调用草稿接口，不调用群发接口。
- 当前只支持桌面端 Obsidian。视频、投票和小程序卡片等微信原生能力仍需在公众平台后台补充。

## 开发

```bash
npm run dev
npm run test
npm run build
npm run check
```

许可证：[MIT](LICENSE)。
