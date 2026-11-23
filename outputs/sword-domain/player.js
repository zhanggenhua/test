(() => {
  'use strict';
  const data = window.swordData, fx = window.swordVfx;
  const $ = id => document.getElementById(id), art = {}, refs = data.refs;
  const labels = {unlimited:'无限剑制',recall:'万剑归宗',myriad:'万剑诀 · 剑雨'};
  const stops = {
    unlimited:[[0,'起手'],[.91,'布剑'],[1.66,'剑场驻留'],[2.45,'首回合出剑'],[2.64,'第一剑命中'],[3.98,'次回合出剑'],[4.17,'第二剑命中'],[5.23,'撤阵']],
    recall:[[0,'起手'],[1.45,'绕身成阵'],[2.44,'剑阵收束'],[3.13,'第一轮齐射'],[4.10,'剑留地面'],[4.75,'起剑召回'],[5.38,'回卷'],[6.12,'重新聚阵'],[7.14,'再次齐射']],
    myriad:[[0,'起手'],[.72,'显剑'],[1.4,'绕身成阵'],[2.23,'剑群汇流'],[2.94,'敌阵上空'],[3.12,'首批落剑'],[3.59,'剑雨'],[4.27,'末批触地']]
  };
  const names={none:'仅看完整擂台',baseline:'项目现效 · 网页复现'};
  const params=new URLSearchParams(location.search);
  let move=Object.hasOwn(labels,params.get('move'))?params.get('move'):'unlimited';
  let ref='none', time=0, playing=false, last=null, raf=0;
  let filmRequest=null, filmObject='';
  const fps=30, ground=314, caster=320, ctx=$('arena').getContext('2d');
  function pose(role,action,age){
    for(const [name,dt] of data.clips[role][action]){ if(age<dt) return art[name]; age-=dt; }
    return art[data.clips[role].Idle[0][0]];
  }
  function actor(c,x,role,action,age,facing,t,flash){
    c.save();c.translate(x,ground);
    c.fillStyle='#1a283a47';c.beginPath();c.ellipse(0,1,27,4,0,0,Math.PI*2);c.fill();
    if($('cast').value==='stick'){
      if(role==='target'){
        c.scale(facing*.185,.185);
        c.drawImage(art['stick-target-'+(action==='Hurt'?'hurt':'idle')+(flash?'-flash':'')],-365,-719);
      }else{
        const release=move==='unlimited'?.85:move==='myriad'?1.94:2.88;
        const frame=t<release?Math.min(15,Math.floor(t*24)):Math.min(56,16+Math.floor((t-release)*24));
        c.scale(facing*.41,.41);c.drawImage(art.ember,(frame%8)*436,Math.floor(frame/8)*384,436,384,-82,-351,436,384);
      }
    }else {c.scale(facing*.349,.349);c.drawImage(pose(role,action,age),-192,-367);}
    c.restore();
  }
  function scene(c,t,options,base=false){
    const {targetX,mirror,hit}=options;
    c.clearRect(0,0,960,400);c.drawImage(art.stage,0,0,960,400);
    if(move==='myriad'&&!base&&t>2.44&&t<4.83){
      // The descending mass casts a cool shadow on the pale tournament tiles.
      const rise=Math.min(1,(t-2.44)/.58),fade=Math.min(1,(4.83-t)/.51);
      const shade=rise*fade;
      const x=hit?targetX:targetX+155;
      c.save();c.translate(mirror?960-x:x,305);c.scale(1,.43);
      const penumbra=c.createRadialGradient(0,0,12,0,0,306);
      penumbra.addColorStop(0,'rgba(28,45,68,'+(.36*shade)+')');
      penumbra.addColorStop(.63,'rgba(36,50,66,'+(.23*shade)+')');
      penumbra.addColorStop(1,'rgba(36,50,66,0)');
      c.fillStyle=penumbra;c.fillRect(-306,-306,612,612);c.restore();
    }
    if(!base){for(const pass of ['ground','back'])fx.paint(c,t,{...options,move,pass});}
    const flip=x=>mirror?960-x:x;
    let action='Idle',age=0;
    if(t<.61){action='Xu';age=t;}
    if(move==='myriad'&&t>=1.88&&t<2.35){action='Bo';age=t-1.88;}
    const events=move==='unlimited'?fx.events.unlimited.impacts:move==='myriad'?[3.29,3.59,3.92]:(fx.events.recall?.impacts??[3.32,7.28]);
    const struck=hit&&!base?events.findLast(s=>t>=s&&t<s+.35):undefined;
    actor(c,flip(caster),'caster',action,age,mirror?-1:1,t,false);
    actor(c,flip(targetX),'target',struck===undefined?'Idle':'Hurt',struck===undefined?0:t-struck,mirror?1:-1,t,move==='myriad'&&struck!==undefined&&t-struck<.057);
    if(base){
      c.save();if(mirror){c.translate(960,0);c.scale(-1,1);}
      if(t>=0&&t<.56){const [x,y,w,h]=data.charge[data.chargeStops.findIndex(stop=>t/.56<stop)];
        const scale=90/Math.max(w,h);c.drawImage(art.charge,x,y,w,h,caster+13-44*scale,ground-14-80*scale,w*scale,h*scale);}
      for(const end of fx.events.unlimited.impacts){
        const u=(t-end+.28)/.28;
        if(u>=0&&u<1){const im=art.blade,s=52/Math.max(im.width,im.height);c.drawImage(im,caster+(targetX-caster)*u-im.width*s/2,ground-65-im.height*s/2,im.width*s,im.height*s);}
      }c.restore();
    }else fx.paint(c,t,{...options,move,pass:'front'});
  }
  function options(){return {targetX:Number($('distance').value),mirror:$('mirror').checked,hit:!$('miss').checked};}
  function duration(){return fx.duration[move];}
  function stamp(t){return t.toFixed(3)+' s';}
  // Both movies advance at their native rate. Align their characteristic event once.
  function filmOffset(){
    if(ref==='orbit')return move==='unlimited'?2.36-.767:1.94-.767;
    if(ref==='recall')return (move==='myriad'?1.4:1.45)-(7.5-refs.recall.start);
    if(ref==='return')return 4.75-(16.433-refs.return.start);
    return fx.events.myriad.firstContact-(refs[ref].alignTime??Math.min(.75,refs[ref].duration/3));
  }
  function syncFilm(){
    const v=$('film'),r=refs[ref];
    if(!r||r.kind!=='film')return;
    const raw=time-filmOffset(), at=Math.min(Math.max(0,raw),Math.max(0,r.duration-1/r.fps));
    $('refTime').textContent='源片 '+stamp(at+r.start)+(raw<0||raw>=r.duration?' · 停帧':'');
    if(v.readyState<1)return;
    const shouldPlay=playing&&raw>=0&&raw<r.duration-1/r.fps;
    if(!shouldPlay){v.pause();if(Math.abs(v.currentTime-at)>.006)v.currentTime=at;}
    else{
      if(Math.abs(v.currentTime-at)>.09)v.currentTime=at;
      v.playbackRate=Number($('speed').value);
      if(v.paused)v.play().catch(()=>{});
    }
  }
  function draw(t){
    const [begin,end]=bounds();time=Math.max(begin,Math.min(end,t));const o=options();
    const stageTime=Math.max(0,Math.min(duration(),time));
    scene(ctx,stageTime,o);
    if(ref==='baseline')scene($('baseline').getContext('2d'),stageTime,o,true);
    syncFilm();
    $('time').value=Math.round(time*fps);
    $('clock').textContent=stamp(stageTime)+' / '+stamp(duration());
    $('phase').textContent=time<0?'起手前停帧':time>duration()?'收尾停帧':stops[move].findLast(s=>s[0]<=stageTime+.0001)[1];
  }
  function bounds(){const r=refs[ref];if(r?.kind!=='film')return [0,duration()];
    const offset=filmOffset();return [Math.min(0,offset),Math.max(duration(),offset+r.duration)];}
  function stop(){playing=false;last=null;cancelAnimationFrame(raf);$('play').textContent='播放';$('film').pause();}
  function seek(t){stop();draw(t);}
  function tick(now){
    if(!playing)return;
    if(last!==null){const [begin,end]=bounds();draw(begin+(time-begin+(now-last)*.001*Number($('speed').value))%(end-begin));}
    last=now;raf=requestAnimationFrame(tick);
  }
  function play(){if(playing)return;const [begin,end]=bounds();if(time>=end)draw(begin);playing=true;last=null;$('play').textContent='暂停';raf=requestAnimationFrame(tick);}
  function selectRef(key){
    ref=key;$('compare').value=key;const r=refs[key],v=$('film'), isFilm=r?.kind==='film';
    $('referencePanel').hidden=key==='none';$('panels').classList.toggle('split',key!=='none');
    v.pause();v.hidden=!isFilm;
    if(filmRequest){filmRequest.abort();filmRequest=null;}
    if(v.hasAttribute('src')){v.removeAttribute('src');v.load();}
    if(filmObject){URL.revokeObjectURL(filmObject);filmObject='';}
    if(isFilm){
      v.poster=r.cards?.[0]?.file||'';
      if(location.protocol==='file:')v.src=r.url;
      else{
        const request=new AbortController();filmRequest=request;
        // The local overview also runs on static servers without byte-range support.
        // A complete short clip provides a seekable native video on those servers.
        fetch(r.url,{signal:request.signal}).then(response=>{
          if(!response.ok)throw Error('HTTP '+response.status);return response.blob();
        }).then(blob=>{
          if(ref!==key||request.signal.aborted)return;
          filmObject=URL.createObjectURL(blob);v.src=filmObject;
        }).catch(error=>{if(!request.signal.aborted&&ref===key)$('refTime').textContent='原片载入失败 '+error.message;});
      }
    }
    $('still').hidden=!r||isFilm;$('baseline').hidden=key!=='baseline';
    if(r&&!isFilm){$('still').src=r.url;$('still').alt=r.note;}
    $('refName').textContent=r?.name||names[key];$('refTime').textContent=r?.kind==='still'?'全幅定格':'';
    const a=$('refLink');a.hidden=!r;
    if(r){a.href=r.url;a.textContent=isFilm?'打开原速节选':'打开全幅原图';}
    $('note').textContent=key==='baseline'?'按项目现有蓄力图集和飞剑贴图复现。两个回合的命中时刻对齐，原版飞剑每次飞行 0.28 秒。':isFilm?r.note+' 两侧按各自原速，关键事件对齐，源片起止以外停帧。':r?.note||
      (move==='unlimited'?'剑场持续两个演示回合，每回合只拔出一把。':move==='recall'?'飞剑绕身、出阵，落地的剑随召回重新归阵。':'青金剑阵先绕身，脱离后汇向敌方上空，在不同深度错峰落地。');
    const [begin,end]=bounds();$('time').min=Math.floor(begin*fps);$('time').max=Math.ceil(end*fps);
    draw(time===0?begin:time);
  }
  function choose(m,wanted){
    stop();move=m;time=0;$('heading').textContent=labels[m];document.title=labels[m]+' · 飞剑预览';
    document.querySelectorAll('[data-move]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.move===m)));
    $('time').max=Math.ceil(duration()*fps);
    const keys=m==='unlimited'?['none','baseline','field','field-launch','orbit','user-orbit']:m==='recall'?['none','recall','return','user-orbit','orbit']:['none','rain','user-rain','user-orbit','recall'];
    const available=keys.filter(k=>k in names||k in refs);
    $('compare').replaceChildren(...available.map(k=>new Option(refs[k]?.name||names[k],k)));
    $('stops').replaceChildren(...stops[m].map(([s,label])=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>seek(s);return b;}));
    selectRef(available.includes(wanted)?wanted:'none');
  }
  function gallery(){
    const frag=document.createDocumentFragment();
    for(const r of Object.values(refs)){
      const entries=r.cards?r.cards.map(c=>[c.file,r.name+' · '+c.label,stamp(c.time)]):[[r.url,r.name,r.note]];
      for(const [url,label,note] of entries){
        const f=document.createElement('figure'),a=document.createElement('a'),im=document.createElement('img'),caption=document.createElement('p');
        a.href=url;a.target='_blank';a.rel='noopener';im.loading='lazy';im.src=url;im.alt=label;a.append(im);caption.textContent=label+'　'+note;
        f.append(a,caption);
        if(r.source){const l=document.createElement('a');l.href=r.source;l.target='_blank';l.rel='noopener';l.textContent='来源';f.append(l);}
        frag.append(f);
      }
    }$('gallery').replaceChildren(frag);
  }
  const ready=Promise.all(Object.entries(data.art).map(([name,url])=>new Promise((resolve,reject)=>{
    const im=new Image();im.onload=()=>{art[name]=im;resolve();};
    im.onerror=()=>reject(Error('无法载入角色或舞台图像 '+name));im.src=url;
  }))).then(()=>{
    $('play').onclick=()=>playing?stop():play();
    $('next').onclick=()=>seek((Math.floor(time*fps+.001)+1)/fps);
    $('prev').onclick=()=>seek((Math.ceil(time*fps-.001)-1)/fps);
    $('time').oninput=()=>seek(Number($('time').value)/fps);
    for(const id of ['distance','mirror','miss','speed','cast'])$(id).onchange=()=>draw(time);
    $('compare').onchange=()=>selectRef($('compare').value);
    $('film').addEventListener('loadedmetadata',syncFilm);
    document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{
      choose(b.dataset.move);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)play();
    });
    gallery();choose(move,params.get('ref'));if(!matchMedia('(prefers-reduced-motion: reduce)').matches)play();
    document.body.dataset.ready='true';
  }).catch(e=>{$('phase').textContent='资源读取失败';throw e;});
  window.swordPreview={ready,seek,choose,play,stop};
})();
