(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const film = el('film'), scrub = el('scrub'), canvas = el('arena'), ctx = canvas.getContext('2d');
  const params = new URLSearchParams(location.search);
  const key = params.get('fx') === 'kame' ? 'kame' : 'spirit';
  const spirit = key === 'spirit';
  const study = !spirit&&params.has('study');
  const spiritStudy = spirit&&params.has('study');
  const spiritArena = spirit&&!spiritStudy&&params.has('arena');
  const animeBurst = spiritArena&&params.has('anime-burst');
  const spiritArenaFile = animeBurst?'spirit-anime-arena':'spirit-arena';
  const unityDemo = study&&params.has('unity-demo');
  const arena = !spirit&&!study&&params.has('arena');
  const unitySource = DragonData.unityDemo;
  const studyView = {camera:'reference',hiddenLayer:params.get('hide-layer')};
  if(study){canvas.width=852;canvas.height=480;}
  if(spiritStudy){canvas.width=DragonSpiritStudy.width;canvas.height=DragonSpiritStudy.height;}
  function mediaSize(id,width,height){
    if(width&&height)el(id).style.setProperty('--ratio',width+'/'+height);
  }
  mediaSize('newMedia',canvas.width,canvas.height);
  const stillImage=el('still');
  const sizeStill=()=>{if(!stillImage.hidden)mediaSize('refMedia',stillImage.naturalWidth,stillImage.naturalHeight);};
  stillImage.addEventListener('load',sizeStill);
  const meshView=el('meshView'),meshContext=meshView.getContext('2d');
  const meshCamera={yaw:0,pitch:0,wire:false};
  const engine = spiritStudy ? window.DragonSpiritStudy : study ? window.DragonBeamStudy : arena ? window.DragonBeamArena : spiritArena ? (animeBurst?window.DragonSpiritAnimeArena:window.DragonSpiritArena) : spirit ? window.DragonSpirit : window.DragonKame;
  const selectedRefs = unityDemo ? DragonData.sources.kameUnity : study ? DragonData.sources.kameStudy : arena ? DragonData.sources.kameArena.slice() : spiritArena ? DragonData.sources.spiritArena : DragonData.sources[key];
  const refs=animeBurst?[DragonData.sources.spiritAnimePhases,...selectedRefs,DragonData.sources.spiritImpactBaseline]:selectedRefs;
  const secondary=animeBurst?DragonData.sources.spiritSecondary:null, secondaryFilm=el('secondaryFilm');
  let secondarySynced=true;
  const actors = {};
  const title = spirit ? '元气弹' : '龟派气功';
  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
  const time = t => t.toFixed(3)+' s';
  const scene = {
    casterX:animeBurst?288:390, targetX:animeBurst?780:680, ground:318,
    stage(c){ c.drawImage(actors.stage,0,0,960,400); },
    palm(pose,x){
      const offset = ({gather:[-1.8,-55.4],charge:[-10.50,-44.94],drive:[52.08,-58.8],fire:[55.86,-63]})[pose] || [-10.5,-44.94];
      return {x:x+offset[0],y:this.ground+offset[1]};
    },
    fighterFrame(role,pose){
      const prefix = role==='target'?'target':spirit?'caster':'normal';
      return actors[prefix+'-'+pose] || actors[prefix+'-idle'];
    },
    fighter(c,role,x,pose,opts={}){
      const frame = this.fighterFrame(role,pose);
      c.save();c.translate(x,opts.y??this.ground);c.globalAlpha*=opts.alpha??1;
      c.fillStyle='rgba(32,34,49,.31)';c.beginPath();c.ellipse(0,1,32,4.7,0,0,Math.PI*2);c.fill();
      c.scale(role==='target'?-1:1,1);c.drawImage(frame,-75.6,-150.78,151.2,151.2);c.restore();
    }
  };
  const assetReady = unityDemo||spiritStudy ? Promise.resolve() : Promise.all(Object.entries(DragonData.actors).map(async ([k,src])=>{
    const img=new Image();img.src=src;await img.decode();actors[k]=img;
  }));
  let current=refs[0],index=0,at=0;
  let clockStart=0,startAt=0,playing=false,rate=1,usable=false,raf=0,rev=0,objectUrl='',controller;
  let loading=Promise.resolve(), mediaReady=false, scrubFrame=0, autoplayPending=false;
  let recording;
  let firstPaint=true;
  const duration = () => unityDemo ? unitySource.duration : engine.duration;
  const offset = () => current.offset;
  const refLength = () => current.end-current.start;
  const aligned = () => current.anchors && el('alignment').value==='phases';
  const inspecting = () => current.id==='mesh-view';
  function phaseClock(source,t){
    const points=source.anchors;
    let i=1;while(i<points.length-1&&t>=points[i][0])i++;
    const [t0,r0]=points[i-1],[t1,r1]=points[i];
    const slope=(r1-r0)/(t1-t0);
    return {local:r0-source.start+(clamp(t,t0,t1)-t0)*slope,slope};
  }
  function referenceClock(){
    return aligned()?phaseClock(current,at):{local:at-offset(),slope:1};
  }
  // The reference may begin before the game take when aligning a later action.
  const from = () => Math.min(0,offset());
  const to = () => aligned()?duration():Math.max(duration(),offset()+refLength());
  const sceneTime = () => clamp(at,0,duration());
  async function loadRecording(source, label){
    const video=document.createElement('video');
    video.playsInline=true;video.muted=true;video.preload='auto';
    video.setAttribute('aria-label',label);
    const decoded=new Promise(resolve=>{
      video.addEventListener('loadeddata',()=>resolve(true),{once:true});
      video.addEventListener('error',()=>resolve(false),{once:true});
    });
    let url=source;
    if(location.protocol!=='file:'){
      try{
        const response=await fetch(url);
        if(!response.ok)return;
        url=URL.createObjectURL(await response.blob());
      }catch{return;}
    }
    video.src=url;
    if(await decoded){
      recording=video;canvas.after(video);canvas.hidden=true;
      mediaSize('newMedia',video.videoWidth,video.videoHeight);
    }
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
    }else engine.draw(ctx,t,scene,(study||spiritStudy)?studyView:undefined);
    const local=referenceClock().local;
    const r=clamp(local,0,refLength()-1/current.fps);
    el('newTime').textContent=time(t)+(at>duration()?' · 末帧':'');
    const span=current.sourceSpans?.findLast(([first])=>first<=r);
    const timestamp=span?span[1]+r-span[0]:current.start+r;
    el('refTime').textContent=time(timestamp)+(local<0?' · 首帧':local>=refLength()?' · 末帧':'');
    if(inspecting()){
      if(DragonBeamVolume.available)engine.draw(meshContext,t,scene,meshCamera);
      el('refTime').textContent=time(t)+' · '+(meshCamera.yaw===0&&meshCamera.pitch===0?'透视侧视':'透视检查机位');
    }else if(!current.film){
      const still=current.cards.filter(card=>at>=card.phase).at(-1)||current.cards[0];
      if(el('still').getAttribute('src')!==still.file)el('still').src=still.file;
      el('refTime').textContent='源帧 · '+time(still.time);
    }
    const elapsed=at-from(), total=to()-from();
    el('clock').textContent=elapsed.toFixed(2)+' / '+total.toFixed(2)+' s';
    scrub.value=at;
    scrub.style.setProperty('--played',100*elapsed/total+'%');
    scrub.setAttribute('aria-valuetext',elapsed.toFixed(2)+' 秒，共 '+total.toFixed(2)+' 秒');
  }
  function syncVideo(video,source,{local,slope},force){
    const length=source.end-source.start;
    const shouldPlay=playing&&slope>0&&local>=0&&local<length;
    const max=Math.max(0,Math.min(length,video.duration)-1/source.fps);
    const want=clamp(local,0,max);
    if(force||Math.abs(video.currentTime-want)>(shouldPlay?.115:.004))video.currentTime=want;
    if(shouldPlay){video.playbackRate=clamp(rate*slope,.0625,16);if(video.paused)video.play().catch(()=>{});}
    else if(!video.paused)video.pause();
  }
  function syncFilm(force=false){
    if(mediaReady&&current.film)syncVideo(film,current,referenceClock(),force);
    if(secondary&&secondarySynced)syncSecondary(force);
  }
  function syncSecondary(force=false){
    const position=phaseClock(secondary,sceneTime());
    el('secondaryTime').textContent=time(secondary.start+position.local);
    if(secondaryFilm.readyState>0)syncVideo(secondaryFilm,secondary,position,force);
  }
  async function loadSecondary(){
    el('secondaryPanel').hidden=false;
    el('secondaryNote').textContent=secondary.note;
    el('secondarySource').href=secondary.source;
    el('secondaryMode').onclick=()=>{
      secondarySynced=!secondarySynced;
      secondaryFilm.controls=!secondarySynced;
      el('secondaryMode').textContent=secondarySynced?'看完整气宗师原速':'恢复阶段同步';
      if(secondarySynced)syncSecondary(true);
      else {
        pause();secondaryFilm.playbackRate=1;
        if(secondaryFilm.readyState>0)secondaryFilm.currentTime=0;
        secondaryFilm.play().catch(()=>{});
      }
    };
    secondaryFilm.onloadedmetadata=()=>{
      mediaSize('secondaryMedia',secondaryFilm.videoWidth,secondaryFilm.videoHeight);
      if(secondarySynced)syncSecondary(true);
    };
    secondaryFilm.ontimeupdate=()=>{
      if(!secondarySynced)el('secondaryTime').textContent=time(secondaryFilm.currentTime);
    };
    try{
      let url=secondary.film;
      if(location.protocol!=='file:'){
        const response=await fetch(url);
        if(!response.ok)throw Error('HTTP '+response.status);
        url=URL.createObjectURL(await response.blob());
      }
      secondaryFilm.onerror=()=>{el('secondaryNote').textContent='气宗师视频解码失败，可打开来源播放。';};
      secondaryFilm.src=url;
    }catch(e){el('secondaryNote').textContent='气宗师视频载入失败。'+e.message;}
  }
  function tick(now){
    if(!playing)return;
    at=Math.min(to(),startAt+(now-clockStart)*.001*rate);
    if(at>=to()){pause();paint();syncFilm(true);return;}
    paint();syncFilm();raf=requestAnimationFrame(tick);
  }
  function pause(){
    autoplayPending=false;
    playing=false;cancelAnimationFrame(raf);film.pause();if(secondarySynced)secondaryFilm.pause();recording?.pause();el('play').textContent='播放';
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
    if(rev===id&&autoplayPending){autoplayPending=false;play();}
  }
  function seek(t){
    cancelAnimationFrame(scrubFrame);scrubFrame=0;
    pause();at=clamp(t,from(),to());paint();syncFilm(true);
  }
  function external(label,href){
    const a=document.createElement('a');a.textContent=label;a.href=href;a.target='_blank';a.rel='noopener';return a;
  }
  function listCards(){
    const gallery=el('gallery');gallery.replaceChildren();
    const cards=secondary&&current===refs[0]
      ?[...current.cards,...secondary.cards.map(card=>({...card,label:'气宗师 · '+card.label}))]
      :current.cards;
    for(const card of cards){
      const a=external('',card.file),img=new Image(),stamp=document.createElement('span');
      img.src=card.file;img.alt=card.label;img.loading='lazy';stamp.className='cardtime';stamp.textContent=time(card.time);
      a.append(img,stamp,document.createTextNode(card.label));gallery.append(a);
    }
    const links=el('links');links.replaceChildren();
    if(current.source)links.append(external('打开视频来源',current.source));
    if(current.full)links.append(external(current.fullLabel??'查看完整原片',current.full));
    if(current.film)links.append(external('单独播放右侧全幅片段',current.film));
    if(unityDemo){
      links.append(external('单独播放 Unity 全幅实录',unitySource.film));
    }else{
      const clip=engine.sourceMaterials
        ?'dragon-vfx/local/kame/'+(arena?'kame-source-arena':'kame-source-materials')+'.mp4'
        :'dragon-vfx/'+(spiritStudy?'spirit-study':spiritArena?spiritArenaFile:study?'kame-study':key)+'.mp4';
      links.append(external('单独播放左侧完整演出',clip));
      links.append(external('查看本版特效源码','dragon-vfx/'+(spiritStudy?'spirit-study':study?'kame-study':arena?'kame-arena':key)+'.js'));
      if(spirit)links.append(external('查看三维命中材质','dragon-vfx/spirit-volume.js'));
      else links.append(external('查看束身与发射环网格源码',engine.sourceMaterials?'dragon-vfx/kame-source-meshes.js':study?'dragon-vfx/kame-study-effects.js':'dragon-vfx/kame-volume.js'));
    }
    if(spiritStudy)links.append(external('体积渲染制作参考','https://www.jd.swardson.com/projects/raymarched-explosion.html'));
    if(!spirit&&index===0){
      links.append(external('作者原发教程', 'https://www.youtube.com/watch?v=TR1xM1HMNQ8'),
        external('作者 Unity 包 · 需解锁','https://www.patreon.com/hovl/posts/kamehameha-vfx-1-25583523'),
        external('作者贴图、模型与 Shader 包 · 需解锁','https://www.patreon.com/hovl/posts/only-textures-25713270'));
    }
    el('galleryTitle').hidden=!cards.length;
    el('galleryTitle').textContent=secondary&&current===refs[0]?'采用的原片与第二参考全幅选帧':'此次采用的原片全幅选帧';
  }
  function controls(){
    el('sources').value=index;
    el('alignmentLabel').hidden=!current.anchors;
    el('back').textContent=aligned()?'新版上一帧':'上一帧';
    el('forth').textContent=aligned()?'新版下一帧':'下一帧';
    el('refTitle').textContent=current.title;
    el('newTitle').textContent=animeBurst?'元气弹 · 动画远投与爆发':spiritArena?'元气弹 · 2D 横版擂台':spiritStudy?'元气弹 · 独立 3D 场景':arena?(engine.sourceMaterials?'原材质 · 2D 横版擂台':'较早横版 · 网页试作'):unityDemo?'作者 Unity 原场景 · 实录':study?(engine.sourceMaterials?'原材质移植 · WebGL 3D':'程序化试作 · WebGL 3D'):spirit?title+' · 完整擂台':'网页候选 · 完整擂台';
    el('newNote').textContent=spirit?'光流汇入球体，双掌推出。命中后内核高速旋开，外壳与碎片向外散开。':'掌心聚气、出束、持续喷射、断流消散。';
    if(spiritArena)el('newNote').textContent=animeBurst
      ?'球贴地压过目标，身后逐段掀起尘道，白闪从尘道末端炸出画框，贴地漩涡卷起尘土后散开。'
      :'冲击半球塌向地面，带电余波在暗浪内回卷，随后分块散开。';
    if(spiritStudy)el('newNote').textContent='触地爆闪推开厚浪和溅射碎片，贴地冲击掠过网格，半球向地面塌为卷动的余波。';
    if(spirit&&!spiritStudy) {
      const base=spiritArena?'?fx=spirit&arena=1'+(animeBurst?'&anime-burst=1':''):'?fx=spirit';
      const shape=external('对照球体配色',base+'&ref=shape&at=2');
      const burst=external('第二参考命中图 · 4.100 秒',base+'&ref=burst&at='+(animeBurst?'4.05':'3.19'));
      if(params.has('embedded')){
        for(const link of [burst,shape]){
          link.removeAttribute('target');
          link.href += '&embedded=1';
          if(params.has('rev'))link.href += '&rev='+encodeURIComponent(params.get('rev'));
        }
      }
      el('newNote').append(' ',burst,' · ',shape);
      if(secondary){
        const jump=document.createElement('a');
        jump.href='#secondaryPanel';jump.textContent='第二参考 · 气宗师视频';
        el('newNote').append(' · ',jump);
      }
    }
    if(study)el('newNote').textContent=engine.sourceMaterials
      ?'由 Unity 采样的粒子网格驱动。网页实时计算原贴图、裁剪、混合和辉光。'
      :'亮束与黑层分别解体，橙光沿束身翻转。冲圈先熄，余丝继续前行。';
    if(arena&&engine.sourceMaterials)el('newNote').textContent='掌心发射，沿水平战斗轴前进。2D 角色和特效共用深度遮挡。';
    if(unityDemo)el('newNote').textContent='Unity 2021.3 实际播放作者 Demo。原相机、Prefab、材质与 Bloom。';
    el('refNote').textContent=current.note;
    scrub.min=from();scrub.max=to();el('phases').replaceChildren();
    const phases=unityDemo?[
      {t:0,name:'准备'},{t:30/30,name:'蓄力'},{t:58/30,name:'首束'},
      {t:59/30,name:'展开'},{t:69/30,name:'冲圈'},{t:110/30,name:'残束'},{t:117/30,name:'退场'},
    ]:engine.phases;
    for(const m of phases){
      const b=document.createElement('button');
      b.textContent=spiritStudy&&m.name==='球沿触敌'?'首次接触':m.name;
      b.onclick=()=>seek(m.t);el('phases').append(b);
    }
    listCards();
  }
  async function choose(i,autoplay=false,position){
    cancelAnimationFrame(scrubFrame);scrubFrame=0;
    pause();const id=++rev;mediaReady=false;autoplayPending=autoplay;
    controller?.abort();controller=new AbortController();
    index=i;current=refs[i];
    const meshAvailable=inspecting()&&DragonBeamVolume.available;
    film.hidden=!current.film;el('still').hidden=!!current.film||inspecting();
    meshView.hidden=!meshAvailable;el('meshControls').hidden=!meshAvailable;
    if(meshAvailable)mediaSize('refMedia',meshView.width,meshView.height);
    else sizeStill();
    at=position===undefined?from():clamp(position,from(),to());controls();paint();el('notice').textContent=inspecting()&&!meshAvailable?'此设备无法启用 WebGL 2，左侧使用 Canvas 回退，右侧三维检查暂不可用。':'';
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
      if(rev!==id)return;
      mediaSize('refMedia',film.videoWidth,film.videoHeight);
      mediaReady=true;syncFilm(true);if(autoplay)await startWhenVisible(id);
    }catch(e){if(rev===id&&e.name!=='AbortError')el('notice').textContent='右侧视频载入失败。'+e.message;}
  }
  const cameraSelect=el('studyCamera');
  el('studyCameraLabel').hidden=!(study||spiritStudy)||unityDemo;
  const orbit=el('spiritOrbit');
  function resetSpiritOrbit(){
    Object.assign(studyView,engine.angles(studyView.camera));
    for(const [property,id] of [['yaw','spiritYaw'],['pitch','spiritPitch']]){
      el(id).value=studyView[property];
      el(id+'Read').textContent=el(id).value+'°';
    }
  }
  if(spiritStudy){
    cameraSelect.replaceChildren(new Option('斜俯视 · 气宗师机位','reference'),
      new Option('透视侧视','side'),new Option('反向透视','reverse'));
    orbit.hidden=false;
    resetSpiritOrbit();
    for(const [property,id] of [['yaw','spiritYaw'],['pitch','spiritPitch']]){
      const control=el(id);
      control.oninput=()=>{
        studyView[property]=control.valueAsNumber;
        el(id+'Read').textContent=control.value+'°';paint();
      };
    }
  }
  cameraSelect.onchange=()=>{
    studyView.camera=cameraSelect.value;
    if(spiritStudy)resetSpiritOrbit();
    paint();
  };
  el('title').textContent=title+' · 原片对照';document.title=el('title').textContent;
  el('tab'+key).setAttribute('aria-current','page');
  el('sources').onchange=()=>{loading=choose(Number(el('sources').value),playing,at);};
  function changeMeshView(){
    meshCamera.yaw=Number(el('meshYaw').value);
    meshCamera.pitch=Number(el('meshPitch').value);
    meshCamera.wire=el('meshWire').checked;
    el('meshYawRead').textContent=meshCamera.yaw+'°';
    el('meshPitchRead').textContent=meshCamera.pitch+'°';
    paint();
  }
  for(const key of ['meshYaw','meshPitch','meshWire'])el(key).oninput=changeMeshView;
  el('meshReset').onclick=()=>{
    el('meshYaw').value=el('meshPitch').value='0';
    el('meshWire').checked=false;
    changeMeshView();
  };
  el('meshAngled').onclick=()=>{
    el('meshYaw').value='55';
    el('meshPitch').value='-13';
    changeMeshView();
  };
  el('alignment').onchange=()=>{const was=playing;pause();controls();seek(clamp(at,from(),to()));if(was)play();};
  el('play').onclick=()=>{if(playing)pause();else play();};
  el('replay').onclick=()=>{seek(from());play();};
  el('speed').onchange=()=>{const was=playing;pause();rate=Number(el('speed').value);if(was)play();};
  scrub.addEventListener('pointerdown',pause);
  scrub.addEventListener('input',()=>{
    pause();
    if(!scrubFrame)scrubFrame=requestAnimationFrame(()=>seek(scrub.valueAsNumber));
  });
  scrub.addEventListener('change',()=>{if(scrubFrame)seek(scrub.valueAsNumber);});
  scrub.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowDown','ArrowUp'].includes(e.key))return;
    e.preventDefault();
    step(e.key==='ArrowLeft'||e.key==='ArrowDown'?-1:1);
  });
  function step(direction){
    const start=aligned()?0:offset(), fps=aligned()?30:current.fps;
    const position=(at-start)*fps;
    const frame=direction>0?Math.floor(position+1e-6)+1:Math.ceil(position-1e-6)-1;
    seek(start+frame/fps);
  }
  el('back').onclick=()=>step(-1);el('forth').onclick=()=>step(1);
  const ready=(async()=>{
    if(unityDemo){
      await loadRecording(unitySource.film,'作者 Unity 原场景 · 全幅录像');
      if(!recording)throw Error('本机 Unity 实录未载入');
    }else{
      await Promise.all([assetReady,engine.ready]);
      if(spirit&&!spiritStudy&&!engine.realtime){
        const file=spiritArena?spiritArenaFile:'spirit';
        await loadRecording('dragon-vfx/'+file+'.mp4','元气弹完整擂台 · 三维渲染录像');
      }
    }
    if(arena&&engine.sourceMaterials){
      const comparison=DragonData.sources.kameArena3d;
      const available=await fetch(comparison.film,{method:'HEAD'}).then(r=>r.ok,()=>false);
      if(available)refs.unshift(comparison);
    }
    refs.forEach((r,i)=>el('sources').add(new Option(r.title,i)));
    usable=true;
    if(secondary)void loadSecondary();
    let first=0;
    if(params.get('ref')==='burst'&&spirit)first=refs.findIndex(r=>r.id==='impact-stills');
    if(['hit','secondary'].includes(params.get('ref'))&&spirit)first=refs.findIndex(r=>r.id==='impact-film');
    if(params.get('ref')==='anime'&&spirit)first=refs.findIndex(r=>r.id==='spirit-original');
    if(params.get('ref')==='shape'&&spirit)first=refs.findIndex(r=>r.title.startsWith('球体造型'));
    if(params.get('ref')==='3d'&&!spirit)first=refs.findIndex(r=>r.id==='mesh-view');
    if(params.get('ref')==='previous')first=refs.findIndex(r=>r.title.startsWith('上一版'));
    const requested=params.has('at')?Number(params.get('at')):NaN;
    loading=choose(Math.max(0,first),!Number.isFinite(requested)&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&params.get('paused')!=='1');
    await loading;
    if(Number.isFinite(requested))seek(requested);
  })().catch(e=>{el('notice').textContent='擂台初始化失败。'+e.message;throw e;});
  window.DragonPreview={ready,seek,play,pause,get at(){return at;},get loading(){return loading;},get duration(){return duration();}};
})();
