import { requestUrl, type RequestUrlResponse } from "obsidian";
import { Canvg } from "canvg";
import type { ImageAsset, PublishInput, PublishReceipt } from "../types";

const API = "https://api.weixin.qq.com/cgi-bin";

interface WechatResponse {
  errcode?: number;
  errmsg?: string;
  access_token?: string;
  media_id?: string;
  url?: string;
  news_item?: Array<{ title?: string; content?: string }>;
}

export class WechatApiError extends Error {
  constructor(
    message: string,
    readonly code: number,
    readonly rejectedIp: string
  ) {
    super(message);
    this.name = "WechatApiError";
  }
}

export function extractRejectedIp(message: string): string {
  const ipv4 = message.match(/(?:invalid\s+ip|ip)[^0-9]{0,12}((?:\d{1,3}\.){3}\d{1,3})/i)?.[1];
  if (ipv4) return ipv4;
  const ipv6 = message.match(/(?:invalid\s+ip|ip)[^0-9a-f]{0,12}([0-9a-f]{1,4}(?::[0-9a-f]{0,4}){2,})/i)?.[1];
  return ipv6?.replace(/^::ffff:/i, "") ?? "";
}

function assertWechatSuccess(payload: WechatResponse, action: string): void {
  if (typeof payload.errcode === "number" && payload.errcode !== 0) {
    const detail = payload.errmsg ?? `微信错误码 ${payload.errcode}`;
    throw new WechatApiError(`${action}失败：${detail}`, payload.errcode, payload.errcode === 40164 ? extractRejectedIp(detail) : "");
  }
}

function parseResponse(response: RequestUrlResponse, action: string): WechatResponse {
  if (response.status < 200 || response.status >= 300) throw new Error(`${action}失败：HTTP ${response.status}`);
  let payload: WechatResponse;
  try {
    payload = JSON.parse(response.text) as WechatResponse;
  } catch {
    throw new Error(`${action}失败：微信返回了无法识别的响应。`);
  }
  assertWechatSuccess(payload, action);
  return payload;
}

