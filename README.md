# 横版游戏特效测试

双击 [outputs/index.html](outputs/index.html) 打开统一特效预览。左侧按玩法分类，右侧在同一页播放所选特效。用「版本」切换试片和历史方案。当前龙珠与剑系播放器保留原片对照、慢放和逐帧。预览可以离线打开，来源网站的链接需要联网。

| 目录 | 内容 |
| --- | --- |
| `outputs/` | 可播放的全幅预览、原片节选、参考帧、成片与页面运行所需的素材 |
| `work/dragon-vfx-rebuild/` | 元气弹和龟派气功的编辑源码、参考时间码、构建和导出脚本 |
| `work/sword-domain-v2/` | 两项剑系网页效果的源码与说明 |
| `work/rashomon/README-v8.md` | 三重罗生门制作说明。可编辑美术素材位于 `outputs/rashomon-v8-assets.zip` |
| `.agents/skills/` | 特效制作、美术、动画、抽帧工具和 Windows 文件处理方法 |

游戏中的接入工作在独立的 Godot 项目进行。对于网页候选，在这里继续修效果、看参考和验收完整视口。

选题先看[特效制作清单](outputs/vfx-worklist.md)，里面有现行招式编号、已有效果和下一项制作要求。

龟波气功可切到[同角度 3D 检查](outputs/index.html#kame/3d)。左右共用束身、缠绕带、发射口和冲圈网格，以及同一演出时间。右侧可选择环绕角或查看实际网格的线框。点击「还原侧视」回到左侧的透视侧视。右侧参考中可选择「上一版 · 正交 3D」。

[独立 3D 试验场](outputs/index.html#kame/study)用于在放进游戏画面前核对原片阶段。地面、占位人物、束身和残丝在同一 3D 场景输出，左侧可切到侧视。

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
