const { chromium } = require('playwright-core');
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),{once}=require('node:events');
const output=path.resolve(__dirname,'../../outputs/dragon-vfx');
const base='http://127.0.0.1:8819/dragon-vfx.html?paused=1&fx=';
const takes={
  spirit:{url:'spirit',fps:30,marks:{15:'intake',53:'formed',61:'release',72:'flight',86:'first-contact',88:'contact',92:'pressure',104:'peak',96:'impact',107:'shell',123:'wake'}},
  kame:{url:'kame',fps:30,marks:{19:'gather',71:'prelaunch',72:'launch',73:'extension',83:'beam',124:'tail'}}
};
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath: process.env.VFX_CHROME || undefined, args: process.platform === 'win32' ? ['--use-gl=angle', '--use-angle=d3d11'] : ['--enable-unsafe-swiftshader']});
  try {
    for(const [name,take] of Object.entries(takes)){
      if(process.argv[2] && process.argv[2]!==name)continue;
      const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      await page.goto(base+take.url);await page.evaluate(()=>DragonPreview.ready);
      const length=await page.evaluate(()=>DragonPreview.duration);
      const file=path.join(output,name+'.mp4');
      const ff=spawn('ffmpeg',['-v','error','-y','-f','image2pipe','-framerate',String(take.fps),'-vcodec','png','-i','pipe:0',
        '-an','-c:v','libx264','-crf','15','-preset','fast','-pix_fmt','yuv420p','-movflags','+faststart',file],{stdio:['pipe','ignore','inherit']});
      const complete=once(ff,'close');
      const frames=Math.round(length*take.fps);
      for(let i=0;i<frames;i++){
        const raw=await page.evaluate(t=>{
          DragonPreview.seek(t);return document.getElementById('arena').toDataURL('image/png').split(',')[1];
        },i/take.fps);
        const png=Buffer.from(raw,'base64');
        if(take.marks[i])fs.writeFileSync(path.join(output,name+'-'+take.marks[i]+'.png'),png);
        if(!ff.stdin.write(png))await once(ff.stdin,'drain');
      }
      ff.stdin.end();const [code]=await complete;
      if(code||errors.length)throw Error(name+' '+[code,...errors].join(' '));
      await page.close();console.log(name,frames,'frames');
    }
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
