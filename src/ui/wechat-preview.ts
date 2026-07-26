const PREVIEW_DOCUMENT_STYLE = `
  html, body { width: 100%; margin: 0; padding: 0; background: #ffffff; }
  body { -webkit-text-size-adjust: 100%; }
`;

export function createWechatPreviewDocument(html: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${PREVIEW_DOCUMENT_STYLE}</style>
</head>
<body>${html}</body>
</html>`;
}

/**
 * Keeps the article out of Obsidian's global stylesheet. The iframe receives
 * the export-ready HTML, so the preview is a real WeChat content surface
 * rather than a styled approximation inside the plugin UI.
 */
export function mountWechatPreview(parent: HTMLElement, html: string): HTMLIFrameElement {
  const frame = parent.createEl("iframe", {
    cls: "wop-wechat-frame",
    attr: {
      title: "公众号草稿预览",
      sandbox: "allow-same-origin"
    }
  });
  frame.srcdoc = createWechatPreviewDocument(html);

  const resize = () => {
    const documentElement = frame.contentDocument?.documentElement;
    const body = frame.contentDocument?.body;
    if (!documentElement || !body) return;
    const height = Math.max(800, documentElement.scrollHeight, body.scrollHeight);
    frame.style.height = `${height}px`;
  };

  frame.addEventListener("load", () => {
    resize();
    const content = frame.contentDocument;
    content?.querySelectorAll("img").forEach((image) => {
      image.addEventListener("load", resize, { once: true });
      image.addEventListener("error", resize, { once: true });
    });
    window.setTimeout(resize, 0);
  });
  return frame;
}
