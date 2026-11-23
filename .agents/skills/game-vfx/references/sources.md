# 特效来源与验证入口

先按项目的参考画面、效果类型和交付格式找候选。这些来源已查过入口，实际使用时复核上游版本和对应资产授权。

| 来源 | 适用场景与试跑入口 |
| --- | --- |
| [Drawcall 的 VFX skill](https://github.com/drawcall-ai/game-skills/blob/fbd8ab99de342bf33f2693162b2abee3b6f9f72b/skills/vfx/SKILL.md) | 美术形态明确的单次爆炸，可预渲染透明序列，把随事件变化的碎屑单独驱动。可用 pixelfx 的 `explosions/plasma-explosion` 做第一份可运行的能量壳样例。对照实机时，分别看前缘何时遮住目标、裂口何时露出场景，以及残光与碎屑各自消失的帧。 |
| [Jonathan Swardson 的体积爆炸制作拆解](https://www.jd.swardson.com/projects/raymarched-explosion.html) | 需要连续改变爆面形状和厚度时，参考距离场、密度累积与轮廓破碎三步。在游戏场景上核对遮挡，按实际参考选分色与消散方式。 |
| [Patch pixelfx](https://github.com/patch-gg/pixelfx) | 程序化像素特效库、浏览器预览和导出。读 [仓库内 skill](https://github.com/patch-gg/pixelfx/tree/main/skills/pixelfx)，用 `node tools/list.mjs beam` 等命令查实际 ID，再用 `node tools/render.mjs <id> --sheet --gif --no-actor` 渲染基线。先看 `contact.png` 和原速动图，改造后重新渲染并用 `node tools/check.mjs <id>` 检查裁边、循环接缝和收尾。制作契约见 [AUTHORING.md](https://github.com/patch-gg/pixelfx/blob/main/docs/AUTHORING.md)，激光的绘制实现见 [arcane-beam.js](https://github.com/patch-gg/pixelfx/blob/main/src/fx/arcane/arcane-beam.js)。透明效果确认使用纯特效输出，保留适用的 [NOTICE](https://github.com/patch-gg/pixelfx/blob/main/NOTICE.md)。 |
| [pixelfx-godot](https://github.com/winkidney/pixelfx-godot#use-it) | 同系列特效的 Godot 移植。按 README 检查版本，在单独的仓库目录运行 `./pfx list beam`、`./pfx sheets arcane/arcane-beam --spriteframes`。Windows 可在移植项目目录运行 `godot --headless --path . -s res://tools/cli.gd -- sheets arcane/arcane-beam --spriteframes`。提交 babe913 已在 Godot 4.7.2 独立导出透明 PNG、JSON 时序和 SpriteFrames 二进制资源（.res）。需要实时调整时再测试 `PixelFx2D` 的 LIVE 模式。 |
| [rng-vfx](https://github.com/MRRengi/rng-vfx/tree/main/skills/rng-vfx) | 对照特效主体轮廓、时序、拖尾、命中与受击表现。先读 `references/craft.md`、`references/motion.md` 和 `references/elements.md`。按本项目引擎实现。 |
| [agent-sprite-forge](https://github.com/0x0funky/agent-sprite-forge#fx-pixelfx-recommended-or-the-image-route) | `generate2dsprite` 已有取用 pixelfx 的入口。查 `skills/generate2dsprite/scripts/fx_pixelfx.py`，可参考它的检查、搜索、导出和记录来源流程。 |
| [SpriteFX](https://github.com/HoangLong256/spritefx) | 需要锁定像素尺寸和调色板时，试 `python -m fx build examples/laser_beam.json --out <dir>` 并检查审计与预览。 |
| [Effekseer VFX skill](https://github.com/kanaworksai-hue/effekseer-vfx-skill) | 多发射器、粒子层或复杂组合可查此工作流。接入前用小样检查当前引擎和平台支持。 |
| [GDQuest 2D Laser](https://www.gdquest.com/library/laser_2d/) / [Godot Line2D](https://docs.godotengine.org/en/stable/classes/class_line2d.html) | 参考长度变化、纹理平铺、命中端点与起止特效。GDQuest 页面分别列出代码和演示美术的授权。 |

- 免费素材可先看 [VSG FX Charge](https://opengameart.org/content/fx-charge) 和 [PVFX Foundry](https://nerijs.itch.io/pvfx-foundry) 的预览和 CC0 声明，再检查下载包。复用前按游戏内尺寸播放。
- 找其它 skill 时检查工具仓库的 `skills/`、文档索引和插件声明，再反查调用这个工具的其他 skill。搜索词同时覆盖效果名称、素材类型、编辑或导出方式、引擎和项目名。

