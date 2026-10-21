# BeadFlow

免费的静态拼豆图纸生成器。使用 React、TypeScript 与 Vite 构建，可直接部署到 GitHub Pages。所有照片解码、缩放、Lab 色彩匹配、图纸渲染与文件导出均在用户浏览器中完成；没有账号、付费、API Key、后端服务器或运行时外部请求。

## 功能

- 上传 JPG、PNG、WebP 图片，数据不离开浏览器。
- 选择网格宽高与最大用色数，映射到 MARD 221 参考色库。
- 统计每个色号的颗粒数，并按 29×29 底板生成全局坐标、行列编号。
- 下载 ZIP：预览 PNG、总览 PNG、每块底板 PNG、打印 PDF、JSON 材料清单。
- 手机与桌面自适应的中文界面。

## 本地开发

需要 Node.js 20+ 与 pnpm 9+：

```bash
pnpm install
pnpm test
pnpm dev
```

生产构建：

```bash
pnpm build
```

访问 Vite 输出的本地地址。发布构建在 `dist/`，可由任意静态托管服务托管。

## 色库与实物核验

`src/data/mard_221_reference.json` 内置 221 个 MARD 色号及其版本、来源、许可和状态。屏幕 HEX/RGB 来自 [Bitbead 的 CC BY 4.0 palettes 数据](https://github.com/pomodiary/bitbead.app/blob/main/data/palettes.json)。该数据为屏幕参考而非厂商测量值，因此所有条目均为 `screen_reference_pending_physical_validation`。制作前务必以同批次实物色卡核验；透明、珠光、夜光等效果色不能由屏幕色值准确表示。

## GitHub Pages

仓库已配置 `.github/workflows/deploy-pages.yml`。工作流在 `main` 分支有提交后运行测试与 Vite 构建，并自动设置 `VITE_BASE_PATH=/<仓库名>/`，所以项目页可正确载入资源。

首次使用：

1. 在 GitHub 创建一个**空的、私有或公开均可**仓库，例如 `BeadFlow`；不要勾选自动创建 README。
2. 在本地确认 `.gitignore` 保留 `example_input.jpg`、`work/`、`output/` 及个人生成文件的忽略规则。不要把私人照片加入暂存区。
3. 执行：

   ```bash
   git init
   git add README.md package.json pnpm-lock.yaml src index.html vite.config.ts tsconfig*.json .github .gitignore LICENSE-CANDIDATE-MIT.txt
   git commit -m "Create local-first BeadFlow web app"
   git branch -M main
   git remote add origin https://github.com/YOUR_ACCOUNT/BeadFlow.git
   git push -u origin main
   ```

4. 在仓库 **Settings → Pages → Build and deployment** 选择 **GitHub Actions**。等待 `Deploy BeadFlow to GitHub Pages` 工作流成功，页面地址将显示在该工作流的部署结果中。

GitHub Pages 的公开可访问性由仓库可见性和你的 GitHub 套餐决定；本项目不会替你创建仓库、推送代码或改变可见性。

## 许可证候选

`LICENSE-CANDIDATE-MIT.txt` 是代码的 MIT 许可证候选文本。采用前请确认项目署名与年份。MARD 色库不应被改写为 MIT；其原有 CC BY 4.0 归属与来源必须保留。

## 旧版 Python MVP

此前的 Python/Streamlit MVP 仍保留在根目录，便于对照和离线实验；GitHub Pages 部署使用的入口是 `index.html` 与 `src/`，不依赖 Python。
