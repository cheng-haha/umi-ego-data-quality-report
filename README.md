# UMI / Ego 数据质量审计报告（公网发布源）

此目录是 `outputs/umidata_quality/` 的公开部署副本。

- `npm run prepare:assets`：复制浏览器所需资源、排除 Rerun 文件并清除本地绝对路径。
- `npm run validate:assets`：检查公开资源、视频引用和路径脱敏。
- `npm run build`：把静态站点构建到 `dist/`。
- 根路径会跳转到 `quality_report.html`。

原始审计输出仍保留在相邻目录，不由本站点修改。
