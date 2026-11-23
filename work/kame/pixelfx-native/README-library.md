# pixelfx Windows 运行时移植

Godot 4.7.2 独立演示包含 Patch pixelfx 提交 `5294518` 的 244 个效果。用 C++ GDExtension 管理实例、时间与纹理上传，两个绘制层分别提交。束身专用的 `ArcaneBeamNative` 完全用 C++ 实现。通用 `PixelFxLibrary2D` 在进程内用 JavaScriptCore JIT 执行原版效果和粒子公式。上游原库与游戏工程均由独立演示引用。

## 启动

下载包首次解压后，在包根目录运行 `pwsh -File ./prepare_runtime.ps1`，然后在 Godot 打开 `demo/project.godot`。本机工作目录已准备好依赖。选择类别和效果即可实时播放，带演出的效果可以勾选「演出」。

在 Godot 可创建 `PixelFxLibrary2D`，调用 `play("explosions/smoke-bomb", {}, false)`。第二项是上游效果接受的参数字典。需要绑定游戏时间轴时将 `autoplay=false`，逐步调用 `advance(seconds)`。可用 `list_effects()`、`describe(id)` 查看目录。想保留纯 C++ 光束时用 `ArcaneBeamNative`，它也支持 `render_at(seconds)` 随机访问任意相位。

## 重编译 Windows DLL

把 `godot-cpp` 检出到此目录下的同名文件夹，使用提交 `24b9df7`。压缩包已包含生成的 JS bundle 和 C++ 嵌入文件。使用 MinGW-w64 和 SCons 构建。

```powershell
scons -j8 platform=windows arch=x86_64 target=template_release use_mingw=yes
```

更新效果时，安装同目录下的固定 esbuild 依赖，并把参数换成上游代码的检出目录。

```powershell
npm.cmd install --prefix runtime-deps esbuild@0.27.4
node library/build_bundle.mjs C:/path/to/pixelfx
```

## 逐帧核验

用 `node library/reference.mjs` 在 Node V8 生成参考，再用 Godot 无头运行 `res://verify_library.gd`，并把本目录下 `library-results` 的绝对路径作为参数。用 `python library/compare.py` 读两组结果。需要 NumPy 和 Pillow。包内 `reports/` 有逐效果抽样统计和实测开销。抽样覆盖 244 个普通效果、73 个演出及 4 个代表效果的 36 帧，每项调用原始核心维护模拟状态。

## 依赖来源

- [Patch pixelfx 5294518](https://github.com/patch-gg/pixelfx/tree/5294518) 提供原版效果，许可和署名在 `licenses/`。
- [NativeScript 的 JavaScriptCore Windows 包](https://www.npmjs.com/package/@nativescript/windows-jsc/v/0.1.0-alpha.0) 从 Playwright WebKit 取得 JavaScriptCore 与 ICU。准备脚本从固定版本获取四个原版 DLL，校验包 SHA-256。
- [godot-cpp 24b9df7](https://github.com/godotengine/godot-cpp/tree/24b9df7) 提供 GDExtension 绑定。本包的可执行二进制适用于 Windows x86-64，已在 Godot 4.7.2 验证。

