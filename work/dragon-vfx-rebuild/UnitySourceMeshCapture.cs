using System;
using System.IO;
using System.Collections.Generic;
using System.IO.Compression;
using System.Linq;
using UnityEngine;
using UnityEngine.Rendering;
#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
#endif

[DefaultExecutionOrder(500)]
public class UnitySourceMeshCapture : MonoBehaviour
{
    [Serializable] public struct TextureMap { public string file; public Vector2 scale; public Vector2 offset; public int wrap; }
    [Serializable] public class Layer
    {
        public string name, shader;
        public TextureMap main, mask, noise;
        public float emission, cutoff, depth, depthPower, center, opacity, sortBias, fresnel, fresnelEmission;
        public bool custom, rim;
        public Color tint, front, back, rimColor;
        public Vector4 speed;
        public int renderMode;
    }
    [Serializable] public class Take { public int sampleRate; public int frames; public int firstBeam; public List<Layer> layers; }

    const int Rate = 60;
    const int Frames = 244;
    static readonly bool SideFacing = Environment.GetCommandLineArgs().Contains("-side-particles");
    static readonly string Folder = SideFacing ? "mesh-capture-side" : "mesh-capture";
    int index;
    int opening = -1;
    Camera source;
    ParticleSystem[] particles;
    ParticleSystemRenderer[] renderers;
    Mesh mesh;
    BinaryWriter writer;
    List<Layer> layers;
    readonly List<Vector4> uv = new List<Vector4>();
#if UNITY_EDITOR
    public static void PlayAuthorScene()
    {
        const string scene = "Assets/Kamehameha/Demo scenes/Demo.unity";
        EditorSceneManager.OpenScene(scene);
        EditorSceneManager.playModeStartScene = AssetDatabase.LoadAssetAtPath<SceneAsset>(scene);
        EditorApplication.EnterPlaymode();
    }
#endif

    static bool Requested()
    {
        return Environment.GetCommandLineArgs().Contains("UnitySourceMeshCapture.PlayAuthorScene");
    }

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
    static void CaptureRate()
    {
        if (Requested()) Time.captureFramerate = Rate;
    }

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Attach()
    {
        if (Requested()) Camera.main.gameObject.AddComponent<UnitySourceMeshCapture>();
    }

