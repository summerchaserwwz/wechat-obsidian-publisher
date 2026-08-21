# WeChat Obsidian Publisher Agent 规则

## 工作方式

- 默认直接在 `main` 分支开发、验证、提交和推送。
- 用户明确要求交付时，可以直接执行 `git push origin main`。
- 不要求创建 Pull Request，不创建或维护 `release`、`master`、`develop` 等额外发布分支。
- `main` 是唯一发布分支；发布前必须完成与改动风险相称的测试和构建验证。
- 不覆盖 `.env`、账号密钥或插件 `data.json`；不自动发布微信草稿，不重启 Obsidian。
- 保留用户已有改动，只提交明确属于当前任务的文件。

## 提交与推送

- 提交信息保持仓库现有风格，提交前检查 `git diff --check`、测试和构建结果。
- 只暂存当前任务相关路径，不使用 `git add -A` 或 `git add .`。
- 推送前核对远程仓库和目标分支，默认目标为 `origin/main`。
- 不使用 `git push --force`。

## 交付

- README、截图、版本号和安装目录中的构建产物必须保持一致。
- 需要安装插件时，只更新 `main.js`、`manifest.json` 和 `styles.css`，保留 `data.json`。
- 用中文沟通；技术标识符和第三方名称保留原文。
