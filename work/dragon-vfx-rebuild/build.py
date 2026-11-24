"""Publish the source frames, comparison films and local arena renderer together."""
import base64
import hashlib
import io
import json
import shutil
import subprocess
from pathlib import Path
from PIL import Image

here = Path(__file__).resolve().parent
work = here.parent
out = work.parent / "outputs"
dst = out / "dragon-vfx"
dst.mkdir(parents=True, exist_ok=True)

def copy(src, rel):
    target = dst / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, target)
    return "dragon-vfx/" + target.relative_to(dst).as_posix()

def data_uri(blob):
    return "data:image/webp;base64," + base64.b64encode(blob).decode("ascii")

def actor(src):
    with Image.open(src) as image, io.BytesIO() as buf:
        image.save(buf, format="WEBP", lossless=True, method=4)
        return data_uri(buf.getvalue())

actors = {p.stem: actor(p) for p in (work/"spirit-bomb/assets").glob("*.png") if not p.name.startswith("stock")}
actors.update({p.stem: actor(p) for p in (work/"goku-v4/delivery/assets/goku_ssj_v4/body").glob("normal-*.png")})
refs = here/"reference"

def resource(group, name):
    return copy(refs/group/name, Path("reference")/group/name)

def film(group, desc, title, note, offset, subset=None):
    cards = desc.get("cards", [])
    if subset is not None:
        cards = [c for i,c in enumerate(cards) if i in subset]
    return dict(title=title,note=note,offset=offset,film=resource(group,desc["clip"]),
                start=desc["sourceStart"],end=desc.get("sourceEndExclusive",desc.get("sourceEnd")),fps=desc["fps"],
                cards=[dict(file=resource(group,c["file"]),label=c["label"],time=c["sourceTime"]) for c in cards],
                source=desc["source"])

sp = json.loads((refs/"spirit/manifest.json").read_text(encoding="utf-8"))
ball = dict(sp["parts"][0],source=sp["source"])
shape = film("spirit",ball,"球体造型 · KK_憨小二","这段素材只用于青白球壳、球内亮区和外缘流动，左右各走自己的时间。",0,[0,1,3,4,6,8])
burst_stills = dict(id="impact-stills",title="命中效果 · 用户提供的两张原图",note="原片 3.700 秒的亮核冲开外壳，4.100 秒可见绕核光丝、前景宽带和壳外碎石。左侧沿用龙珠元气弹的青白配色。",
    offset=0,start=0,end=4.8,fps=30,source="https://www.bilibili.com/video/BV1Wu4y1u7wh/",cards=[
        dict(file=resource("spirit","user/burst-04.png"),label="过曝内核与穿壳的亮枝",time=3.7,phase=2.79),
        dict(file=resource("spirit","user/burst-05.png"),label="内核旋丝、暗壳和碎石的层次",time=4.1,phase=3.19)])
spirit = []
# These are the game's original 30 fps frames, including the camera cuts.
# Keep an independent native-speed take alongside optional phase matching.
dbdir = work/"spirit-bomb/reference"
native = refs/"spirit/clips/dbfz-entire-lv3.mp4"
if not native.exists():
    subprocess.run(["ffmpeg","-v","error","-y","-framerate","30","-start_number","13","-i",str(dbdir/"frames/source-%04d.png"),"-frames:v","246",
                    "-c:v","libx264","-crf","16","-g","10","-pix_fmt","yuv420p","-movflags","+faststart",str(native)],check=True)
readings=[(13,"起手"),(21,"举起双臂"),(47,"光路汇入球缘"),(103,"双掌前推"),(121,"球体下压"),(154,"白核与青色流带"),(210,"球压低，碎光先起"),(216,"竖光上冲"),(234,"爆面抬起，前景飞石"),(237,"破口露出后景"),(245,"横向残光与碎石")]
pts=json.loads((dbdir/"pts.json").read_text())
cards=[dict(time=pts[i-1],label=label,file=copy(dbdir/"frames"/f"source-{i:04}.png",f"reference/spirit/dragonball/lv3-{i:03}.png")) for i,label in readings]
primary=dict(title="招式主参考 ·《龙珠斗士Z》元气弹",source="https://www.bilibili.com/video/BV11s411M7oV/?t=57",start=pts[12],end=pts[12]+246/30,offset=0,fps=30,
             film=resource("spirit","clips/"+native.name),cards=cards,
             note="实机含切镜。完整擂台采用固定侧视。可按聚气、推球、破裂等阶段对齐，也可各自原速播放。",
             anchors=[[t,pts[i-1]] for t,i in [(0,13),(.48,45),(1.57,78),(2.0,103),(2.23,154),(2.50,210),(2.79,226),(2.88,234),(3.19,237),(3.73,245),(4.8,258)]])
