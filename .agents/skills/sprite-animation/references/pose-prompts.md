# 完整姿势提示词

每张图只明确一个动作阶段。用户已有风格与造型优先，不替换为示例角色。参考角色和邻接姿势各负其责：前者约束身份、比例、服装和武器，后者约束姿态衔接。

## 提示词模板

> 为参考角色重画一张完整的动作姿势。参考一是已认可的角色造型；参考二（若提供）是相邻动作帧。保持相同的脸、头身比、服装、发型、武器形状与长度、像素画风和视角。当前阶段为【阶段】，身体重心【位置】，躯干【方向】，支撑脚【接触关系】，摆动腿【运动】。肩膀、上臂、肘、前臂、手腕和手作为一个整体重画，允许合理遮挡和透视缩短。手保持【握持/接触关系】，武器连续且只有【数量】件。完整人物与武器尖端都在画内，留足边缘。清晰、连贯的像素色块，避免细碎噪点。真实透明背景，不把棋盘格画入图中，无地面、投影、文字和动作特效。

英文描述可供生成器使用：

> Draw ONE complete animation pose of the approved reference character. Reference 1 fixes identity, proportions, costume, weapon and pixel-art style; reference 2 supplies the adjacent action pose. Phase: [phase]. Weight: [support and transfer]. Torso: [rotation and lean]. Hands: [grip/contact]. Redraw shoulders, upper arms, elbows, forearms, wrists and hands as integrated anatomy, with believable foreshortening and occlusion. Preserve the continuous weapon and consistent physical proportions. Full body and complete weapon inside generous margins. Clean coherent pixel clusters, restrained texture. Actual transparent background; do not paint a checkerboard. No ground, cast shadow, labels, particles or slash effects.

## 单刀双手劈斩示例

以下是已成功试验的顺序，不是所有攻击必须遵循的模板。

| 阶段 | 动作关注点 | 示例时长 |
| --- | --- | --- |
| 准备 | 双手在腹前握柄，双肘自然垂下，刀尖向前上方 | 400 ms |
| 抬刀 | 握柄升至胸前，刀接近竖直，避开头部 | 110 ms |
| 蓄力 | 双手过额，刀向后上方；肩肘一起抬起，重心后移 | 180 ms |
| 挥刀 | 躯干转向前，双手共同前移，腕部不过度反折 | 60 ms |
| 落刀 | 双手落向腰前下方，前腿承重，刀尖仍离地 | 140 ms |
| 收势 | 身体回正，双肘下降，刀停在身前 | 180 ms |
| 回准备 | 可复用准备画面形成停顿，检查收势→准备的跳变 | 260 ms |

两手握一柄时说明近护手和近柄尾的手、握点间距及手腕朝向；哪一只是左/右手应根据观察到的角色朝向决定，不凭屏幕左右推断。不要为了展示两只手而让手掌翻转或让前臂穿过身体。

行走需按支撑、经过、摆腿和落脚设计；接触地面的脚不能无故滑动。待机则优先小幅胸腔、呼吸、衣摆变化，不强行加入攻击式大幅运动。采用逐帧重绘还是局部变化，应由实际动作决定。
