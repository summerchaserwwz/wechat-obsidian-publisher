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

function stripEditorAttributes(html: string): string {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  wrapper.querySelectorAll<HTMLElement>("*").forEach((element) => {
    for (const attribute of [...element.attributes]) {
      if (attribute.name.startsWith("data-wop") || attribute.name === "contenteditable") {
        element.removeAttribute(attribute.name);
      }
    }
  });
  return wrapper.innerHTML;
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
    const wrapper = document.createElement("div");
    wrapper.innerHTML = input.article.html;

    const mermaidBlocks = [...wrapper.querySelectorAll<HTMLElement>("[data-wop-mermaid]")];
    for (const [index, block] of mermaidBlocks.entries()) {
      const svg = block.querySelector<SVGSVGElement>("svg");
      if (!svg) continue;
      const asset = await svgToPngAsset(svg, index);
      const url = await this.uploadBodyImage(token, asset);
      const image = document.createElement("img");
      image.src = url;
      image.alt = "图表";
      image.style.maxWidth = "100%";
      image.style.height = "auto";
      image.style.display = "block";
      image.style.margin = "1.5em auto";
      block.replaceWith(image);
    }

    for (const image of [...wrapper.querySelectorAll<HTMLImageElement>("img[data-source]")]) {
      const source = image.dataset.source;
      if (!source) continue;
      const asset = await input.resolveImage(source);
      image.src = await this.uploadBodyImage(token, asset);
      image.removeAttribute("data-source");
    }
    return stripEditorAttributes(wrapper.innerHTML);
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
    return {
      mediaId,
      verified: true,
      title: saved.title,
      publishedAt: Date.now(),
      operation: isUpdate ? "update" : "add"
    };
  }
}