spirit.append(primary)
actions = refs/"spirit/action.json"
for part in json.loads(actions.read_text(encoding="utf-8")):
    if "base-goku" in part["clip"]:
        offset = 2.0-(60.221-part["sourceStart"])
        note = "按双掌前推对齐。原片 60.288 秒从近景切到宽景，63.954 秒出现冲击柱。新版在同一固定镜头内更快抵达目标。"
        name = "《龙珠斗士Z》· 投出至命中"
    else:
        offset = 2.50-(178.667-part["sourceStart"])
        note = "以球壳触地对齐。旧实机录像截取 12 帧，可见大部分外壳、绕球亮带和冲击环。原上传页待核实。"
        name = "《龙珠斗士Z》· 触地外形"
        part["source"] = ""
    spirit.append(film("spirit",part,name,note,offset))
spirit[1:1] = [shape,burst_stills]
identity=json.loads((refs/"spirit/identity.json").read_text(encoding="utf8"))[0]
anime_cards=[]
for src,ts,phase,label in zip(identity["evidenceFiles"],[1223,1229,1230.5],[2.79,3.19,3.73],["白热巨球和离体电弧","明亮球缘后的地面喷射物","远处亮体和低位尘浪"]):
    path=work.parent/src
    anime_cards.append(dict(time=ts,phase=phase,label=label,file=copy(path,"reference/spirit/dragonball/"+path.name)))
spirit.insert(1,dict(title="动画造型 ·《龙珠Z》布欧篇",source="https://www.bilibili.com/video/BV1ACvYejEEA/?t=1223",cards=anime_cards,offset=0,start=0,end=4.8,fps=30,
                     note="动画远景全幅选帧，用于球的白核青边、前景遮挡和贴地扩散。三张图来自不同镜头。"))
burst_clip=refs/"spirit/burst-clip.json"
if burst_clip.is_file():
    shot=json.loads(burst_clip.read_text(encoding="utf-8"))
    start,end=3.2,5.35
    clip=refs/"spirit/clips/lostark-impact-excerpt.mp4"
    subprocess.run(["ffmpeg","-v","error","-y","-ss",str(start),"-i",str(refs/"spirit"/shot["clip"]),"-t",str(end-start),"-an","-c:v","libx264","-crf","16","-pix_fmt","yuv420p","-movflags","+faststart",str(clip)],check=True)
    full=resource("spirit",shot["clip"])
    shot.update(clip="clips/"+clip.name,sourceStart=start,sourceEnd=end,cards=[c for c in shot["cards"] if start<=c["sourceTime"]<end])
    matched=film("spirit",shot,"命中效果 · 气宗师原片","两侧从爆发阶段对齐。原片 4.100 秒对应左侧 3.190 秒，可逐帧看亮丝绕核、壳层遮挡和碎石外抛。左侧配色取自龙珠元气弹。",2.79-(shot["anchor"]-start))
    matched["id"]="impact-film"
    matched["full"]=full
    spirit.insert(4,matched)

km = json.loads((refs/"kame/manifest.json").read_text(encoding="utf-8"))
kame_part = dict(km["parts"][0], source=km["source"])
kame = [film("kame",kame_part,"原视频 · ErbGameArt 教程","右侧为莉莉丝授权转载中 4.200 至 8.467 秒的原视频。左侧是源码核对前的网页试作，按首束离手同步。",0)]

def legacy(filename, title, note, length, fps):
    return dict(title=title,note=note,offset=0,start=0,end=length,fps=fps,source="",cards=[],film="dragon-vfx/legacy/"+filename)

copy(out/"spirit-bomb-v11-7-arena.mp4","legacy/spirit-v11.mp4")
copy(here/"baseline/spirit-v16.mp4","legacy/spirit-v16.mp4")
spirit.append(legacy("spirit-v16.mp4","上一版 · V16 元气弹",
                     "与新版使用同一轨迹、相机和角色。拖动到 3.19 秒可看球面旋纹与体积旋流的区别。",4.8,30))
