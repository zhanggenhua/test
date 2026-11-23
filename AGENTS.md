# 特效网页工作区

先看 [README](README.md) 确认预览入口和重建方式。修改前分清 `work/` 的编辑源与 `outputs/` 的网页交付文件。美术验收以完整游戏视口和实际显示尺寸为准。先原速看整段，再按相位对照出手、命中和退场。参考说明应记录实际采用的原片与时码。整体效果在网页验收后再交由 Godot 项目接入。

选题先看[特效制作清单](outputs/vfx-worklist.md)，里面有现行招式编号、已有效果和下一项制作要求。

| 工作 | 读取技能 |
| --- | --- |
| 动态特效、分层与命中验收 | [game-vfx](.agents/skills/game-vfx/SKILL.md)、[rng-vfx](.agents/skills/rng-vfx/SKILL.md) |
| 像素效果制作及移植对照 | [pixelfx](.agents/skills/pixelfx/SKILL.md) |
| 美术和逐帧角色动画 | [game-graphics](.agents/skills/game-graphics/SKILL.md)、[sprite-animation](.agents/skills/sprite-animation/SKILL.md) |
| 从视频抽帧、去底和导出精灵图集 | [sprite-gen](.agents/skills/sprite-gen/SKILL.md) |
| Windows 编码检查 | [windows-encoding-safe-read](.agents/skills/windows-encoding-safe-read/SKILL.md) |
