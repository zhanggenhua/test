// Bake the same impact for browsers without a WebGL2 context.
const {chromium}=require('playwright-core');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
  const browser=await chromium.launch({executablePath: process.env.VFX_CHROME || undefined, args: process.platform === 'win32' ? ['--use-gl=angle', '--use-angle=d3d11'] : ['--enable-unsafe-swiftshader']});
  try{
    const page=await browser.newPage({reducedMotion:'reduce'});
    await page.goto('http://127.0.0.1:8819/dragon-vfx.html?fx=spirit&paused=1&bake-impact=1');await page.evaluate(()=>Promise.all([DragonPreview.ready,DragonImpact.ready]));
    const uri=await page.evaluate(()=>{
      const atlas=document.createElement('canvas'),frames=Math.ceil(DragonImpact.duration*30);
      const {tileWidth,tileHeight}=DragonImpact;
      atlas.width=6*tileWidth;atlas.height=Math.ceil(frames/6)*tileHeight;
      const ctx=atlas.getContext('2d');
      for(let i=0;i<frames;i++){
        const frame=DragonImpact.paint(i/30);
        if(!frame)throw Error('Baking requires the WebGL2 reference renderer');
        ctx.drawImage(frame,(i%6)*tileWidth,Math.floor(i/6)*tileHeight,tileWidth,tileHeight);
      }
      return atlas.toDataURL('image/webp',.94);
    });
    fs.writeFileSync(path.join(__dirname,'spirit-assets/impact-v15.webp'),Buffer.from(uri.split(',')[1],'base64'));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
