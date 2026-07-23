/*
 * Source-backed theme fragments used by the curated library.
 *
 * Pie is adapted from caol64/wenyan-core (Apache-2.0):
 * https://github.com/caol64/wenyan-core/blob/main/src/assets/themes/pie.css
 *
 * Modern Editorial is adapted from tenngoxars/WeMD (MIT):
 * https://github.com/tenngoxars/WeMD/tree/main/packages/core/src/themes
 *
 * Knowledge Base is adapted from sliiu/md-beautify (MIT):
 * https://github.com/sliiu/md-beautify/blob/vue/packages/core/src/themes/knowledge-base.ts
 *
 * The renderer turns supported pseudo-elements into real inline nodes before
 * publishing, because WeChat strips stylesheet pseudo-elements.
 */

export const WENYAN_PIE_CSS = `
:root {
  --mid-7: #8c8c8c;
  --mid-9: #434343;
  --mid-10: #262626;
  --main-1: #fff2f0;
  --main-4: #f27f79;
  --main-5: #e6514e;
  --main-6: #da282a;
}

#wenyan {
  line-height: 1.75;
  letter-spacing: 0;
  font-size: 16px;
}

#wenyan p {
  margin: 1em 0;
  word-spacing: 0.05rem;
  text-align: justify;
}

#wenyan a {
  word-wrap: break-word;
  color: var(--main-6);
  text-decoration: none;
  border-bottom: 1px solid var(--main-6);
  padding: 0 2px;
  font-weight: 500;
}

#wenyan h1,
#wenyan h2,
#wenyan h3,
#wenyan h4,
#wenyan h5,
#wenyan h6 {
  position: relative;
  margin: 1.2em 0 1em;
  padding: 0;
  font-weight: bold;
}

#wenyan h1 {
  font-size: 1.5em;
  text-align: center;
}

#wenyan h1::after {
  display: block;
  width: 100px;
  height: 2px;
  margin: 0.2em auto 0;
  content: "";
  border-bottom: 2px dashed var(--main-6);
}

#wenyan h2 {
  margin: 2em auto 1.4em;
  padding-left: 6px;
  font-size: 1.3em;
  border-left: 6px solid var(--main-6);
}

#wenyan h3 {
  font-size: 1.2em;
}

#wenyan h3::before {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 6px;
  margin-bottom: 0.18em;
  line-height: 1.43;
  vertical-align: middle;
  content: "";
  background-color: var(--main-5);
  border-radius: 50%;
}

#wenyan h4 {
  font-size: 1.2em;
}

#wenyan h4::before {
  display: inline-block;
  width: 6px;
  height: 2px;
  margin-right: 8px;
  margin-bottom: 0.18em;
  vertical-align: middle;
  content: "";
  background-color: var(--main-4);
}

#wenyan ul,
#wenyan ol {
  margin-left: 1rem;
  font-size: 0.9rem;
}

#wenyan ul { list-style-type: disc; }
#wenyan ul ul { list-style-type: circle; }
#wenyan ol { list-style-type: decimal; }

#wenyan hr {
  box-sizing: content-box;
  width: 100%;
  height: 1px;
  padding: 0;
  margin: 46px auto 64px;
  overflow: hidden;
  background-color: var(--main-4);
  border: 0;
}

#wenyan blockquote {
  position: relative;
  margin: 24px 0 36px;
  padding: 24px 16px 12px;
  color: var(--mid-7);
  font-size: 1em;
  font-style: normal;
  line-height: 1.6;
  text-indent: 0;
  border: none;
  border-left: 2px solid var(--main-6);
}

#wenyan blockquote p { margin: 0.45em 0; }

#wenyan blockquote::before {
  position: absolute;
  top: 0;
  left: 12px;
  color: var(--main-6);
  font-size: 2em;
  font-weight: 700;
  line-height: 1em;
  content: "“";
}

#wenyan table {
  display: table;
  max-width: 100%;
  margin: 1.4em auto;
  overflow: auto;
  table-layout: fixed;
  text-align: left;
  word-wrap: break-word;
  word-break: break-all;
  border-collapse: collapse;
}

#wenyan table td,
#wenyan table th {
  padding: 9px 12px;
  border: 1px solid var(--main-4);
  font-size: 0.75em;
  line-height: 22px;
  vertical-align: top;
}

#wenyan table th {
  color: var(--main-6);
  background-color: var(--main-1);
  font-weight: bold;
}

#wenyan p code,
#wenyan li code {
  margin: 0 2px;
  padding: 2px 4px 1px;
  border-radius: 3px;
  color: var(--main-5);
  background-color: var(--main-1);
  font-size: 0.92rem;
}

#wenyan img {
  display: block;
  max-width: 100%;
  margin: 0 auto;
  border-radius: 4px;
}

#wenyan pre {
  margin: 1em 0.5em;
  padding: 0.5em;
  border-radius: 5px;
  box-shadow: rgba(0, 0, 0, 0.55) 0 1px 5px;
  font-size: 12px;
  line-height: 2;
}

#wenyan pre code {
  display: block;
  margin: 0.5em;
  padding: 0;
  overflow-x: auto;
}
`;