    static float Num(Material m, string key, float fallback)
    { return m.HasProperty(key) ? m.GetFloat(key) : fallback; }
    static Color Col(Material m, string key)
    { return m.HasProperty(key) ? m.GetColor(key) : Color.white; }
    static TextureMap Map(Material m, string key)
    {
        var tex = m.HasProperty(key) ? m.GetTexture(key) : null;
#if UNITY_EDITOR
        if (tex != null)
        {
            var asset = AssetDatabase.GetAssetPath(tex);
            if (!string.Equals(Path.GetExtension(asset), ".png", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Expected a PNG particle texture: " + asset);
            File.Copy(asset, Path.Combine(Folder, tex.name + ".png"), true);
        }
#endif
        return new TextureMap {
            file = tex == null ? "" : tex.name + ".png",
            scale = tex == null ? Vector2.one : m.GetTextureScale(key),
            offset = tex == null ? Vector2.zero : m.GetTextureOffset(key),
            wrap = tex == null ? 1 : (int)tex.wrapMode,
        };
    }

    void Awake()
    {
        Directory.CreateDirectory(Folder);
        source = GetComponent<Camera>();
        if (SideFacing)
        {
            // Leave the author's playback camera alone. Only BakeMesh uses this view.
            var side = new GameObject("Side-facing particle bake camera", typeof(Camera));
            source = side.GetComponent<Camera>();
            source.CopyFrom(GetComponent<Camera>());
            source.enabled = false;
            side.transform.SetPositionAndRotation(new Vector3(14, 2.25f, 2.7f),
                Quaternion.LookRotation(Vector3.left, Vector3.up));
        }
        particles = FindObjectsOfType<ParticleSystem>().OrderBy(p => p.name).ToArray();
        renderers = particles.Select(p => p.GetComponent<ParticleSystemRenderer>()).ToArray();
        mesh = new Mesh { indexFormat = IndexFormat.UInt32 };
        layers = renderers.Select(r => {
            Material m = r.sharedMaterial;
            var streams = new List<ParticleSystemVertexStream>();
            r.GetActiveVertexStreams(streams);
            Debug.Log("VFX_EXPORT " + r.name + " " + string.Join(" ",streams));
            return new Layer {
                name=r.name, shader=m.shader.name.Split('/').Last(), renderMode=(int)r.renderMode,
                main=Map(m,"_MainTex"), mask=Map(m,"_Mask"), noise=Map(m,"_Noise"),
                emission=Num(m,"_Emission",1), cutoff=Num(m,"_Cutoff",.5f), depth=Num(m,"_Usedepth",0),
                depthPower=Num(m,"_Depthpower",1), center=Num(m,"_Usecenterglow",0), opacity=Num(m,"_Opacity",1),
                sortBias=r.sortingFudge, custom=m.IsKeywordEnabled("_USECUSTOMDATA_ON"), rim=m.IsKeywordEnabled("_USEFRESNEL_ON"),
                fresnel=Num(m,"_Fresnel",1), fresnelEmission=Num(m,"_FresnelEmission",1),
                tint=Col(m,"_TintColor"), front=Col(m,"_FrontFacesColor"), back=Col(m,"_BackFacesColor"),
                rimColor=Col(m,"_FresnelColor"),
                speed=m.HasProperty("_SpeedMainTexUVNoiseZW")?m.GetVector("_SpeedMainTexUVNoiseZW"):Vector4.zero,
            };
        }).ToList();
        var zip = new GZipStream(File.Create(Path.Combine(Folder,"frames.bin.gz")),CompressionMode.Compress);
        writer = new BinaryWriter(zip);
        writer.Write(Frames);
        writer.Write(renderers.Length);
    }

    void LateUpdate()
    {
        if (writer == null) return;
        writer.Write(Time.time);
        for (int layer=0;layer<renderers.Length;layer++)
        {
            var r=renderers[layer];
            if (particles[layer].particleCount==0) { writer.Write(0);writer.Write(0);continue; }
            mesh.Clear(false);
            r.BakeMesh(mesh,source,true);
            var positions=mesh.vertices;
            var normals=mesh.normals;
            var colors=mesh.colors32;
            uv.Clear();mesh.GetUVs(0,uv);
            var faces=mesh.triangles;
            writer.Write(positions.Length);
            writer.Write(faces.Length);
            Vector3 shift=r.transform.position;
            for (int j=0;j<positions.Length;j++)
            {
                Vector3 p=positions[j]+shift;
                Vector3 n=normals.Length>j?normals[j]:Vector3.forward;
                Vector4 tex=uv.Count>j?uv[j]:new Vector4(0,0,1,0);
                Color32 c=colors.Length>j?colors[j]:new Color32(255,255,255,255);
                writer.Write((p.z-2)*100);writer.Write((1-p.y)*100);writer.Write(-p.x*100);
                writer.Write(n.z);writer.Write(-n.y);writer.Write(-n.x);
                writer.Write(tex.x);writer.Write(tex.y);writer.Write(tex.z);writer.Write(tex.w);
                writer.Write(c.r);writer.Write(c.g);writer.Write(c.b);writer.Write(c.a);
            }
            foreach (int face in faces) writer.Write(face);
            if (opening < 0 && r.name == "KameCore" && positions.Any(v => v.z > .02f))
            {
                opening=index;
                Debug.Log("VFX_EXPORT FIRST " + index + " " + Time.time+" bounds="+mesh.bounds+
                    " loc="+r.transform.position+" uv0="+(uv.Count>0?uv[0]:Vector4.zero)+" color="+(colors.Length>0?colors[0].ToString():"none"));
            }
        }
        if (++index!=Frames) return;
        writer.Dispose();
        writer=null;
        var take = new Take { sampleRate=Rate, frames=Frames, firstBeam=opening, layers=layers };
        File.WriteAllText(Path.Combine(Folder,"material.json"),JsonUtility.ToJson(take,true));
        Debug.Log("VFX_EXPORT complete " + index + " frames");
#if UNITY_EDITOR
        EditorApplication.delayCall+=()=>EditorApplication.Exit(opening>=0?0:1);
#endif
    }
}
