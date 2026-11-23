(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const film = el('film'), canvas = el('arena'), ctx = canvas.getContext('2d');
  const params = new URLSearchParams(location.search);
  const key = params.get('fx') === 'kame' ? 'kame' : 'spirit';
  const spirit = key === 'spirit';
  const engine = spirit ? window.DragonSpirit : window.DragonKame;
  const refs = DragonData.sources[key], actors = {};
  const title = spirit ? '元气弹' : '龟派气功';
  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
  const time = t => t.toFixed(3)+' s';
  const scene = {
    casterX:390, targetX:680, ground:318,
    stage(c){ c.drawImage(actors.stage,0,0,960,400); },
    palm(pose,x){
      const offset = ({gather:[-1.8,-55.4],charge:[-10.50,-44.94],drive:[52.08,-58.8],fire:[55.86,-63]})[pose] || [-10.5,-44.94];
      return {x:x+offset[0],y:this.ground+offset[1]};
    },
    fighter(c,role,x,pose,opts={}){
      const prefix = role==='target'?'target':spirit?'caster':'normal';
      const frame = actors[prefix+'-'+pose] || actors[prefix+'-idle'];
      c.save();c.translate(x,opts.y??this.ground);c.globalAlpha*=opts.alpha??1;
      c.fillStyle='rgba(32,34,49,.31)';c.beginPath();c.ellipse(0,1,32,4.7,0,0,Math.PI*2);c.fill();
      c.scale(role==='target'?-1:1,1);c.drawImage(frame,-75.6,-150.78,151.2,151.2);c.restore();
    }
  };
  const assetReady = Promise.all(Object.entries(DragonData.actors).map(async ([k,src])=>{
    const img=new Image();img.src=src;await img.decode();actors[k]=img;
  }));
  let current=refs[0],index=0,at=0;
  let clockStart=0,startAt=0,playing=false,rate=1,usable=false,raf=0,rev=0,objectUrl='',controller;
  let loading=Promise.resolve(), mediaReady=false;
  let recording;
  let firstPaint=true;
  const duration = () => engine.duration;
  const offset = () => current.offset;
  const refLength = () => current.end-current.start;
  const aligned = () => current.anchors && el('alignment').value==='phases';
  function referenceClock(){
    if(!aligned())return {local:at-offset(),slope:1};
    const points=current.anchors;
    let i=1;while(i<points.length-1&&at>=points[i][0])i++;
    const [t0,r0]=points[i-1],[t1,r1]=points[i];
    const slope=(r1-r0)/(t1-t0);
    return {local:r0-current.start+(clamp(at,t0,t1)-t0)*slope,slope};
  }
  // The reference may begin before the game take when aligning a later action.
  const from = () => Math.min(0,offset());
  const to = () => aligned()?duration():Math.max(duration(),offset()+refLength());
  const sceneTime = () => clamp(at,0,duration());
  async function loadRecording(){
    const video=document.createElement('video');
    video.playsInline=true;video.muted=true;video.preload='auto';
    video.setAttribute('aria-label','元气弹完整擂台 · 三维渲染录像');
    const decoded=new Promise(resolve=>{
      video.addEventListener('loadeddata',()=>resolve(true),{once:true});
      video.addEventListener('error',()=>resolve(false),{once:true});
    });
    let url='dragon-vfx/spirit.mp4';
    if(location.protocol!=='file:'){
      try{
        const response=await fetch(url);
        if(!response.ok)return;
        url=URL.createObjectURL(await response.blob());
      }catch{return;}
    }
    video.src=url;
    if(await decoded){recording=video;canvas.after(video);canvas.hidden=true;}
  }
  function paint(){
    if(!usable)return;
    const t=sceneTime();
    if(recording){
      const wanted=Math.min(t,recording.duration-1/30);
      const run=playing&&at>=0&&at<duration()-1/30;
      if(Math.abs(recording.currentTime-wanted)>(run?.11:.003))recording.currentTime=wanted;
      if(run){recording.playbackRate=rate;if(recording.paused)recording.play().catch(()=>{});}
      else if(!recording.paused)recording.pause();
    }else engine.draw(ctx,t,scene);
    const local=referenceClock().local;
    const r=clamp(local,0,refLength()-1/current.fps);
    el('newTime').textContent=time(t)+(at>duration()?' · 末帧':'');
    el('refTime').textContent=time(current.start+Math.max(0,r))+(local<0?' · 首帧':local>=refLength()?' · 末帧':'');
    if(!current.film){
      const still=current.cards.filter(card=>at>=card.phase).at(-1)||current.cards[0];
      if(el('still').getAttribute('src')!==still.file)el('still').src=still.file;
      el('refTime').textContent='源帧 · '+time(still.time);
    }
    el('clock').textContent=time(at-from())+' / '+time(to()-from());
    el('scrub').value=at;
  }
  function syncFilm(force=false){
    if(!mediaReady||!current.film)return;
    const {local,slope}=referenceClock(), shouldPlay=playing&&local>=0&&local<refLength();
    const max=Math.max(0,Math.min(refLength(),film.duration)-1/current.fps);
    const want=clamp(local,0,max);
    if(force||Math.abs(film.currentTime-want)>(shouldPlay?.115:.004))film.currentTime=want;
    if(shouldPlay){film.playbackRate=clamp(rate*slope,.0625,16);if(film.paused)film.play().catch(()=>{});}
    else if(!film.paused)film.pause();
  }
  function tick(now){
    if(!playing)return;
    at=Math.min(to(),startAt+(now-clockStart)*.001*rate);
    if(at>=to()){pause();paint();syncFilm(true);return;}
    paint();syncFilm();raf=requestAnimationFrame(tick);
  }
  function pause(){
    playing=false;cancelAnimationFrame(raf);film.pause();recording?.pause();el('play').textContent='播放';
  }
  function play(){
    if(!usable||!mediaReady)return;
    if(at>=to()-.005)at=from();
    startAt=at;clockStart=performance.now();playing=true;el('play').textContent='暂停';
    cancelAnimationFrame(raf);tick(clockStart);
  }
  async function startWhenVisible(id){
    if(spirit&&firstPaint&&document.visibilityState==='visible'){
      firstPaint=false;
      const visible=[...el('gallery').querySelectorAll('img')].filter(img=>img.getBoundingClientRect().top<innerHeight);
      await Promise.allSettled(visible.map(img=>{img.loading='eager';return img.decode();}));
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    }
    if(rev===id)play();
  }
  function seek(t){
    pause();at=clamp(t,from(),to());paint();syncFilm(true);
  }
  function external(label,href){
    const a=document.createElement('a');a.textContent=label;a.href=href;a.target='_blank';a.rel='noopener';return a;
  }
  function listCards(){
    const gallery=el('gallery');gallery.replaceChildren();
    for(const card of current.cards){
      const a=external('',card.file),img=new Image(),stamp=document.createElement('span');
      img.src=card.file;img.alt=card.label;img.loading='lazy';stamp.className='cardtime';stamp.textContent=time(card.time);
      a.append(img,stamp,document.createTextNode(card.label));gallery.append(a);
    }
    const links=el('links');links.replaceChildren();
    if(current.source)links.append(external('打开视频来源',current.source));
    if(current.full)links.append(external('查看完整原片 · 230 帧',current.full));
    if(current.film)links.append(external('单独播放右侧全幅片段',current.film));
    links.append(external('单独播放左侧完整演出','dragon-vfx/'+key+'.mp4'));
    links.append(external('查看本版特效源码','dragon-vfx/'+key+'.js'));
    if(spirit)links.append(external('查看三维命中材质','dragon-vfx/spirit-volume.js'));
    if(!spirit&&index===0){
      links.append(external('作者教程', 'https://www.youtube.com/watch?v=TR1xM1HMNQ8'),
        external('完整 Unity 包 · 付费','https://www.patreon.com/hovl/posts/kamehameha-vfx-1-25583523'),
        external('贴图、模型与 Shader 包 · 付费','https://www.patreon.com/hovl/posts/only-textures-25713270'));
    }
    el('galleryTitle').hidden=!current.cards.length;
  }
  function controls(){
    el('sources').value=index;
    el('alignmentLabel').hidden=!current.anchors;
    el('back').textContent=aligned()?'新版上一帧':'上一帧';
    el('forth').textContent=aligned()?'新版下一帧':'下一帧';
    el('refTitle').textContent=current.title;
    el('newTitle').textContent=title+' · 完整擂台';
    el('newNote').textContent=spirit?'光流汇入头顶，双掌送球前压。命中时白纹卷向内核，碎石从壳外抛出。':'掌心聚气、出束、持续喷射、断流消散。';
    if(spirit) {
      el('newNote').append(' ',external('对照命中原图 · 4.100 秒','?fx=spirit&ref=burst&at=3.55'),' · ',external('对照球体配色','?fx=spirit&ref=shape&at=2'));
    }
    el('refNote').textContent=current.note;
    el('scrub').min=from();el('scrub').max=to();el('phases').replaceChildren();
    for(const m of engine.phases){const b=document.createElement('button');b.textContent=m.name;b.onclick=()=>seek(m.t);el('phases').append(b);}
    listCards();
  }
  async function choose(i,autoplay=false){
    pause();const id=++rev;mediaReady=false;
    controller?.abort();controller=new AbortController();
    index=i;current=refs[i];
    film.hidden=!current.film;el('still').hidden=!!current.film;
    at=from();controls();paint();el('notice').textContent='';
    if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl='';}
    if(!current.film){film.removeAttribute('src');film.load();mediaReady=true;if(autoplay)await startWhenVisible(id);return;}
    try{
      let url=current.film;
      if(location.protocol!=='file:'){
        const r=await fetch(url,{signal:controller.signal});if(!r.ok)throw Error('HTTP '+r.status);
        const blob=await r.blob();if(rev!==id)return;objectUrl=URL.createObjectURL(blob);url=objectUrl;
      }
      if(rev!==id)return;
      const loaded=new Promise((ok,fail)=>{
        const signal=controller.signal;
        function done(error){
          film.removeEventListener('loadeddata',success);film.removeEventListener('error',failure);signal.removeEventListener('abort',abort);
          if(error)fail(error);else ok();
        }
        const success=()=>done(),failure=()=>done(Error('浏览器未能解码片段')),abort=()=>done(new DOMException('切换片段','AbortError'));
        film.addEventListener('loadeddata',success);film.addEventListener('error',failure);signal.addEventListener('abort',abort,{once:true});
      });
      film.src=url;film.load();await loaded;
      if(rev!==id)return;mediaReady=true;syncFilm(true);if(autoplay)await startWhenVisible(id);
    }catch(e){if(rev===id&&e.name!=='AbortError')el('notice').textContent='右侧视频载入失败。'+e.message;}
  }
  el('title').textContent=title+' · 原片对照';document.title=el('title').textContent;
  el('tab'+key).setAttribute('aria-current','page');
  refs.forEach((r,i)=>el('sources').add(new Option(r.title,i)));
  el('sources').onchange=()=>{loading=choose(Number(el('sources').value),playing);};
  el('alignment').onchange=()=>{const was=playing;pause();controls();seek(clamp(at,from(),to()));if(was)play();};
  el('play').onclick=()=>{if(playing)pause();else play();};
  el('replay').onclick=()=>{seek(from());play();};
  el('speed').onchange=()=>{const was=playing;pause();rate=Number(el('speed').value);if(was)play();};
  el('scrub').oninput=e=>seek(Number(e.target.value));
  function step(direction){
    const frame=Math.round((at-offset())*current.fps)+direction;seek(offset()+frame/current.fps);
  }
  el('back').onclick=()=>step(-1);el('forth').onclick=()=>step(1);
  const ready=(async()=>{
    await Promise.all([assetReady,engine.ready]);
    if(spirit&&!DragonImpact.realtime)await loadRecording();
    usable=true;
    let first=0;
    if(params.get('ref')==='burst'&&spirit)first=refs.findIndex(r=>r.id==='impact-stills');
    if(params.get('ref')==='hit'&&spirit)first=refs.findIndex(r=>r.id==='impact-film');
    if(params.get('ref')==='anime'&&spirit)first=refs.findIndex(r=>r.title.startsWith('动画造型'));
    if(params.get('ref')==='shape'&&spirit)first=refs.findIndex(r=>r.title.startsWith('球体造型'));
    if(params.get('ref')==='previous')first=refs.findIndex(r=>r.title.startsWith('上一版'));
    const requested=params.has('at')?Number(params.get('at')):NaN;
    loading=choose(Math.max(0,first),!Number.isFinite(requested)&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&params.get('paused')!=='1');
    await loading;
    if(Number.isFinite(requested))seek(requested);
  })().catch(e=>{el('notice').textContent='擂台初始化失败。'+e.message;throw e;});
  window.DragonPreview={ready,seek,play,pause,get at(){return at;},get loading(){return loading;},get duration(){return duration();}};
})();