copy(here/"baseline/spirit-v15.mp4","legacy/spirit-v15.mp4")
spirit.append(dict(legacy("spirit-v15.mp4","上一版 · V15 元气弹",
                          "同一擂台。按离手、首触和爆发对齐，可直接比较球径、投出速度和爆发接缝。",4.8,30),
                   anchors=[[0,0],[1.57,1.605],[2.0,2.02],[2.50,2.86],[2.79,3.15],[3.19,3.55],[3.73,4.09],[4.8,4.8]]))
copy(here/"baseline/spirit-v14.mp4","legacy/spirit-v14.mp4")
spirit.append(legacy("spirit-v14.mp4","上一版 · V14 青白爆面","同一擂台和角色，比较抛球时的速度、命中时的纵深以及退场方式。",4.8,30))
copy(here/"baseline/spirit-v13.mp4","legacy/spirit-v13.mp4")
spirit.append(legacy("spirit-v13.mp4","V13 · 接触时另起半球","同一视口可跟踪两版飞球从出手、压入到破裂的轨迹。",4.8,30))
copy(here/"baseline/spirit-v12.mp4","legacy/spirit-v12.mp4")
spirit.append(legacy("spirit-v12.mp4","V12 · 蓝色半球","两版使用相同的横版擂台。",4.8,30))
spirit.append(legacy("spirit-v11.mp4","V11 · 全幅擂台","从两版起手同时播放，可比较聚气、球面细节与命中节奏。",4.3,30))
previous = dst/"legacy/kame-pixelfx.mp4"
subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y","-ignore_loop","1","-i",str(out/"kame-pixelfx-vfx-preview.gif"),
                "-vf","pad=ceil(iw/2)*2:ceil(ih/2)*2","-fps_mode","vfr","-c:v","libx264","-pix_fmt","yuv420p","-movflags","+faststart",str(previous)], check=True)
copy(here/"baseline/kame-mesh-ortho.mp4","legacy/kame-mesh-ortho.mp4")
copy(here/"baseline/kame-analytic-side.mp4","legacy/kame-analytic-side.mp4")
copy(here/"baseline/kame-oblique.mp4","legacy/kame-oblique.mp4")
copy(here/"baseline/kame-hovl-v1.mp4","legacy/kame-hovl-v1.mp4")
copy(here/"baseline/kame-hovl-v2.mp4","legacy/kame-hovl-v2.mp4")
kame.append(legacy("kame-mesh-ortho.mp4","上一版 · 正交 3D","同一机位、距离和发射阶段，对照透视相机与上一版正交成片。",128/30,30))
kame.append(legacy("kame-analytic-side.mp4","历史版 · 截面 shader","同一侧视、同一时间轴，右侧是几何改造前的实时结果录像。",128/30,30))
kame.append(legacy("kame-oblique.mp4","历史版 · 斜视投影","同一擂台和出手阶段，对照束轴、束宽、发射口和能量绕行。",128/30,30))
kame.append(legacy("kame-hovl-v2.mp4","初期重构 · 首束与束身上缘","同一时轴比较首束橙丝和上缘撕开的负形。",128/30,30))
kame.append(legacy("kame-hovl-v1.mp4","第一版 · 同擂台束身","同一角色、镜头和时轴，比较发射口白热面积、束身轮廓和近远段宽度。",128/30,30))
kame.append(legacy("kame-pixelfx.mp4","早期版 · pixelfx","保留早期版的完整画幅与原生节奏。",1.48,100/7))
kame.insert(1,dict(id="mesh-view",title="网页候选 · 3D 检查",
    note="这是网页候选的检查视图。两侧使用同一套网格、同一时刻与光效。右侧可旋转和显示线框，点「还原侧视」回到与左侧相同的透视侧视。",
    offset=0,start=0,end=128/30,fps=30,source="",cards=[]))
copy(here/"baseline/kame-study-procedural.mp4","legacy/kame-study-procedural.mp4")
study_ref = dict(kame[0], note="原视频 4.200–8.467 秒。左侧以首束离手对齐，默认机位按原片构图拟合。")
study_early = legacy("kame-study-procedural.mp4","早期 · 3D 试验场",
                     "同一施放相位可对比最初试作的束身与发射口。",128/30,30)
study_previous = dict(legacy("kame-study.mp4","程序化 3D · 截图所示版",
                             "按同一时间对照此前的程序化材质。",128/30,30),
                      film="dragon-vfx/kame-study.mp4")
