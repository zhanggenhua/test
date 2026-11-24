# 元气弹实时追踪

[独立 3D 检查](../../outputs/index.html#spirit/anime-study)可切换斜俯和透视侧视。[2D 横版预览](../../outputs/index.html#spirit/anime-burst)复用同一球体、轨迹、尘道、爆发和碰撞时点。两处都能切近距、远距或移动目标，并调整目标起点。右侧是龙珠原片，下方是气宗师完整视频。

| 验收 | 网页样例结果 |
| --- | --- |
| 近距 | 2.38 秒在空中碰到目标并引爆，未产生地面尘道。 |
| 远距 | 2.98 秒落地，沿地面继续追踪和逐段掀尘，3.84 秒碰到目标并引爆。 |
| 移动目标 | 目标沿场地移动，3.53 秒在实际相交位置触发。另测目标移到另一侧时反向追踪，无目标时按寿命结束。 |
| 投影 | 两种 3D 机位和横版使用世界半径 87。缩放来自 3D 投影。横版飞行和贴地阶段球径保持稳定。 |

| 参考与原片时码 | 用途 |
| --- | --- |
| 龙珠 16:13.100–16:17.000 与 20:30.167 | 推掌、球缘临近地面及远距推进留尘。原片后半随景深缩小，横版沿固定战斗轴追踪。[下压原帧](../../outputs/dragon-vfx/reference/spirit/dragonball/anime-release-descent.png) · [推进原帧](../../outputs/dragon-vfx/reference/spirit/dragonball/anime-ground-travel.png) |
| 龙珠 20:31.733 | 白闪从撞击位置冲出画框。[原片白闪全幅](../../outputs/dragon-vfx/reference/spirit/dragonball/anime-final-outburst.png) |
| 气宗师 4.100、5.000–6.000 秒 | 爆发画面沿用气宗师的亮核、深色半球外壳、前景冲击带与碎石层次。亮核和外壳沿圆形体积展开，旋转来自表面青白光带。光带退去后留下青白漩涡，尘土沿外圈散开。[爆发原帧](../../outputs/dragon-vfx/reference/spirit/cards/burst/user-burst-05-match-4.100.png) · [气宗师全幅录像](../../outputs/dragon-vfx/reference/spirit/clips/lostark-qizong-spirit-bomb.mp4) |

网页回放以 120 Hz 采样目标位置，用同一飞行模拟生成可拖动的画面。即时制接入时，`DragonSpiritAnimeArena.createHoming({x,y,ground,direction,radius},settings)` 由出手点创建模拟，逐步传入 `step(dt, {x,y,halfWidth,halfHeight})`，按 `groundAt` 和 `hit` 触发后续效果。参数单位沿用调用方的世界坐标和秒。网页的默认 2 秒出手和右侧原片时间码用于预览对齐。

[3D 完整录像](../../outputs/dragon-vfx/spirit-anime-study.mp4) · [3D 爆发峰值](../../outputs/dragon-vfx/spirit-anime-study-shell.png) · [3D 青白漩涡](../../outputs/dragon-vfx/spirit-anime-study-vortex.png) · [横版完整录像](../../outputs/dragon-vfx/spirit-anime-arena.mp4) · [横版爆发峰值](../../outputs/dragon-vfx/spirit-anime-arena-shell.png) · [横版青白漩涡](../../outputs/dragon-vfx/spirit-anime-arena-vortex.png)

# 元气弹 2D 横版试演

[统一预览 · 2D 横版](../../outputs/index.html#spirit/arena)左侧采用 960×400 的天下第一武道会擂台和现有角色动画。右侧默认同步播放《龙珠Z》布欧篇元气弹动画。气宗师列第二，仅用于命中与余波。独立 3D 和旧版横版从参考菜单手动切换。

相同的撞地爆闪、半球浪、亮丝、碎片和旋涡用横版固定机位重新投影。贴地反光绘制在擂台深度平面并沿台面边缘裁剪。2D 角色从自身透明轮廓写入深度，目标在爆闪时短暂被亮核覆盖。两侧共用时间轴。横版预览延至 6.200 秒，保留第二参考气宗师 4.567 秒塌落、5.000 至 6.000 秒余波持续、6.200 秒出现破口、6.533 秒残光和 7.000 秒清场的先后。侧视余波重建了低位带电气流与断开的暗边。

默认对照使用 [元气弹原片 20:16–20:39](https://www.bilibili.com/video/BV1ACvYejEEA/?t=1216) 的连续爆发和退场段。右侧按白闪、远景爆面和尘浪对应，前摇期间保留该段首帧。投出与触地另有 [原片 16:10–16:24](https://www.bilibili.com/video/BV1ACvYejEEA/?t=970) 的连续片段，可在同一菜单切换。两段都保留原画幅。气宗师时码单独按第二参考记录。

[撞地爆闪 2.700 秒](../../outputs/dragon-vfx/spirit-arena-flash.png) · [半球与碎石 3.200 秒](../../outputs/dragon-vfx/spirit-arena-vortex.png) · [贴地余波 4.100 秒](../../outputs/dragon-vfx/spirit-arena-collapse.png) · [暗浪裂散 5.300 秒](../../outputs/dragon-vfx/spirit-arena-breakup.png) · [完整横版录像](../../outputs/dragon-vfx/spirit-arena.mp4)

# 元气弹独立 3D 试验

[统一预览的独立 3D 版本](../../outputs/index.html#spirit/study)在独立三维场景内播放举手、聚气、前送、飞行、触地、爆发和收势。独立场景机位依据第二参考气宗师的透视和角色站位估计。右侧默认对照《龙珠Z》动画。可切侧视、反向透视，或暂停后旋转、调整俯仰。擂台版留作历史对照。3D 的占位人、地面和体积按同一个透视相机与深度缓冲合成。

| 阶段 | 第二参考全幅 | 独立 3D 全幅 | 采用的要素 |
| --- | --- | --- | --- |
| 初爆 | [3.700 秒](../dragon-vfx-rebuild/reference/spirit/cards/burst/user-burst-04-match-3.700.png) | [2.800 秒](../../outputs/dragon-vfx/spirit-study-impact.png) | 亮核瞬间扩张，压浪外翻，第一批离体电弧。 |
| 持续 | [4.100 秒](../dragon-vfx-rebuild/reference/spirit/cards/burst/user-burst-05-match-4.100.png) | [3.200 秒](../../outputs/dragon-vfx/spirit-study-vortex.png) | 开口冲击浪的高背缘和低前缘、卷动的内层亮丝、向外抛的飞石。 |
| 散开 | [5.000 秒](../dragon-vfx-rebuild/reference/spirit/cards/burst/burst-07.png) | [4.100 秒](../../outputs/dragon-vfx/spirit-study-collapse.png) | 亮核垮向地面，余能沿螺旋回卷，暗烟的足迹保持更久。 |

飞行球在触地后迅速裂开。六股离体喷流先从落点向不同方向冲出，短促的反光随压力波掠过地面。随后外浪沿贴地半球扩张。半球的底缘跟随实际地面，近侧低沿和远侧高背缘间留有破口。亮核的体积中心设在地面，所有横截面从落地点附近的宽底向顶部收窄。卷动亮丝沿相同半球分布，随碎片回落转为贴地旋涡。

用第二参考气宗师的 3.600、3.700、4.167 和 5.033 秒逐段核对。3.600 秒白热团先填满，灰色近浪切过前景。3.700 秒浪沿向外翻，地面反光散出；4.167 秒才露出绕核亮丝和碎片。5.033 秒亮体落地，仍留下宽而不规则的暗边和卷动光迹。对应的 [撞地爆闪全幅](../../outputs/dragon-vfx/spirit-study-flash.png) 为左侧 2.700 秒。爆闪、厚浪、贴地反光、受光碎片和残余尘浪分开计时。

气宗师片段提供爆发结构和时序，配色沿用元气弹。体积内核和贴地烟、旋流使用同一个射线积分通道。开口外浪是三维网格，电弧、碎石和地面反光单独渲染。空间构造和相机为目视重建。同步页的 3.190 秒对齐参考 4.100 秒，录像以 30 fps 取样。

[完整 3D 录像](../../outputs/dragon-vfx/spirit-study.mp4) · [3D 场景源码](../dragon-vfx-rebuild/spirit-study.js) · [第二参考来源](https://www.bilibili.com/video/BV1Wu4y1u7wh/)

## 元气弹 V17 横版存档

[统一预览](../../outputs/index.html#spirit)的同步进度条在两幅画面上方。拖动会暂停并定位左右画面，方向键可以逐帧。参考菜单可选元气弹动画原片、第二参考气宗师和上一版 V16。

第二参考气宗师的 [3.700 秒全幅](../dragon-vfx-rebuild/reference/spirit/cards/burst/user-burst-04-match-3.700.png)用于观察初爆， [4.100 秒全幅](../dragon-vfx-rebuild/reference/spirit/cards/burst/user-burst-05-match-4.100.png)用于观察白热旋流的轴线、内外层遮挡和飞石。右侧 4.100 秒对应横版 3.190 秒。眼见的依据来自原片，空间密度和背侧节奏按横版视口重建。球和爆发沿用元气弹配色。

原先的旋纹附着在折叠球面。V17 将旋流重建为三维发光密度场。每个像素沿透视视线在有限空间内采样，累积发光和消光，同时与擂台、角色的实写深度相交。后方暗壳、近侧压环、电弧和飞石各自按三维位置绘制。压入时的球面逐步过渡为内核体积，退场分为外壳破开、内核下沉和地面余波。[Swardson 体积爆炸教程](https://www.jd.swardson.com/projects/raymarched-explosion.html) · [GPU Gems 体积渲染](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-39-volume-rendering-techniques)

[完整擂台 V17 · 3.167 秒](../../outputs/dragon-vfx/spirit-shell.png) · [完整擂台 V16 · 同一帧](../../outputs/dragon-vfx/legacy/spirit-v16-shell.png) · [完整录像 V17](../../outputs/dragon-vfx/spirit.mp4) · [完整录像 V16](../../outputs/dragon-vfx/legacy/spirit-v16.mp4)

## 元气弹 V16 存档

[横版存档](../../outputs/index.html#spirit/arena-legacy)保持 960×400 的天下第一武道会擂台、既有站位与对照格。右侧默认播放用户指定的命中参考，可切到「上一版 · V15 元气弹」并按离手、首触、爆发对齐。

| 全幅参考 | 使用范围 |
| --- | --- |
| [《龙珠斗士Z》58.354 秒聚气](reference/frames/source-0047.png) | 聚气的光线朝头顶球缘集中。球体在该机位出画。 |
| [《龙珠斗士Z》60.221 秒推送](../dragon-vfx-rebuild/reference/spirit/cards/action/base-goku-release-60.221.png) · [后续下压](reference/frames/source-0121.png) | 双掌向前下方送球。60.288 秒发生切镜，横版的具体飞行时长和抛物线按固定擂台距离设置。 |
| [用户提供的球体素材 2.000 秒](../dragon-vfx-rebuild/reference/spirit/cards/sphere-048.png) | 白核、青白半透球壳和沿球面动纹。 |
| [气宗师参考 4.100 秒](../dragon-vfx-rebuild/reference/spirit/cards/burst/user-burst-05-match-4.100.png) | 壳层遮挡、内核光丝与碎片抛出。配色取元气弹的青白材质。 |

旧版球半径在 2.020 至 2.860 秒的飞行中由约 85 增到 103 像素，角色还会在出手后切回推球姿势。新版在 2.000 秒离手，半径保持 87 像素，2.500 秒以球缘触及对手。前送、离手和首触的球心与速度连续。聚气的每条光迹用预计入球点生成固定空间路径，接触时才计入球体能量。受击后球体减速并轻微受压，三维爆发继承同一球心和尺度，擂台表面与飞行、命中阶段共用深度。

已有角色姿势用于 2D 角色面片。聚气和尾迹用有深度的网格光带，球体、爆发壳、碎石和场景使用同一 WebGL 2 投影、深度缓冲和 HDR Bloom。浏览器把这一张整幅画面送入原有播放器。元气弹材质按视频重建，作者工程尚未取得。网页录像为 30 fps、144 帧。下列图片为完整擂台，选帧用于目视对照。

- [离手 2.000 秒](../../outputs/dragon-vfx/spirit-release.png)
- [飞行 2.267 秒](../../outputs/dragon-vfx/spirit-flight.png)
- [首触 2.500 秒](../../outputs/dragon-vfx/spirit-contact.png)
- [峰值 2.867 秒](../../outputs/dragon-vfx/spirit-peak.png)
- [完整录像](../../outputs/dragon-vfx/spirit.mp4)

## 元气弹 V11

默认在 960×400 擂台显示整团元气弹爆炸。球离手后镜头拉远，到触地时站定。舞台、双方角色与特效共用同一套镜头变换，命中点始终贴着擂台。第二个视角用常态悟空实机的覆盖范围看同一个体积，便于逐帧核对。同步页可并排看原片、两种 V11 投影和 V10。切换攻击距离只改变命中位置。

| 来源与时间 | 实际用于重构的部分 |
| --- | --- |
| 《龙珠斗士Z》常态悟空 LV3，63.788–64.954 秒 | 暗场、细光柱、蓝色前缘斜推、峰值前景飞石、光膜裂开、横向余波。这个机位始终没有露出命中亮体的完整边界。[同版实机](https://www.bilibili.com/video/BV11s411M7oV/?t=63) |
| 《斗士Z》超赛悟空对小布欧剧情终结，本地录像 178.667 秒 | 同游戏另一段演出。第 4288 帧（从零计）可见触地亮体的顶肩、左右外缘、绕球热带与近地冲击环；下侧一部分被人物、光与碎石遮住。时间码对应本地 24 fps 录像，网页提供其中 177–181 秒的无声全幅节选。[原帧](reference/wide/fighterz-finish-contact-wide.png) · [节选](reference/wide/fighterz-finish-177-181.mp4) |
| 《龙珠Z》布欧篇，20:23.000 | 同一招式在另一段演出里的远景。地貌后面有宽圆肩、白热核与窄青边，离体电弧越过上缘。地貌遮住底部。[全幅选帧](reference/wide/anime-20m23-wide.png) |
| 同一动画，20:29.000、20:30.500 | 亮体下缘被掀起物遮挡，随后更远的俯看镜头揭示地面的纵深。横版复用了前后层次，收尾的横向青白光带取自格斗实机。[近地遮挡](reference/wide/anime-20m29-ejecta.png) · [地面纵深](reference/wide/anime-20m30-5-wake.png) |

这些图片均用于目视拆解。三维模型的背侧、内部密度流动、破口深度以及完整投影尺寸，是横版适配的推测。WebGL 2 在同一体积里累积发光与遮挡。触地后，蓝白弧先从近侧卷过球体右下缘；等球壳裂开，第二道冲击沿擂台地面散开。壳层、电弧、碎石与两次地面冲击共享命中时钟。在无 WebGL 2 的环境，播放器用相同模型、相同两种投影烘焙出的透明序列。可用 `python volume-blast/bake.py` 从正式着色器重建序列，再用 `python build.py` 生成独立网页。

## 元气弹 V10 存档

实机 64.188–64.588 秒的镜头只拍到了大爆面的一角。V9 在目标脚下补出了平底、穹顶和右侧回落端。那三条轮廓没有来自原帧。V10 用固定横版全景重做这个阶段，保留施法者作为尺度参照。比较页左侧是原片，另外三格是 V10、V9 F 与 V9 E。

| 实机帧与时间 | 实际可定位的前缘和遮挡 |
| --- | --- |
| 222 · 64.188 秒 | 同一段弧线从下边框的中部偏右延伸到右边框下部，左侧可见悟空。 |
| 226 · 64.321 秒 | 右边的交点上移，下边的交点左移。镜头内仍只看到一段弧。 |
| 234 · 64.588 秒 | 左缘从下边偏左通到上边中部附近。右侧、下方和上方都有青白亮面延伸出画，飞石以深色剪影从面前穿过。 |
| 237–240 · 64.688–64.788 秒 | 波面内部先出现不规则的大缺口，背景与人物陆续露出，残光仍横跨右边框。 |

上述原帧用于目视观察，保留原始 640×360 画幅。原片切镜，擂台候选固定在 960×400。画外范围属于横版演出的构图选择，这几帧只能约束局部弧度、覆盖和时序。[实机视频](https://www.bilibili.com/video/BV11s411M7oV/?t=64)

## 元气弹 V9 存档

网页使用 960×400 的固定擂台。同一时钟播放举手、聚气、投出、命中和收势，全程 4.26 秒。全景对比中的 D 沿用 V8 的爆炸，E 使用实时体积，F 使用透明图集。三版共用角色、场景、球体、距离和相位映射。选择“原片与三种方案同步”可按原片逐帧前后步进，也可直接打开 `spirit-bomb-v9.html?view=compare`。

实机参考为《龙珠斗士Z》常态悟空的同一段录像。实机的摄影机会跟拍并切镜，擂台候选保留双方站位。下列全幅帧用于目视观察，候选的贴图与材质均由程序生成。[实机录像 1:03 起](https://www.bilibili.com/video/BV11s411M7oV/?t=63)

| 实机帧 | 视频时间 | 命中演出 |
| --- | --- | --- |
| 210 | 63.788 秒 | 球压低后，暗场中先能看见飞石和碎光。 |
| 216 | 63.988 秒 | 几束稀疏的竖光先起，地面尚能辨认。 |
| 226 | 64.321 秒 | 青白前缘从地面斜着推高。 |
| 234 | 64.588 秒 | 白热爆面遮住大片场地，前景岩块仍有清晰剪影。 |
| 237、245 | 64.688、64.954 秒 | 破口露出背景，随后余光分成横向掠过的条带。 |

E 在 WebGL 2 中沿视线采样爆面密度，将入射侧的高亮遮挡、向外扩张的孔洞与独立运动的碎石分开。Sol 退回了第一版透光过多的爆面和第二版连续深蓝描边。第三版已通过原片同阶段的全景验收，候选前缘更偏上涌，原片更斜。[Jonathan Swardson 的体积爆炸拆解](https://www.jd.swardson.com/projects/raymarched-explosion.html)

F 采用预渲染图集，基线通过 pixelfx 上游实际导出。来源与重建方法见 [图集记录](impact-flipbook/README.md)。[Drawcall 的 VFX skill](https://github.com/drawcall-ai/game-skills/blob/fbd8ab99de342bf33f2693162b2abee3b6f9f72b/skills/vfx/SKILL.md) · [pixelfx 的等离子爆炸](https://github.com/patch-gg/pixelfx/blob/5294518ce7c72e48b6100a744596e0acf57f2826/src/fx/explosions/plasma-explosion.js)

Sol 退回了悬空的首版和形似护盾的第二版。第三版使用 43 张按擂台原尺度烘焙的透明帧。原片 226–234 帧的前缘从低位斜升，237–245 帧的破口透出背景，随后低空余带扫出。F 的相位与方向最接近这段实机，因此设为默认。E 的近景飞石和亮面内的明暗层次更强。F 和 E 都可在同一个网页单独看完整擂台。

## 元气弹 V8 存档

预览从完整擂台原速播放。D 是新版，C 是体积球方案，A 是旧版。三个候选共用 3.70 秒播放时钟，D 将两人的间距扩大 70 个画布像素、落脚下移 31 像素，以容纳头顶聚气与向下压进的轨迹。投出约在 1.72 秒，球缘首次接触约在 2.44 秒。切到“原片与三种方案同步”可按实机源帧步进。

D 的 WebGL 2 材质分别控制白核、半透蓝壳和外缘断开的光束。汇入、人物整身姿势、地面反光、球缘接触和场景受光由时间轴驱动。[元气弹密度分布研究](https://gamescience.jp/2006/Paper/Sakai_2006.pdf#page=24) · [元气弹聚气实作](https://osamarehman96.github.io/Portfolio/SpiritBomb.html) · [投射体材质与流光教程](https://ashif.artstation.com/projects/L4QnvR)

Sol 第一轮从完整录像退回了命中段。第二轮核对全程 22 张取样和关键帧，球缘压住目标、同一处光向地面展开、竖光和贴地余波先后退去，目标留在击退位置，完整擂台演出通过。原片的摄影机变化更大，候选光柱轮廓较规整。

## 元气弹 V7 存档

打开特效预览总览的元气弹。默认停在用户指定的《龙珠斗士Z》61.921 秒原帧，A、B、C 使用同一球径和相机投影。「等大小球体近景」按实机原始时间源播放，「完整擂台」保留候选 2.660 秒的招式时间、角色比例、出手与命中位置。原片是另一台跟拍镜头，等大小近景用于比对球体结构。

| 球体方案 | WebGL 2 实现 | Sol 验收 |
| --- | --- | --- |
| A · V6 基线 | 单表面着色、中心亮斑和实体形长尾。 | 白芯与壳内空间分层不足，作为旧版对照。 |
| B · 三维壳层 | 解析球面前后交点、分别滚动的光纹、独立白核。 | 轮廓清晰，内部波纹较强，保留为备选。 |
| C · 体积采样 | 球体内进行 18 步射线积分，积累发光与透射，叠加宽窄不同的光束和前壳青色碎带。三种模式共用球体位置和持续时长。 | 第三轮通过指定飞行帧和同步对照。原片光束对比更强，C 白芯更圆，右下折光较规则。 |

实机 61.821 秒（帧 151）的亮芯上侧有青色带，61.921 秒（帧 154）带子扫过芯体，62.088 秒（帧 159）球芯向右下，碎带落至芯体下缘。三张全幅图来自同一 [实机视频](https://www.bilibili.com/video/BV11s411M7oV/?t=61)。选帧用于目视验收，网页实时出图。参考制作讲解见 [Rinban 球面与 Billboard 对照](https://rinbanacademy.artstation.com/projects/qJgm2D)、[CGHOW 球面和独立内核](https://ashif.artstation.com/projects/8BX2yE) 和 [Scratchapixel 体积步进](https://www.scratchapixel.com/lessons/3d-basic-rendering/volume-rendering-for-developers/ray-marching-algorithm.html)。

## 元气弹 V6

默认左侧播放《龙珠斗士Z》实机，右侧是 2.660 秒的横版候选。飞行、接触闪、竖向爆发、横向光浪可直接定位，并按实机时间戳逐帧。V5 的《龙珠Z》动画原片仍可在左侧选择。

| 目视核对 | 用在 V6 的依据 |
| --- | --- |
| [《龙珠斗士Z》实机 1:00–1:05](https://www.bilibili.com/video/BV11s411M7oV/?t=60) | 白核和青蓝球壳压向下方。近地命中先竖起白青光带，再在低处横向散开。采用这套命中顺序。全幅选帧见下表。 |
| [《龙珠 超宇宙2》P9 0:13–0:17](https://www.bilibili.com/video/BV1GG4y1q7HR/?p=9&t=12) | 普通超级元气弹在青白球光内连击，退光时目标仍可读。 |
| [《龙珠Z 卡卡罗特》P103 2:39–2:42.5](https://www.bilibili.com/video/BV15i4y1j7wN/?p=103&t=159) | 剧情终结仍以大球、白核和绕球光弧为主，局部扬尘压在下层。 |
| [《龙珠 电光炸裂！ZERO》短片](https://tenor.com/view/goku-sparking-zero-dragon-ball-spirit-bomb-dragonball-gif-10969869256234629916) | 短片供球壳流光参考，覆盖到蓄力。 |

飞行尾迹从同一颗球当前位置及前一时刻的轨迹取样，球缘接触时在接触点依次绘制闪点、上冲的亮核、碎光和低位冲击波。制作参考为 [Epic 粒子拖尾](https://dev.epicgames.com/documentation/fortnite/creating-fireworks-3-building-the-firework-trail-in-unreal-editor-for-fortnite)、[Niagara 位置与碰撞事件](https://dev.epicgames.com/documentation/en-us/unreal-engine/events-and-event-handlers-in-niagara-effects-for-unreal-engine) 和 [Riot 游戏特效教程](https://www.riotgames.com/en/artedu/visual-effects)。本预览用 WebGL 2 绘制球体，Canvas 按轨迹绘制拖尾与接触特效。

## V5 对照存档

从特效预览总览打开元气弹。左侧默认是《龙珠Z》小布欧战的原声剪辑，12:35–20:43 连着涵盖献气、聚气、投出、对抗和退光。选时间点可把两侧定位到对应阶段，播放时各走各自的时间轴。右侧「从头播放全程」可播放完整 3.840 秒试片。也可切换《龙珠斗士Z》实机、V2 Canvas 或项目通用能量球。实机对照按招式阶段同步，按原始时间戳逐帧。八张实机 PNG 保留参考流的完整 640×360 画面。

| V5 采用的动画帧 | 可见依据 |
| --- | --- |
| [13:30 举臂聚气](https://player.bilibili.com/player.html?bvid=BV1ACvYejEEA&autoplay=0&t=810) | 悟空的双臂伸向上方，人物与远处地形之间有向上的白色光迹。 |
| [16:13.1 双掌投出](https://player.bilibili.com/player.html?bvid=BV1ACvYejEEA&autoplay=0&t=973.1) | 双掌向前下方推，下一镜头切到球向地面压下。 |
| [16:20 球体触地](https://player.bilibili.com/player.html?bvid=BV1ACvYejEEA&autoplay=0&t=980) | 触地后白核和青色球缘仍在，地表滚起浅色尘团。 |
| [16:23.5 抵住球体](https://player.bilibili.com/player.html?bvid=BV1ACvYejEEA&autoplay=0&t=983.5) | 脚部后移压着碎石，暗色碎屑沿地面飞出。 |
| [20:07 再次推进](https://player.bilibili.com/player.html?bvid=BV1ACvYejEEA&autoplay=0&t=1207) | 发力之后球光占满画面，角色远景继续向前推。 |
| [20:18 吞没](https://player.bilibili.com/player.html?bvid=BV1ACvYejEEA&autoplay=0&t=1218) | 青白光包住目标，目标轮廓逐渐溶在亮面中。 |
| [20:23 膨胀](https://player.bilibili.com/player.html?bvid=BV1ACvYejEEA&autoplay=0&t=1223) | 远景仍看得见整颗圆形白核，以及薄青色球缘。 |
| [20:27 白闪](https://player.bilibili.com/player.html?bvid=BV1ACvYejEEA&autoplay=0&t=1227) | 高亮扩至全幅。 |
| [20:32 散光与尘浪](https://player.bilibili.com/player.html?bvid=BV1ACvYejEEA&autoplay=0&t=1232) | 白光沿地表铺开，低处有浅色扬尘和暗色碎屑。 |
| [20:35 尘浪翻起](https://player.bilibili.com/player.html?bvid=BV1ACvYejEEA&autoplay=0&t=1235) | 光退下后，大块浅烟分层翻起。 |

这些是目视参考，来自同一个可播放的[原声剪辑](https://www.bilibili.com/video/BV1ACvYejEEA/?t=755)。片源去掉了部分原剧对话。补充 [Tenor 小布欧与球体同框短片](https://tenor.com/view/kid-buu-vs-genki-dama-gif-14836941062265987440) 和 [Tenor 投出短片](https://tenor.com/view/goku-kid-buu-dragon-ball-son-goku-majin-buu-gif-3748533250566339010)，后者来自《龙珠 DAIMA》的回顾。

| 对象 | 来源与驱动 |
| --- | --- |
| 项目实际动画 | 技能 140。项目的 `yuanqidan` 是 4 张 SpriteFrames 姿势，源帧权重 1.0、1.3、3.0、1.5，动画基速 10 fps，名义时长 0.68 秒。项目 VFX 延时 0.23 秒调用 `Spirit`，由通用 `orb` 序列帧、0.32 秒飞行 Tween 和 `hit` 序列帧表现。秒数均乘项目演出速度系数。 |
| 参考游戏动画 | 《龙珠斗士Z》常态悟空实机，瑟菲羅斯的 DLC 实机录像，57.221–65.388 秒。连续取样 246 张，30 fps，640×360。原游戏角色与特效的驱动方式从录像无法判定。[实机原片](https://www.bilibili.com/video/BV11s411M7oV/?t=57) |
| 参考特效素材 | 用上游 Patch pixelfx 工具在独立目录渲染 `spell-charge`、`arcane-orb`、`magic-missile` 和 `crit-hit`，分别核对内收粒子、亮芯球壳、尾迹和先闪后散的形态。实机帧用于目视拆解，候选没有调用图像生成工具。[Patch pixelfx](https://github.com/patch-gg/pixelfx) |
| V5 候选 | 3.840 秒的固定横版镜头。将施法者与对手的标准锚点调整到 362、598，落脚深度为 287，保留整身姿势 PNG。WebGL 2 绘制同一颗球从触地、相持到膨胀变亮，Canvas 绘制角色遮挡、贴地碎屑和短白闪。原片的长相持压缩为约半秒。 |
| V4 候选 | 2.620 秒，WebGL 2 Shader 绘制球体和命中光团，Canvas 绘制角色、汇入光路和前景粒子。沿用此前的角色整身帧。光点从低处与两侧沿曲线汇入，进入球壳后驱动球径和球缘亮度。保留横版固定镜头。|
| V2 候选 | 2.620 秒的 Canvas 程序特效。人物以火柴人悟空 V4 超赛原画为造型母版。待机、起手、前压、推掌和回架势复用 V4 的全身 PNG。举臂过渡和托球为直接绘制的两张完整彩稿，使用 57.488 和 58.354 秒的实机姿势；对手使用 V4 常态原画。0.94 秒切入推掌，1.51 秒首次接触。项目通用球模式复用原 `orb` 和 `hit` 贴图，按候选阶段对齐。 |

| 全幅帧 | 实机时间 | 采用要素 |
| --- | --- | --- |
| `00-lift.png` | 57.488 秒 | 手臂上举的姿势与托举轮廓 |
| `00-intake.png` | 58.288 秒 | 切到全身后，青白光路贯穿人物周围并连到球缘 |
| `01-gather.png` | 58.354 秒 | 持续汇入的长光路、白色内核与青蓝球缘。球体被画面上沿截断 |
| `02-release.png` | 60.221 秒 | 双掌先前压，再让球向前移动 |
| `03-flight.png` | 60.821 秒 | 球体保持大轮廓，朝靶位低处下压 |
| `04-contact.png` | 63.954 秒 | 低位先出现上冲的青白光柱 |
| `05-burst.png` | 64.488 秒 | 光壳扩张并抛出碎石 |
| `06-recovery.png` | 64.921 秒 | 光团分成外扩的横向气浪和亮屑 |

已验收实机步进、慢放、正反向、近远距离、未命中、透明底和独立特效记录归零。