export const WEMD_MODERN_EDITORIAL_CSS = `
#wemd {
  max-width: 677px;
  margin: 0 auto;
  padding: 16px 24px;
  color: #34362f;
  background-color: transparent;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
  font-size: 16px;
  line-height: 1.86;
  letter-spacing: 0.018em;
  word-break: break-word;
  counter-reset: editorial-section;
}

#wemd p {
  margin: 0 0 23px;
  color: #34362f;
  font-size: 16px;
  line-height: 1.86;
  letter-spacing: 0.018em;
  text-align: justify;
}

#wemd h1,
#wemd h2,
#wemd h3,
#wemd h4,
#wemd h5,
#wemd h6 {
  padding: 0;
  text-align: left;
}

#wemd h1 {
  margin: 26px 0 50px;
  padding: 24px 0 20px;
  border-top: 5px solid #20221e;
  border-bottom: 3px solid #c76237;
}

#wemd h1 .content {
  color: #20221e;
  font-family: "Songti SC", "STSong", "Noto Serif CJK SC", SimSun, serif;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0.04em;
}

#wemd h2 {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  margin: 56px 0 25px;
  padding-bottom: 12px;
  border-bottom: 1px solid #afb1a6;
}

#wemd h2::before {
  display: inline-block;
  min-width: 42px;
  margin-right: 4px;
  color: #c76237;
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.02em;
  vertical-align: bottom;
  content: counter(editorial-section, decimal-leading-zero);
  counter-increment: editorial-section;
}

#wemd h2 .content {
  color: #242720;
  font-family: "Songti SC", "STSong", "Noto Serif CJK SC", SimSun, serif;
  font-size: 23px;
  font-weight: 700;
  line-height: 1.48;
  letter-spacing: 0.035em;
}

#wemd h3 { margin: 38px 0 19px; }

#wemd h3 .content {
  display: inline-block;
  padding: 7px 13px;
  color: #f4f2e9;
  background: #34372f;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.45;
  letter-spacing: 0.055em;
}

#wemd h4 {
  margin: 31px 0 16px;
  padding-left: 12px;
  border-left: 4px solid #c76237;
}

#wemd h4 .content {
  color: #34372f;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.5;
}

#wemd h5,
#wemd h6 { margin: 27px 0 14px; }

#wemd h5 .content,
#wemd h6 .content {
  color: #626657;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.5;
}

#wemd blockquote { border: none; }

#wemd .multiquote-1 {
  margin: 35px 0;
  padding: 24px 24px 21px;
  border-top: 3px solid #5f6453;
  border-bottom: 1px solid #c8c9bf;
  background: #f1f0e9;
}

#wemd .multiquote-2,
#wemd .multiquote-3 {
  margin: 28px 0 28px 18px;
  padding: 7px 0 7px 18px;
  border-left: 3px solid #c76237;
  background: transparent;
}

#wemd .multiquote-1 p,
#wemd .multiquote-2 p,
#wemd .multiquote-3 p {
  margin: 0;
  color: #4f5347;
  font-family: "Songti SC", "STSong", "Noto Serif CJK SC", SimSun, serif;
  font-size: 16px;
  line-height: 1.9;
  letter-spacing: 0.035em;
}

#wemd ul,
#wemd ol {
  margin: 22px 0 28px;
  padding-left: 24px;
  color: #c76237;
}

#wemd ul { list-style-type: square; }
#wemd ul ul { margin-top: 8px; list-style-type: circle; }
#wemd ol { list-style-type: decimal-leading-zero; }
#wemd ol ol { margin-top: 8px; list-style-type: lower-alpha; }

#wemd li section {
  margin: 7px 0;
  color: #34362f;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.8;
  text-align: left;
}

#wemd ol > li {
  margin: 11px 0;
  color: #c76237;
  font-weight: 700;
}

#wemd ol > li > section {
  padding: 10px 14px;
  border-left: 1px solid #b8baae;
  color: #34362f;
  background: #f5f4ee;
  font-weight: 400;
}

#wemd a {
  color: #9f4828;
  font-weight: 600;
  text-decoration: none;
  border-bottom: 1px solid #d59a7f;
}

#wemd strong {
  color: #242720;
  font-weight: 700;
  border-bottom: 2px solid #dfa187;
}

#wemd hr {
  width: 84px;
  height: 5px;
  margin: 54px 0;
  border: none;
  background: #c76237;
}

#wemd figure {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin: 40px 4px 44px 0;
}

#wemd img,
#wemd figure a img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
  padding: 7px;
  border: 1px solid #ccccc2;
  border-radius: 1px;
  background: #f7f6f0;
  box-shadow: 8px 8px 0 #deddd4;
}

#wemd figcaption {
  margin-top: 16px;
  padding-left: 13px;
  border-left: 3px solid #c76237;
  color: #73766b;
  font-size: 12px;
  line-height: 1.65;
  letter-spacing: 0.04em;
  text-align: left;
}

#wemd p code,
#wemd li code {
  margin: 0 2px;
  padding: 2px 6px;
  border: 1px solid #d2d1c7;
  border-radius: 2px;
  color: #9f4828;
  background: #f1f0e9;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 13px;
  word-break: break-all;
}

#wemd pre {
  margin: 32px 0;
  border-top: 5px solid #c76237;
  border-radius: 1px;
  background: #23251f;
  overflow-x: auto;
}

#wemd pre code,
#wemd pre code.hljs {
  display: block;
  min-width: max-content;
  padding: 20px 21px;
  border-radius: 0;
  color: #e8e6dd;
  background: #23251f;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 13px;
  line-height: 1.72;
  white-space: pre;
}

#wemd table {
  width: 100%;
  border-collapse: collapse;
  color: #34362f;
  background: #f7f6f0;
  text-align: left;
}

#wemd table tr th,
#wemd table tr td {
  min-width: 88px;
  padding: 12px 11px;
  border: none;
  border-bottom: 1px solid #d3d3c8;
  color: #41443a;
  background: transparent;
  font-size: 14px;
  line-height: 1.62;
  text-align: left;
}

#wemd table tr th {
  color: #f2f0e7;
  background: #34372f;
  font-weight: 700;
  letter-spacing: 0.035em;
}
`;