arena_legacy = dict(legacy("kame.mp4","较早横版 · 网页试作",
                            "同一舞台和出手相位，核对新旧两版的束身、冲圈、遮挡及收尾。",128/30,30),
                    film="dragon-vfx/kame.mp4")
arena_3d = dict(legacy("kame-source-materials.mp4","已确认的 3D 材质版",
                       "按发射相位对齐。左侧使用固定横版机位、2D 角色与擂台，右侧保留已确认的 3D 参考场景。",128/30,30),
                film="dragon-vfx/local/kame/kame-source-materials.mp4")
unity_duration = 122/30
unity_film = "dragon-vfx/local/kame/author-unity-demo.mp4"
unity_original = dict(kame[0], note="公开教程含角色与演出机位。同步按首束、峰值与退场对齐。",
                      anchors=[[0,4.2],[58/30,6.6],[69/30,6.967],[110/30,8.333],[unity_duration,8.467]])
unity_web = dict(legacy("kame-study.mp4","程序化 WebGL · 完整场景",
                       "沿用相同演出阶段，比较网页重做与 Unity 原 Prefab 的光型、分层和收束。",128/30,30),
                 film="dragon-vfx/kame-study.mp4",
                 anchors=[[0,0],[58/30,72/30],[69/30,83/30],[110/30,124/30],[unity_duration,128/30]])
spirit_study_take = dict(legacy("spirit-study.mp4","独立 3D · 已确认的撞地冲击",
    "按同一时间同步。右侧是确认的独立 3D 场景，左侧采用游戏横版机位和角色。",4.8,30),
    film="dragon-vfx/spirit-study.mp4",
    cards=[dict(time=t,phase=t,label=label,file="dragon-vfx/spirit-study-"+name+".png")
           for t,label,name in [(2.7,"撞地爆闪","flash"),(3.2,"半球外浪与碎石","vortex"),(4.1,"贴地余波","collapse")]])
spirit_legacy_arena = dict(legacy("spirit.mp4","V17 · 同一横版擂台",
    "两版共用横版舞台、角色站位和时间。可逐帧比较撞地爆闪与贴地余波。",4.8,30),
    film="dragon-vfx/spirit.mp4")
payload = {"actors":actors,
           "unityDemo":{"film":unity_film,"duration":unity_duration},
           "sources":{"spirit":spirit,"spiritArena":[spirit_study_take,spirit_legacy_arena,*spirit],"kame":kame,"kameStudy":[study_ref,study_previous,study_early],
                      "kameUnity":[unity_original,unity_web],
                      "kameArena":[arena_legacy,dict(kame[0], note="原视频 4.200–8.467 秒。按出束相位同步，参考光型和退场。")],
                      "kameArena3d":arena_3d}}
atlas = here/"spirit-assets/impact-v15.webp"
atlas_url = copy(atlas,"impact-v15.webp") if atlas.is_file() else ""
(dst/"data.js").write_text("window.DragonData="+json.dumps(payload,ensure_ascii=False,separators=(",",":"))+";\nwindow.DragonImpactAtlas="+json.dumps(atlas_url)+";",encoding="utf-8")
modules = ("spirit.js","spirit-study.js","kame.js","arena-stage.js","kame-arena.js","kame-volume.js",
           "kame-study-effects.js","kame-source-meshes.js","kame-study.js","player.js","spirit-volume.js",
           "spirit-ejecta.js","spirit-impact-3d.js")
for name in modules:
    copy(here/name,name)

# A new catalog URL alone does not invalidate its iframe or the shaders.
# Use the contents of the actual generated files, including data.js.
preview = (here/"preview.html").read_text(encoding="utf-8")
for name in ("data.js",*modules):
    stamp = hashlib.sha256((dst/name).read_bytes()).hexdigest()[:12]
    preview = preview.replace(f'src="dragon-vfx/{name}"', f'src="dragon-vfx/{name}?rev={stamp}"')
(out/"dragon-vfx.html").write_text(preview,encoding="utf-8")
release = hashlib.sha256(preview.encode("utf-8")).hexdigest()[:12]
catalog = (work/"vfx-preview.html").read_text(encoding="utf-8")
(out/"index.html").write_text(catalog.replace("__DRAGON_PREVIEW_BUILD__",release),encoding="utf-8")
