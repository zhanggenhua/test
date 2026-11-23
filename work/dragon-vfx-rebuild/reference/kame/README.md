# 龟波气功原视频、作者场景与对照

[莉莉丝授权转载](https://www.bilibili.com/video/BV194411r7Te/)的简介标注作者 ErbGameArt，工程链接指向[作者的 Unity Asset Store 发布者主页](https://assetstore.unity.com/publishers/28391)。[作者原发教程](https://www.youtube.com/watch?v=TR1xM1HMNQ8)在 Hovl Studio 频道，本地原视频节选取自 B 站转载的 4.200–8.467 秒，128 帧、30 fps。截图和时码见 [manifest.json](manifest.json)。

## 作者包核对

2026-11-23 收到用户提供的 `Kamehameha.unitypackage`，SHA-256 为 `85e9ca9330813538f4cdfce60105e7ffa362826fe9fea0e3f242d3a89702fd9e`。包内有 `Assets/Kamehameha/Demo scenes/Demo.unity`、对应的 `Prefabs/Kamehameha.prefab`、4 个 FBX 和 3 个 shader。随包 Demo 由相机、地面、灯光和特效组成，原视频里的悟空和演出镜头属于视频参考。可在总览右侧切换到核对源码前的旧 3D 试片。 [作者发布页](https://www.patreon.com/hovl/posts/kamehameha-vfx-1-25583523)

- **相机和后处理**。Demo 存的是透视相机，垂直 FOV 60°，位置约为 `(5.421, 3.790, 7.865)`，欧拉角提示为 `(32.9°, -135°, 0°)`，HDR 开启。场景将 Prefab 根放在 `(0, 0, 2)`。`CC.asset` 启用 Bloom，强度 0.5、阈值 1.1、半径 4。场景行为和配置文件两个脚本 GUID 都与官方 Post Processing Stack v1.0.4 对上。 [官方依赖版本](https://github.com/Unity-Technologies/PostProcessing/releases/tag/1.0.4)
- **发射结构**。Prefab 有 14 个粒子系统，其中 6 个按网格渲染。亮束 `KameCore` 和黑层 `KameSmoke` 使用同一 `KameCone2.fbx` 网格的两个实例，材质分别为 `TwoSides15` 和 `TwoSides16`。黑层的粒子起始色为黑。两者尺寸、噪声速率、色彩和 Fresnel 设置独立，寿命 2 秒，均在 1.97 秒发射。材质的双面 shader 用主贴图和粒子色给发光，用滚动噪声、遮罩和 Custom1.x 寿命曲线做裁剪。曲线后半程把可见区域撕开，单靠整束透明度淡出会保留过多完整轮廓。 [原视频 6.967 秒](cards/kame-209.png)
- **橙光和冲圈**。`KameTrails` 在 1.97 秒发出独立的橙色加色网格粒子，使用 `KameCone.fbx` 和 `TrailPart4cg`，粒子寿命 1.7 秒。`BackWaves` 和 `BackWaves2` 同用 `HalfSphere4.fbx`，分别给加色和透明材质，后者从 1.97 秒每 0.2 秒发一次，共 7 次。两组弧面有不同的尺寸和寿命。 [原视频 6.633 秒](cards/kame-199.png)
- **接缝和残束**。`Core` 在循环第 0 秒发出并存活 2 秒，1.97 秒起束，`EndCore`、`MuzzleFlash` 和 `CoreTrails` 在 2 秒接上。速度为 55 单位/秒的拉伸粒子 `CoreTrails` 连发 120 次，间隔 0.01 秒，每颗约 0.3 秒，并单独走 Custom Data 裁剪。原片收尾还可见向前的细丝。上一版网页同相位仍留着整体宽束，应分开驱动粗束解体和细丝运动。 [原视频 8.333 秒](cards/kame-250.png)

## 作者 Unity 实录

本机使用 Unity 2021.3.14f1c1 的普通编辑器模式和 Direct3D 11，实跑作者 `Demo.unity`。场景、Prefab、模型、贴图、shader、60° 透视相机和原 Bloom 配置沿用包内文件。独立工程从官方 Post Processing Stack 1.0.4 导入运行时组件，旧 Inspector 放在 Assets 外。原教程使用 Unity 2018.1，发布包未包含那一版的 ProjectSettings，也未包含视频的人物和场地演出。实录使用本机 Unity 的 Built-in 管线和默认 Gamma 设置。

[本机统一预览](../../../../outputs/index.html#kame/unity)左侧是作者场景的连续录像，右侧可切换公开视频或 WebGL 重做版。按首束、冲圈与退场对齐，也可逐帧看。实录 1280×720、30 fps、122 帧，头两张发射帧为 58、59。实录与作者资源保存在本机，Git 仓库提供播放器和对照记录。

实录帧 110（录像 3.667 秒，Unity 时钟 3.733 秒）呈现冷蓝残丝，`CoreTrails` 和 `KameTrails` 的活粒子都已经归零，`KameCore` 和 `KameSmoke` 各剩一个。网格在最后几帧继续被裁开，留出像薄片和尖丝的形状。上一版网页对尾部用了额外粒子来近似，在该相位仍有较多圆钝白块。向后两帧可见主体几乎消失，发射口单独保留一缕低亮的余波。

## 原片与早期横版试作

在网页统一总览选「原视频对照 · 束身关键帧」，右侧播放原教程片段。选择「同角度 3D 检查」时，左右显示同一份网页候选，右侧可旋转。

| 阶段 | B 站原视频 | 网页时间 | 观察到的差距 |
| --- | --- | --- | --- |
| 第一股光离手 | 6.600 秒 | 2.400 秒 | 原视频先射出分叉的蓝白尖丝，橙丝夹在其中；网页的首束更细、更齐，几股尖丝没有分清。 |
| 下一帧展开 | 6.633 秒 | 2.433 秒 | 原视频在束身不同深度出现几块错开的蓝白亮片，橙带随展开翻到前面；网页更像连续白线，分层不够。 |
| 缠束与冲圈 | 6.967 秒 | 2.767 秒 | 原视频有三个能分辨亮暗面的弧形前缘，橙带在近侧短段骤亮、远侧断开。网页冲圈偏细，白核贯通太长，大片冷色和黑色边界看起来更平。 |
| 余束与收尾 | 8.267–8.333 秒 | 4.067–4.133 秒 | 原视频先减掉口环和橙丝，右侧束身裂成几条钝尖相间的残光继续前移；网页到 4.133 秒大部分残束已淡掉，收束层次不够。 |

上述差距来自解码原片段和网页成片按同一时间轴核对。原视频为带透视的斜机位，早期横版试作用水平侧视。该组对比按阶段检查发射、遮挡、亮暗分层和退场。

## 原材质 WebGL 3D 对照

[统一预览](../../../../outputs/index.html#kame/study)可在本机读取作者包的材质。用 Unity 原 Prefab 采样 14 层粒子的原网格、顶点色、UV 和 Custom1 数据，60 fps，共 244 个样本。WebGL 重新投影并实时计算贴图滚动、深度淡入、裁剪、加色与透明混合，以及 Gamma 场景中的多级 HDR Bloom。粒子网格时间轴来自 Unity 采样，面片和拉伸粒子的朝向按 Unity Demo 相机烘焙。舞台、占位人物和用于对照原视频的机位沿用网页场景。

在 6.23 秒附近，长光楔来自 `Rays` 的原始拉伸面片和 `Trail54` 贴图，脚下断圈由原粒子网格给出。6.95 秒附近的硬边亮片来自原贴图的滚动裁剪，暖色长带和蓝色半球弧来自各自的源材质。8.33 秒以原网格的去除曲线留下蓝白尖丝。可在右侧选择「程序化 3D · 截图所示版」，对照此前偏薄的暖带、过大的黑面和圆钝余斑。

源码和预览入口可随仓库迁移，作者贴图、网格采样与合成录像属于本地资源。把 [UnitySourceMeshCapture.cs](../../UnitySourceMeshCapture.cs) 放进准备好的 Unity 参考工程，在普通编辑器模式用 `-executeMethod UnitySourceMeshCapture.PlayAuthorScene` 导出。把生成的 `mesh-capture` 内容复制到网页的 `outputs/dragon-vfx/local/kame/meshes`。若该目录无材质清单，网页显示程序化试作。网页移植与 Unity 以及发布视频仍有机位、舞台、随机发射和边缘采样差别。

## 程序化 3D 基线

[统一预览](../../../../outputs/index.html#kame/study)可在原视频和旧 3D 录像之间切换，默认从准备阶段开始。左侧为 WebGL 2 实时全幅场景，原片构图、侧视和作者 Demo 参数三种透视机位共用一份网格与发射时序。作者 Demo 参数按包内变换换算到网页坐标，原片机位另按画面拟合。舞台和施术者用 3D 代理模型。

新版用独立的蓝白束身与黑层，分别做噪声裁剪并参与深度测试。暖色缠光和半球弧波采用加色混合。尾丝以独立粒子时间生成，在主束破碎后继续沿束轴离开。全场使用共同深度缓冲和多级 Bloom。 [几何和材质](../../kame-study-effects.js) · [场景和机位](../../kame-study.js)

| 原片全幅 | 新版全幅 | 复查结果 |
| --- | --- | --- |
| [6.600 秒](cards/kame-198.png) | [2.400 秒](../../../../outputs/dragon-vfx/kame-study-launch.png) | 掌心闪光与第一股蓝白、橙色细束同帧发生。 |
| [6.633 秒](cards/kame-199.png) | [2.433 秒](../../../../outputs/dragon-vfx/kame-study-extension.png) | 一帧后束身穿出右侧。新版这时的冷色面较窄，橙线间距更小。 |
| [6.967 秒](cards/kame-209.png) | [2.767 秒](../../../../outputs/dragon-vfx/kame-study-beam.png) | 可区分近端半球弧、包住亮束的黑色片和橙带。新版蓝白纹理更细，弧波较原片更接近闭合。 |
| [8.333 秒](cards/kame-250.png) | [4.133 秒](../../../../outputs/dragon-vfx/kame-study-tail.png) | 近端弧和橙光已退，裂开的蓝白束和细丝仍前行。新版留有较多白亮片，原片的冷蓝长丝更明显。 |

[全幅录像](../../../../outputs/dragon-vfx/kame-study.mp4)为 852×480、30 fps、128 帧。网页用同一全幅镜头分别关闭亮束、黑层、橙带、冲圈和尾丝，核对五层各自产生可见变化。这一轮网页复查使用 WebGL 2 和公开视频。本机作者场景实录现可用于进一步核对材质、Bloom 和尾部裁剪。游戏侧适配留到 3D 版确认之后。