export const MDB_KNOWLEDGE_BASE_CSS = `
#mdb {
  max-width: 677px;
  margin: 0 auto;
  padding: 30px 24px;
  color: #37352f;
  background-color: transparent;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", "PingFang SC", sans-serif;
  word-break: break-word;
}

#mdb p {
  margin: 16px 0;
  color: #37352f;
  font-size: 16px;
  line-height: 1.75;
  letter-spacing: 0.2px;
  text-align: justify;
}

#mdb h1 {
  margin: 50px 0 40px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e3e2e0;
  text-align: left;
}

#mdb h1 .content {
  display: inline-block;
  color: #37352f;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

#mdb h2 {
  margin: 40px 0 20px;
  text-align: left;
}

#mdb h2 .content {
  display: block;
  padding: 8px 12px;
  border-radius: 4px;
  color: #37352f;
  background-color: #f7f6f3;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.3;
}

#mdb h3 {
  margin: 30px 0 12px;
}

#mdb h3 .content {
  display: inline-block;
  padding-bottom: 2px;
  border-bottom: 3px solid #fdecc8;
  color: #37352f;
  font-size: 18px;
  font-weight: 600;
}

#mdb h4 {
  margin: 24px 0 8px;
  text-align: left;
}

#mdb h4 .content {
  display: inline-block;
  color: #eb5757;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

#mdb ul,
#mdb ol {
  margin: 16px 0;
  padding-left: 24px;
  color: #37352f;
}

#mdb ul { list-style-type: disc; }
#mdb ul ul { margin-top: 6px; list-style-type: circle; }
#mdb ol { list-style-type: decimal; }
#mdb ol ol { list-style-type: lower-alpha; }

#mdb li { margin-bottom: 8px; line-height: 1.7; }

#mdb li section {
  color: #37352f;
  font-size: 16px;
}

#mdb .multiquote-1,
#mdb .multiquote-2,
#mdb .multiquote-3 {
  margin: 24px 0;
  padding: 16px 16px 16px 20px;
  border: none;
  border-left: 4px solid #37352f;
  border-radius: 4px;
  background-color: #f1f1ef;
}

#mdb .multiquote-2 {
  border-left-color: #2d9cdb;
  background-color: #e7f3f8;
}

#mdb .multiquote-3 {
  border-left-color: #f2994a;
  background-color: #fdf5f2;
}

#mdb .multiquote-1 p,
#mdb .multiquote-2 p,
#mdb .multiquote-3 p {
  margin: 0;
  color: #37352f;
  font-size: 15px;
  line-height: 1.6;
}

#mdb a {
  border-bottom: 1px solid #999;
  color: #37352f;
  font-weight: 500;
  text-decoration: none;
}

#mdb strong {
  margin: 0 2px;
  padding: 2px 4px;
  border-radius: 3px;
  color: #37352f;
  background-color: #fdecc8;
  font-weight: 600;
}

#mdb hr {
  width: 100%;
  height: 1px;
  margin: 40px 0;
  border: 0;
  background-color: #e3e2e0;
}

#mdb img {
  display: block;
  width: 100%;
  margin: 30px auto;
  border: 1px solid #e3e2e0;
  border-radius: 4px;
}

#mdb figcaption {
  margin-top: 8px;
  color: #999;
  font-size: 14px;
  text-align: center;
}

#mdb p code,
#mdb li code {
  margin: 0 4px;
  padding: 3px 6px;
  border-radius: 4px;
  color: #eb5757;
  background: rgba(135, 131, 120, 0.15);
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 14px;
}

#mdb pre,
#mdb pre code {
  border: none;
  border-radius: 4px;
  background: #f7f6f3;
}

#mdb pre code {
  display: block;
  padding: 20px;
  color: #37352f;
  font-family: "SFMono-Regular", Consolas, Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre;
}

#mdb table {
  width: 100%;
  margin: 30px 0;
  border: 1px solid #e3e2e0;
  border-collapse: collapse;
  font-size: 14px;
}

#mdb table th,
#mdb table td {
  padding: 10px 12px;
  border: 1px solid #e3e2e0;
  color: #37352f;
  text-align: left;
}

#mdb table th {
  background: #f7f6f3;
  font-weight: 600;
}
`;