function concatBytes(parts: Uint8Array[]): ArrayBuffer {
  const total = parts.reduce((length, part) => length + part.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result.buffer;
}

function multipartBody(asset: ImageAsset): { body: ArrayBuffer; contentType: string } {
  const encoder = new TextEncoder();
  const boundary = `----WechatObsidianPublisher${crypto.randomUUID().replace(/-/g, "")}`;
  const filename = asset.filename.replace(/["\r\n]/g, "_");
  const opening = encoder.encode(
    `--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="${filename}"\r\nContent-Type: ${asset.mimeType}\r\n\r\n`
  );
  const closing = encoder.encode(`\r\n--${boundary}--\r\n`);
  return {
    body: concatBytes([opening, new Uint8Array(asset.bytes), closing]),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

async function uploadAsset(
  endpoint: string,
  token: string,
  asset: ImageAsset,
  action: string,
  extraQuery: Record<string, string> = {}
): Promise<WechatResponse> {
  const query = new URLSearchParams({ access_token: token, ...extraQuery });
  const multipart = multipartBody(asset);
  const response = await requestUrl({
    url: `${API}/${endpoint}?${query.toString()}`,
    method: "POST",
    contentType: multipart.contentType,
    body: multipart.body,
    throw: false
  });
  return parseResponse(response, action);
}

export interface WechatContentMaterializer {
  rasterizeMermaid?: (svg: SVGSVGElement, index: number) => Promise<ImageAsset>;
  replaceMermaid?: (asset: ImageAsset, index: number) => Promise<string>;
  replaceImage?: (source: string) => Promise<string>;
}

export interface WechatVisualParity {
  matches: boolean;
  expected: string;
  actual: string;
}

// The upload API is network-bound. Three parallel requests shorten multi-image
// articles without creating an unbounded burst that can trigger rate limits.
const BODY_IMAGE_UPLOAD_CONCURRENCY = 3;

const HIGHLIGHT_STYLES: Record<string, Record<string, string>> = {
  "hljs-doctag": { color: "#ff7b72" },
  "hljs-keyword": { color: "#ff7b72" },
  "hljs-template-tag": { color: "#ff7b72" },
  "hljs-template-variable": { color: "#ff7b72" },
  "hljs-type": { color: "#ff7b72" },
  "hljs-variable": { color: "#79c0ff" },
  "language_": { color: "#ff7b72" },
  "hljs-title": { color: "#d2a8ff" },
  "hljs-attr": { color: "#79c0ff" },
  "hljs-attribute": { color: "#79c0ff" },
  "hljs-literal": { color: "#79c0ff" },
  "hljs-meta": { color: "#79c0ff" },
  "hljs-number": { color: "#79c0ff" },
  "hljs-operator": { color: "#79c0ff" },
  "hljs-selector-attr": { color: "#79c0ff" },
  "hljs-selector-class": { color: "#79c0ff" },
  "hljs-selector-id": { color: "#79c0ff" },
  "hljs-regexp": { color: "#a5d6ff" },
  "hljs-string": { color: "#a5d6ff" },
  "hljs-built_in": { color: "#ffa657" },
  "hljs-symbol": { color: "#ffa657" },
  "hljs-comment": { color: "#8b949e" },
  "hljs-code": { color: "#8b949e" },
  "hljs-formula": { color: "#8b949e" },
  "hljs-name": { color: "#7ee787" },
  "hljs-quote": { color: "#7ee787" },
  "hljs-selector-tag": { color: "#7ee787" },
  "hljs-selector-pseudo": { color: "#7ee787" },
  "hljs-subst": { color: "#c9d1d9" },
  "hljs-section": { color: "#1f6feb", "font-weight": "bold" },
  "hljs-bullet": { color: "#f2cc60" },
  "hljs-emphasis": { color: "#c9d1d9", "font-style": "italic" },
  "hljs-strong": { color: "#c9d1d9", "font-weight": "bold" },
  "hljs-addition": { color: "#aff5b4", "background-color": "#033a16" },
  "hljs-deletion": { color: "#ffdcd7", "background-color": "#67060c" }
};

function setStyleIfMissing(element: HTMLElement, property: string, value: string): void {
  if (!element.style.getPropertyValue(property)) element.style.setProperty(property, value);
}

function inlineHighlightStyles(wrapper: HTMLElement): void {
  wrapper.querySelectorAll<HTMLElement>("code.hljs").forEach((code) => {
    // These are the previously preview-only GitHub Dark rules. Inline them so
    // a code sample keeps the same colours in the WeChat article HTML.
    setStyleIfMissing(code, "display", "block");
    setStyleIfMissing(code, "overflow-x", "auto");
    setStyleIfMissing(code, "padding", "1em");
    setStyleIfMissing(code, "color", "#c9d1d9");
    setStyleIfMissing(code, "background", "transparent");
  });
  wrapper.querySelectorAll<HTMLElement>(".hljs").forEach((element) => {
    for (const className of element.classList) {
      const declarations = HIGHLIGHT_STYLES[className];
      if (!declarations) continue;
      for (const [property, value] of Object.entries(declarations)) setStyleIfMissing(element, property, value);
    }
  });
}

function inlineWechatBaseline(wrapper: HTMLElement): void {
  const article = wrapper.querySelector<HTMLElement>(".wop-article");
  if (article) {
    setStyleIfMissing(article, "width", "100%");
    setStyleIfMissing(article, "overflow-wrap", "anywhere");
  }
  wrapper.querySelectorAll<HTMLElement>("p").forEach((paragraph) => {
    setStyleIfMissing(paragraph, "margin", "1em 0");
  });
  wrapper.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
    setStyleIfMissing(link, "color", "#576b95");
    setStyleIfMissing(link, "text-decoration", "none");
  });
  wrapper.querySelectorAll<HTMLElement>("blockquote").forEach((quote) => {
    setStyleIfMissing(quote, "margin", "1.2em 0");
  });
  wrapper.querySelectorAll<HTMLElement>("pre").forEach((pre) => {
    setStyleIfMissing(pre, "margin", "1em 0");
    setStyleIfMissing(pre, "overflow-x", "auto");
  });
  wrapper.querySelectorAll<HTMLTableElement>("table").forEach((table) => {
    setStyleIfMissing(table, "max-width", "100%");
  });
  wrapper.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    setStyleIfMissing(image, "max-width", "100%");
    setStyleIfMissing(image, "height", "auto");
  });
  wrapper.querySelectorAll<SVGSVGElement>("svg").forEach((svg) => {
    if (!svg.style.getPropertyValue("max-width")) svg.style.setProperty("max-width", "100%");
    if (!svg.style.getPropertyValue("height")) svg.style.setProperty("height", "auto");
  });
}

function stripPublisherAttributes(wrapper: HTMLElement): void {
  wrapper.querySelectorAll<HTMLElement>("*").forEach((element) => {
    for (const attribute of [...element.attributes]) {
      if (attribute.name.startsWith("data-wop") || attribute.name === "data-source" || attribute.name === "contenteditable") {
        element.removeAttribute(attribute.name);
      }
    }
  });
}

function styleSignature(element: HTMLElement): string {
  const declarations: string[] = [];
  for (let index = 0; index < element.style.length; index += 1) {
    const property = element.style.item(index);
    const value = element.style.getPropertyValue(property).trim();
    const priority = element.style.getPropertyPriority(property);
    declarations.push(`${property}:${value}${priority ? "!important" : ""}`);
  }
  return declarations.sort().join(";");
}

function visualHtmlSignature(html: string): string {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  wrapper.querySelectorAll<HTMLElement>("*").forEach((element) => {
    const attributes = [...element.attributes]
      .filter((attribute) => {
        const name = attribute.name.toLowerCase();
        return name !== "style"
          && name !== "class"
          && name !== "id"
          && name !== "src"
          && name !== "srcset"
          && name !== "contenteditable"
          && !name.startsWith("data-")
          && !name.startsWith("aria-");
      })
      .map((attribute) => [attribute.name, attribute.value] as const)
      .sort(([left], [right]) => left.localeCompare(right));
    const style = styleSignature(element);
    for (const attribute of [...element.attributes]) element.removeAttribute(attribute.name);
    for (const [name, value] of attributes) element.setAttribute(name, value);
    if (style) element.setAttribute("style", style);
  });
  return wrapper.innerHTML.replace(/\r\n/g, "\n").trim();
}

export function compareWechatVisualHtml(expected: string, actual: string): WechatVisualParity {
  const expectedSignature = visualHtmlSignature(expected);
  const actualSignature = visualHtmlSignature(actual);
  return {
    matches: expectedSignature === actualSignature,
    expected: expectedSignature,
    actual: actualSignature
  };
}

export function serializeSvgForCanvas(svg: SVGSVGElement): string {
  const namespace = "http://www.w3.org/2000/svg";
  const clone = svg.cloneNode(true) as SVGSVGElement;

  clone.querySelectorAll<SVGElement>("foreignObject").forEach((foreign) => {
    const text = document.createElementNS(namespace, "text");
    text.textContent = (foreign.textContent ?? "").replace(/\s+/g, " ").trim();
    text.setAttribute("x", foreign.getAttribute("x") ?? "0");
    text.setAttribute("y", foreign.getAttribute("y") ?? "0");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", "16");
    text.setAttribute("fill", "#1f2937");
    foreign.replaceWith(text);
  });

  clone.querySelectorAll<SVGElement>("image").forEach((image) => {
    const source = image.getAttribute("href") ?? image.getAttribute("xlink:href") ?? "";
    if (/^(?:https?:)?\/\//i.test(source)) image.remove();
  });

  clone.querySelectorAll<SVGStyleElement>("style").forEach((style) => {
    style.textContent = (style.textContent ?? "")
      .replace(/@import\s+(?:url\()?['\"]?(?:https?:)?\/\/[^;]+;?/gi, "")
      .replace(/url\(\s*['\"]?(?:https?:)?\/\/[^)]+\)/gi, "none");
  });

  return new XMLSerializer().serializeToString(clone);
}

async function svgToPngAsset(svg: SVGSVGElement, index: number): Promise<ImageAsset> {
  const serialized = serializeSvgForCanvas(svg);
  const width = Math.max(320, Math.ceil(svg.viewBox.baseVal.width || svg.clientWidth || 677));
  const height = Math.max(120, Math.ceil(svg.viewBox.baseVal.height || svg.clientHeight || 360));
  const scale = Math.min(2, 1354 / width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建图表画布。");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  // 直接解析 SVG 图元并绘制，避免 Electron 将 SVG 图片源标记为跨域后污染 Canvas。
  const renderer = Canvg.fromString(context, serialized, {
    ignoreAnimation: true,
    ignoreMouse: true
  });
  renderer.resize(canvas.width, canvas.height, "xMidYMid meet");
  await renderer.render({
    ignoreAnimation: true,
    ignoreMouse: true,
    ignoreClear: true
  });
  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("图表转换失败。")), "image/png", 0.94);
  });
  return {
    source: `mermaid-${index}`,
    bytes: await pngBlob.arrayBuffer(),
    mimeType: "image/png",
    filename: `mermaid-${index}.png`
  };
}

function imageDataUrl(asset: ImageAsset): string {
  const bytes = new Uint8Array(asset.bytes);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return `data:${asset.mimeType};base64,${btoa(binary)}`;
}

function createWechatImage(source: string, alt = "图表"): HTMLImageElement {
  const image = document.createElement("img");
  image.src = source;
  image.alt = alt;
  image.style.maxWidth = "100%";
  image.style.height = "auto";
  image.style.display = "block";
  image.style.margin = "1.5em auto";
  return image;
}

/**
 * Resolve each distinct body-image source once, while limiting active uploads.
 *
 * A note may reuse the same local image several times. WeChat only needs one
 * uploaded URL in that case, and replacing the DOM afterwards keeps document
 * order exactly as authored. Mermaid deliberately stays on its serial path:
 * canvas rasterisation is CPU-bound and benefits less from concurrent work.
 */
async function materializeBodyImages(
  images: HTMLImageElement[],
  replaceImage: (source: string) => Promise<string>
): Promise<Map<string, Promise<string>>> {
  const uniqueSources: string[] = [];
  const seenSources = new Set<string>();
  for (const image of images) {
    const source = image.dataset.source;
    if (!source || seenSources.has(source)) continue;
    seenSources.add(source);
    uniqueSources.push(source);
  }

  const replacements = new Map<string, Promise<string>>();
  let nextIndex = 0;
  const worker = async (): Promise<void> => {
    while (nextIndex < uniqueSources.length) {
      const source = uniqueSources[nextIndex];
      nextIndex += 1;
      // Wrap the callback so a synchronous resolver failure follows the same
      // Promise rejection path as an upload failure.
      const replacement = Promise.resolve().then(() => replaceImage(source));
      replacements.set(source, replacement);
      await replacement;
    }
  };

  const workerCount = Math.min(BODY_IMAGE_UPLOAD_CONCURRENCY, uniqueSources.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return replacements;
}

export async function prepareWechatHtml(html: string, materializer: WechatContentMaterializer = {}): Promise<string> {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;

  const mermaidBlocks = [...wrapper.querySelectorAll<HTMLElement>("[data-wop-mermaid]")];
  for (const [index, block] of mermaidBlocks.entries()) {
    const svg = block.querySelector<SVGSVGElement>("svg");
    if (!svg || !materializer.replaceMermaid) continue;
    const asset = await (materializer.rasterizeMermaid ?? svgToPngAsset)(svg, index);
    block.replaceWith(createWechatImage(await materializer.replaceMermaid(asset, index)));
  }

  const bodyImages = [...wrapper.querySelectorAll<HTMLImageElement>("img[data-source]")];
  if (materializer.replaceImage) {
    const replacements = await materializeBodyImages(bodyImages, materializer.replaceImage);
    for (const image of bodyImages) {
      const source = image.dataset.source;
      const replacement = source ? replacements.get(source) : undefined;
      if (replacement) image.src = await replacement;
    }
  }

  inlineWechatBaseline(wrapper);
  inlineHighlightStyles(wrapper);
  stripPublisherAttributes(wrapper);
  return wrapper.innerHTML;
}

/**
 * Creates the exact export-safe DOM used by the preview surface. Mermaid is
 * rendered to the same PNG bytes that the publishing flow uploads; only the
 * final remote image URL is different.
 */
export async function prepareWechatPreviewHtml(html: string): Promise<string> {
  return prepareWechatHtml(html, {
    replaceMermaid: async (asset) => imageDataUrl(asset)
  });
}

export class WechatClient {
  private async accessToken(appId: string, secret: string): Promise<string> {
    const query = new URLSearchParams({ grant_type: "client_credential", appid: appId, secret });
    const response = await requestUrl({ url: `${API}/token?${query.toString()}`, throw: false });
    const payload = parseResponse(response, "获取访问凭据");
    if (!payload.access_token) throw new Error("微信未返回访问凭据。");
    return payload.access_token;
  }

  private async uploadBodyImage(token: string, asset: ImageAsset): Promise<string> {
    const payload = await uploadAsset("media/uploadimg", token, asset, "上传正文图片");
    if (!payload.url) throw new Error("微信未返回正文图片地址。");
    return payload.url;
  }

  private async uploadCover(token: string, asset: ImageAsset): Promise<string> {
    const payload = await uploadAsset("material/add_material", token, asset, "上传封面", { type: "image" });
    if (!payload.media_id) throw new Error("微信未返回封面素材 ID。");
    return payload.media_id;
  }

  private async prepareContent(input: PublishInput, token: string): Promise<string> {
    return prepareWechatHtml(input.article.html, {
      replaceMermaid: async (asset) => this.uploadBodyImage(token, asset),
      replaceImage: async (source) => this.uploadBodyImage(token, await input.resolveImage(source))
    });
  }

  async preparePreviewContent(html: string): Promise<string> {
    return prepareWechatPreviewHtml(html);
  }

  async testConnection(appId: string, secret: string): Promise<void> {
    await this.accessToken(appId, secret);
  }

  async publish(input: PublishInput): Promise<PublishReceipt> {
    const token = await this.accessToken(input.account.appId, input.secret);
    const content = await this.prepareContent(input, token);
    const coverSource = input.article.meta.cover || input.article.imageSources[0];
    if (!coverSource) throw new Error("请在 frontmatter 设置 cover，或在正文中加入至少一张图片。");
    const thumbMediaId = await this.uploadCover(token, await input.resolveImage(coverSource));
    const article = {
      title: input.article.meta.title.slice(0, 64),
      author: input.article.meta.author.slice(0, 16),
      digest: input.article.meta.digest.slice(0, 120),
      content,
      content_source_url: input.article.meta.sourceUrl,
      thumb_media_id: thumbMediaId,
      need_open_comment: 1,
      only_fans_can_comment: 0
    };

    const isUpdate = Boolean(input.existingMediaId);
    const endpoint = isUpdate ? "draft/update" : "draft/add";
    const requestBody = isUpdate
      ? { media_id: input.existingMediaId, index: 0, articles: article }
      : { articles: [article] };
    const response = await requestUrl({
      url: `${API}/${endpoint}?access_token=${encodeURIComponent(token)}`,
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify(requestBody),
      throw: false
    });
    const payload = parseResponse(response, isUpdate ? "更新草稿" : "创建草稿");
    const mediaId = input.existingMediaId || payload.media_id;
    if (!mediaId) throw new Error("微信未返回草稿素材 ID。");

    const verifyResponse = await requestUrl({
      url: `${API}/draft/get?access_token=${encodeURIComponent(token)}`,
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({ media_id: mediaId }),
      throw: false
    });
    const verified = parseResponse(verifyResponse, "回读草稿");
    const saved = verified.news_item?.[0];
    if (!saved?.content || saved.title !== article.title) {
      throw new Error("草稿已提交，但回读内容与当前文章不一致，请到微信后台检查。");
    }
    const parity = compareWechatVisualHtml(content, saved.content);
    if (!parity.matches) {
      throw new Error("草稿已提交，但微信回读的结构或内联样式与预览不一致，请检查草稿后再继续发布。");
    }
    return {
      mediaId,
      verified: true,
      title: saved.title,
      publishedAt: Date.now(),
      operation: isUpdate ? "update" : "add"
    };
  }
}
