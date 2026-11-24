const { chromium } = require('playwright-core');
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),{once}=require('node:events');
const output=path.resolve(__dirname,'../../outputs/dragon-vfx');
const base='http://127.0.0.1:8819/dragon-vfx.html?paused=1&fx=';
const takes={
  spirit:{url:'spirit',fps:30,marks:{15:'intake',46:'formed',60:'release',68:'flight',74:'first-contact',75:'contact',80:'pressure',86:'peak',84:'impact',95:'shell',112:'wake'}},
  'spirit-study':{url:'spirit&study=1&ref=hit',fps:30,marks:{36:'charge',60:'release',75:'contact',81:'flash',84:'impact',96:'vortex',123:'collapse'}},
  'spirit-arena':{url:'spirit&arena=1',fps:30,marks:{36:'charge',60:'release',75:'contact',81:'flash',96:'vortex',123:'collapse',151:'wake',159:'breakup',169:'tail'}},
  'spirit-anime-arena':{url:'spirit&arena=1&anime-burst=1',fps:30,marks:{81:'impact',106:'flash',122:'dust',145:'wake',159:'breakup'}},
  kame:{url:'kame',fps:30,marks:{19:'gather',71:'prelaunch',72:'launch',73:'extension',83:'beam',124:'tail'}},
  'kame-study':{url:'kame&study=1&procedural-study=1',fps:30,marks:{53:'gather',72:'launch',73:'extension',83:'beam',95:'sustain',122:'drain',124:'tail'}},
  'kame-source-materials':{url:'kame&study=1',fps:30,local:true,marks:{61:'gather',72:'launch',73:'extension',83:'beam',124:'tail'}},
  'kame-source-arena':{url:'kame&arena=1',fps:30,local:true,arena:true,marks:{61:'gather',72:'launch',73:'extension',83:'beam',124:'tail'}}
};
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath: process.env.VFX_CHROME || undefined, args: process.platform === 'win32' ? ['--use-gl=angle', '--use-angle=d3d11'] : ['--enable-unsafe-swiftshader']});
  try {
    for(const [name,take] of Object.entries(takes)){
      if(process.argv[2] ? process.argv[2]!==name : take.local)continue;
      const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      await page.goto(base+take.url);await page.evaluate(()=>DragonPreview.ready);
      const length=await page.evaluate(()=>DragonPreview.duration);
      if(take.local&&!await page.evaluate(isArena=>isArena?DragonBeamArena.sourceMaterials:DragonBeamStudy.sourceMaterials,!!take.arena))throw Error('缺少 Unity 原材质数据');
      const destination=take.local?path.join(output,'local/kame'):output;
      const file=path.join(destination,name+'.mp4');
      const ff=spawn('ffmpeg',['-v','error','-y','-f','image2pipe','-framerate',String(take.fps),'-vcodec','png','-i','pipe:0',
        '-an','-c:v','libx264','-crf','15','-preset','fast','-pix_fmt','yuv420p','-movflags','+faststart',file],{stdio:['pipe','ignore','inherit']});
      const complete=once(ff,'close');
      const frames=Math.round(length*take.fps);
      for(let i=0;i<frames;i++){
        const raw=await page.evaluate(t=>{
          DragonPreview.seek(t);return document.getElementById('arena').toDataURL('image/png').split(',')[1];
        },i/take.fps);
        const png=Buffer.from(raw,'base64');
        if(take.marks[i])fs.writeFileSync(path.join(destination,name+'-'+take.marks[i]+'.png'),png);
        if(!ff.stdin.write(png))await once(ff.stdin,'drain');
      }
      ff.stdin.end();const [code]=await complete;
      if(code||errors.length)throw Error(name+' '+[code,...errors].join(' '));
      await page.close();console.log(name,frames,'frames');
    }
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
