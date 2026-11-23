# 横版游戏特效测试

双击 [outputs/index.html](outputs/index.html) 打开预览。包含元气弹 V15、龟派气功、三重罗生门 V8、万剑归宗、无限剑制及 pixelfx 移植对照。元气弹与龟派气功支持原速、慢放、逐帧和原片对照。预览可以离线打开，页面内指向来源网站的链接需要联网。

| 目录 | 内容 |
| --- | --- |
| `outputs/` | 可播放的全幅预览、原片节选、参考帧、成片与页面运行所需的素材 |
| `work/dragon-vfx-rebuild/` | 元气弹和龟派气功的编辑源码、参考时间码、构建和导出脚本 |
| `work/sword-domain-v2/` | 两项剑系网页效果的源码与说明 |
| `work/rashomon/README-v8.md` | 三重罗生门制作说明。可编辑美术素材位于 `outputs/rashomon-v8-assets.zip` |
| `.agents/skills/` | 特效制作、美术、动画、抽帧工具和 Windows 文件处理方法 |

游戏中的接入工作在独立的 Godot 项目进行。对于网页候选，在这里继续修效果、看参考和验收完整视口。

## 在新电脑继续制作

直接修改 `work/dragon-vfx-rebuild` 中的源文件。重建龙珠预览需要 Python、Pillow 及 FFmpeg。以下命令从仓库根目录执行。Windows 可用 `py -3` 代替 `python`。

```sh
python -m pip install Pillow
python work/dragon-vfx-rebuild/build.py
python -m http.server 8819 --bind 127.0.0.1 --directory outputs
```

启动后打开 [本地预览](http://127.0.0.1:8819/index.html)。要重新烘焙命中回退图集或导出成片，在另一个终端安装 Node.js 开发依赖和 Chromium，再运行相应命令。

```sh
npm ci
npx playwright-core install chromium
npm run bake:impact
python work/dragon-vfx-rebuild/build.py
npm run export:dragon -- spirit
```

`export:dragon` 可传 `spirit` 或 `kame`。使用已安装的 Chrome 时可让环境变量 `VFX_CHROME` 指向其可执行文件。参考片段的来源与时间码见各预览页及相应的 `reference/` 清单。
