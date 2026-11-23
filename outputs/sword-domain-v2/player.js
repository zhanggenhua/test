(() => {
  'use strict';
  const $=id=>document.getElementById(id), art={}, library=window.swordData;
  const refs={...library.refs,...window.fateReferences};
  const args=new URLSearchParams(location.search), fps=30, caster=320, floor=314;
  const modes={
    current:{title:'万剑归宗',role:'战士技能 033 · 状态生效后，每回合追加一柄快剑。',demo:[[.12,'on'],[2.0,'single'],[4.1,'single']],end:6.4,refs:['baseline','orbit','recall','user-orbit']},
    swarm:{title:'万剑归宗',role:'网页扩展试演 · 平射、落剑与召回',demo:[[.12,'on'],[1.65,'single'],[2.55,'volley'],[4.36,'drop'],[6.24,'recall']],end:8.65,refs:['recall','rain','return','user-orbit','orbit']},
    fate:{title:'无限剑制',role:'Fate · 固有结界与干将、莫邪双刀｜网页扩展试演',demo:[[.15,'open'],[2.12,'project'],[3.75,'melee'],[5.75,'volley']],end:9.1,refs:Object.keys(window.fateReferences)},
    rain:{title:'万剑诀',role:'独立剑雨试片 · 银剑错峰落下，在各自落点激起火星。',demo:[],end:5.05,refs:['rain','user-rain']}
  };
  const labels={single:'单剑平射',volley:'向前齐射',drop:'自上落剑',recall:'召回地上留剑',on:'入阵',off:'撤阵',open:'展开结界',close:'解除结界',project:'投影兵装',melee:'双刀近战'};
  let mode='current', log=[], segments=[], t=0, ref='none', playing=false, last=null, frame=0, limit=8, movieTicket=null, movieUrl='';
  const options=()=>({casterX:caster,targetX:+$('distance').value,hit:!$('miss').checked,mirror:$('mirror').checked});
  const isSwarm=()=>mode==='current'||mode==='swarm';
  const eventAt=(key,at)=>({key,at});
  function rebuild(){
    segments=[];if(!isSwarm())return;
    let seg=null;
    for(const e of log){
      if(e.key==='on'){
        if(seg)continue;
        const conf={...options(),renewSingle:mode==='current'}, sim=SwordSwarm.create(conf);
        sim.reset(conf,e.at);seg={sim,start:e.at,end:Infinity};segments.push(seg);
      }else if(e.key==='off'){if(seg)seg.end=e.at;seg=null;}
      else if(seg)seg.sim.command(e.key,e.at,options());
    }
  }
  const activeSegment=time=>segments.findLast(s=>s.start<=time&&time<s.end);
  const clamp=n=>Math.max(0,Math.min(1,n));
  const fateLength=fateField.duration;
  function fieldAt(time){
    const opts=options();
    let at=0,from=0,goal=0,action=null,start=-100,casterX=caster;
    const boundaryAt=x=>from+Math.sign(goal-from)*Math.min(Math.abs(goal-from),Math.max(0,x-at)/1.65);
    function takePosition(tick){
      if(action!=='melee')return;
      const state={...opts,casterX,age:tick-start,action};
      casterX=state.age>=fateLength.melee?fateField.meleeEndX(state):casterX+fateField.actorOffset(state);
    }
    for(const e of log){
      if(e.at>time)break;
      takePosition(e.at);
      if(e.key==='open'||e.key==='close'){
        from=boundaryAt(e.at);goal=e.key==='open'?1:0;at=e.at;action=null;
      }else{action=e.key;start=e.at;}
    }
    const age=time-start;
    if(action&&age>=fateLength[action]){takePosition(time);action=null;}
    return {...opts,casterX,time,boundary:clamp(boundaryAt(time)),goal,action,age};
  }
  function capable(key){
    if(mode==='fate'){
      const s=fieldAt(t);return key==='open'?s.goal===0:key==='close'?s.goal===1:Object.hasOwn(fateLength,key)&&s.boundary>=.999&&!s.action&&s.goal===1;
    }
    const seg=activeSegment(t);if(key==='on')return !seg;if(!seg)return false;
    const s=seg.sim.status(t);
    return key==='off'||(key==='single'&&s.canSingle)||(key==='volley'&&s.canVolley)||(key==='drop'&&s.canDrop)||(key==='recall'&&s.canRecall);
  }
  function issue(key){
    if(!capable(key))return false;
    // Taking control forks only this preview's future demo cues.
    log=log.filter(e=>e.at<=t+1e-8);log.push(eventAt(key,t));rebuild();
    limit=Math.max(limit,t+3.25);draw(t);play();return true;
  }
  function actor(c,x,face,role,frameIndex,hurt,flash=false){
    c.save();c.translate(x,floor);c.fillStyle='#17272d52';c.beginPath();c.ellipse(0,1,26,4,0,0,Math.PI*2);c.fill();
    if(role==='target'){c.scale(face*.185,.185);c.drawImage(art[flash?'stick-target-hurt-flash':hurt?'stick-target-hurt':'stick-target-idle'],-365,-719);}
    else{const i=Math.max(0,Math.min(56,frameIndex));c.scale(face*.41,.41);c.drawImage(role==='baseline'?art.ember:art.whiteSword,(i%8)*436,Math.floor(i/8)*384,436,384,-82,-351,436,384);}
    c.restore();
  }
  function scene(time,base=false){
    const c=(base?$('stock'):$('arena')).getContext('2d'),o=options();
    const flip=x=>o.mirror?960-x:x;
    c.clearRect(0,0,960,400);c.drawImage(art.stage,0,0,960,400);
    const seg=isSwarm()?activeSegment(time):null,s=mode==='fate'?fieldAt(time):null;
    let cell=0,hurt=false,flash=false;
    const rainTime=Math.min(time,5.05);
    const fatePass=pass=>fateField.paint(c,{...s,pass});
    const rainPass=pass=>swordVfx.paint(c,rainTime,{...o,move:'myriad',pass});
    const swarmPass=pass=>seg?.sim.paint(c,time,{...o,pass});
    if(seg){
      cell=Math.min(15,Math.floor((time-seg.start)*24));
      hurt=seg.sim.events(time-.22,time).some(e=>e.type==='hit');
      if(!base){swarmPass('ground');swarmPass('back');}
    }else if(s){
      fatePass('background');fatePass('back');
      const hits=fateField.events[s.action]?.contacts??[];
      hurt=o.hit&&hits.some(x=>s.age>=x&&s.age<x+.19);
    }else if(mode==='rain'){
      if(time>2.44&&time<4.83){
        const shade=Math.min(1,(time-2.44)/.58)*Math.min(1,(4.83-time)/.51);
        c.save();c.translate(flip(o.targetX+(o.hit?0:155)),305);c.scale(1,.43);
        const g=c.createRadialGradient(0,0,12,0,0,306);
        g.addColorStop(0,'rgba(28,45,68,'+.36*shade+')');g.addColorStop(.63,'rgba(36,50,66,'+.23*shade+')');g.addColorStop(1,'transparent');
        c.fillStyle=g;c.fillRect(-306,-306,612,612);c.restore();
      }
      rainPass('ground');rainPass('back');
      cell=time<1.94?Math.min(15,Math.floor(time*24)):Math.min(56,16+Math.floor((time-1.94)*24));
      const impact=[3.29,3.59,3.92].findLast(x=>time>=x&&time<x+.35);
      hurt=o.hit&&impact!==undefined;flash=hurt&&time-impact<.057;
    }
    if(s)fateField.drawCaster(c,s,art.ember);
    else actor(c,flip(caster),o.mirror?-1:1,base?'baseline':'caster',cell,false);
    actor(c,flip(o.targetX),o.mirror?1:-1,'target',0,hurt&&!base,flash);
    if(base&&seg){
      c.save();if(o.mirror){c.translate(960,0);c.scale(-1,1);}
      const age=time-seg.start;
      if(age>=0&&age<.56){
        const [x,y,w,h]=library.charge[library.chargeStops.findIndex(v=>age/.56<v)];
        const scale=90/Math.max(w,h);c.drawImage(art.charge,x,y,w,h,caster+13-44*scale,floor-14-80*scale,scale*w,scale*h);
      }
      const recent=log.findLast(e=>e.key==='single'&&e.at>=seg.start&&e.at<=time);
      if(recent&&time-recent.at<.28){
        const x=caster+(o.targetX-caster)*(time-recent.at)/.28,im=art.blade,r=52/im.width;
        c.drawImage(im,x-26,floor-65-im.height*r/2,52,im.height*r);
      }c.restore();
    }else if(!base){if(seg)swarmPass('front');if(s)fatePass('front');if(mode==='rain')rainPass('front');}
  }
  function statusText(){
    if(isSwarm()){
      const seg=activeSegment(t);if(!seg)return ['未入阵','可点击「入阵」开始。'];
      const s=seg.sim.status(t),turn=1+log.filter(e=>e.key==='single'&&e.at>=seg.start&&e.at<=t).length;
      if(mode==='current')return [s.forming?'入阵':s.flight?'本回合飞剑出列':'剑阵持续','第 '+turn+' 个演示回合 · '+(turn===1?'本回合建立状态':'每回合追加一剑')];
      return [s.returning&&s.flight?'召回与出剑':s.returning?'飞剑回卷':s.forward&&s.dropping?'平射与落剑':s.dropping?'落剑下击':s.forward?'向前平射':s.ground?'插地待召':'剑阵环绕',
        '阵中 '+s.orbit+'　平射 '+s.forward+'　落剑 '+s.dropping+'　插地 '+s.ground+'　召回中 '+s.returning];
    }
    if(mode==='rain')return [t<1.94?'绕身':t<3.06?'汇流':'剑雨落地','剑雨采用 99金馆长「万剑诀」的落剑与触地参考。'];
    const s=fieldAt(t);
    return [s.action?labels[s.action]:s.boundary===1?'固有结界维持':s.boundary>0?(s.goal?'展开中':'还原擂台'):'武道会擂台',
      '影视造型采用 Archer 的剑之荒野。动作按钮用于比较网页演出。'];
  }
  function refOffset(){
    if(ref==='orbit'){
      const fire=log.find(e=>e.key==='single');return (fire?.at??2)-.767;
    }
    if(ref==='recall')return 1.45-(7.5-refs.recall.start);
    if(ref==='return')return (log.find(e=>e.key==='recall')?.at??6.24)-(16.433-refs.return.start);
    if(ref==='rain')return (mode==='swarm'?(log.find(e=>e.key==='drop')?.at??4.36)+.9:3.06)-refs.rain.alignTime;
    if(refs[ref]?.action==='melee'){
      const action=log.findLast(e=>e.key==='melee'&&e.at<=t)||log.find(e=>e.key==='melee');
      return (refs[ref].offset??0)+(action?.at??3.75)-3.75;
    }
    const r=refs[ref];return r?.offset??0;
  }
  function updateMovie(){
    const r=refs[ref];if(r?.kind!=='film')return;
    const v=$('refMovie'),p=t-refOffset(),end=r.frameTimes?.at(-1)??(r.duration-1/(r.fps||30)),at=Math.max(0,Math.min(end,p));
    $('sourceClock').textContent=(r.start+at).toFixed(3)+' s'+(p<0||p>end?' · 停帧':'');
    if(v.readyState<1)return;
    if(!playing||p<0||p>end){v.pause();if(Math.abs(v.currentTime-at)>.008)v.currentTime=at;}
    else{if(Math.abs(v.currentTime-at)>.10)v.currentTime=at;v.playbackRate=parseFloat($('speed').value);if(v.paused)v.play().catch(()=>{});}
  }
  function startTime(){return refs[ref]?.kind==='film'?Math.min(0,refOffset()):0;}
  function draw(at){
    t=Math.max(startTime(),at);scene(Math.max(0,t));
    if(ref==='baseline')scene(Math.max(0,t),true);updateMovie();
    const [phase,info]=statusText();
    if($('phase').textContent!==phase)$('phase').textContent=phase;
    if($('state').textContent!==info)$('state').textContent=info;
    $('clock').textContent=Math.max(0,t).toFixed(2)+' s';
    if(t>limit)limit=Math.ceil(t+4);
    $('seek').min=Math.floor(startTime()*fps);$('seek').max=Math.ceil(limit*fps);$('seek').value=Math.round(t*fps);
    for(const b of $('actions').children)b.disabled=!capable(b.dataset.action);
  }
  function stop(){playing=false;last=null;cancelAnimationFrame(frame);$('play').textContent='播放';$('refMovie').pause();}
  function tick(now){
    if(!playing)return;
    if(last!==null)draw(t+Math.max(0,now-last)*.001*parseFloat($('speed').value));
    last=now;
    if(mode==='rain'&&t>=Math.max(modes.rain.end,refs[ref]?.kind==='film'?refOffset()+refs[ref].duration:0)){stop();return;}
    frame=requestAnimationFrame(tick);
  }
  function play(){if(playing)return;playing=true;last=null;$('play').textContent='暂停';frame=requestAnimationFrame(tick);}
  function seek(pos){stop();draw(pos);}
  function stepReference(direction){
    const movie=refs[ref];if(movie?.kind!=='film')return;
    const rate=movie.fps||30,offset=refOffset();
    if(movie.frameTimes){
      const local=t-offset,times=movie.frameTimes;
      const stamp=direction>0?times.find(x=>x>local+.0001)??times.at(-1):times.findLast(x=>x<local-.0001)??times[0];
      seek(offset+stamp);return;
    }
    const position=(t-offset)*rate;
    const targetFrame=direction>0?Math.floor(position+.0001)+1:Math.ceil(position-.0001)-1;
    const lastFrame=Math.max(0,Math.ceil(movie.duration*rate-.0001)-1);
    seek(offset+Math.max(0,Math.min(lastFrame,targetFrame))/rate);
  }
  function changeRef(key){
    ref=key;const r=refs[key],isVideo=r?.kind==='film',v=$('refMovie');
    movieTicket?.abort();if(v.hasAttribute('src')){v.pause();v.removeAttribute('src');v.load();}
    if(movieUrl){URL.revokeObjectURL(movieUrl);movieUrl='';}
    $('source').value=key;$('refPane').hidden=key==='none';$('panes').classList.toggle('compare',key!=='none');
    $('refSteps').hidden=!isVideo;
    $('refImg').hidden=!r||isVideo;v.hidden=!isVideo;$('stock').hidden=key!=='baseline';
    $('sourceClock').textContent=r&&!isVideo?'全幅定格':'';
    $('refName').textContent=r?.name??'游戏 033 现效 · 网页复现';$('refNote').textContent=r?.note??(key==='baseline'?'同回合触发，沿用游戏蓄力图集和 0.28 秒单剑飞行。':'');
    $('sourceLink').hidden=!r;
    if(r){$('sourceLink').href=r.url;$('sourceLink').textContent=isVideo?'打开原速节选':'打开全幅原图';}
    if(r&&!isVideo){$('refImg').src=r.url;$('refImg').alt=r.name;}
    if(isVideo){
      v.poster=r.cards?.[0]?.file||'';limit=Math.max(limit,refOffset()+r.duration);
      if(location.protocol==='file:')v.src=r.url;
      else{
        const ticket=new AbortController();movieTicket=ticket;
        fetch(r.url,{signal:ticket.signal}).then(response=>{if(!response.ok)throw Error(response.status);return response.blob();}).then(blob=>{
          if(ticket.signal.aborted)return;movieUrl=URL.createObjectURL(blob);v.src=movieUrl;
        }).catch(e=>{if(!ticket.signal.aborted)$('sourceClock').textContent='原片读取失败 '+e.message;});
      }
    }
    draw(t===0&&mode!=='fate'?startTime():t);
  }
  function gallery(){
    const items=document.createDocumentFragment();
    for(const key of modes[mode].refs){
      const r=refs[key];if(!r)continue;
      const cards=r.cards?.length?r.cards:[{label:r.name,file:r.url}];
      for(const card of cards){
        const f=document.createElement('figure'),a=document.createElement('a'),img=document.createElement('img'),p=document.createElement('p');
        a.href=card.file;a.target='_blank';a.rel='noopener';img.src=card.file;img.loading='lazy';img.alt=card.label;
        p.textContent=card.label+(Number.isFinite(card.time)?' · '+card.time.toFixed(3)+' s':'');a.append(img);f.append(a,p);
        if(r.source){const link=document.createElement('a');link.href=r.source;link.target='_blank';link.rel='noopener';link.textContent='来源';f.append(link);}
        items.append(f);
      }
    }$('gallery').replaceChildren(items);
  }
  function choose(m,wanted='none'){
    stop();mode=m;t=0;const cfg=modes[m];log=cfg.demo.map(([at,key])=>eventAt(key,at));rebuild();limit=cfg.end;
    $('heading').textContent=cfg.title;$('identity').textContent=cfg.role;document.title=cfg.title+' · 飞剑预览';
    $('arenaTitle').textContent=m==='fate'?'固有结界 · 全幅预览':'天下第一武道会 · 全幅预览';
    document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===(isSwarm()?'current':mode))));
    $('editionLabel').hidden=!isSwarm();if(isSwarm())$('edition').value=m;
    $('artSource').hidden=m!=='fate';
    const actions=m==='current'?['single','off','on']:m==='swarm'?['single','volley','drop','recall','off','on']:m==='fate'?['open','project','melee','volley','close']:[];
    $('actions').replaceChildren(...actions.map(k=>{const b=document.createElement('button');b.textContent=m==='current'&&k==='single'?'下一回合 · 一剑':labels[k];b.dataset.action=k;b.onclick=()=>issue(k);return b;}));
    const keys=['none',...cfg.refs.filter(k=>k==='baseline'||refs[k])];
    $('source').replaceChildren(...keys.map(k=>new Option(refs[k]?.name??(k==='none'?'仅看完整擂台':'技能 033 · 游戏现效'),k)));
    gallery();changeRef(keys.includes(wanted)?wanted:'none');
  }
  const ready=Promise.all(Object.entries(library.art).filter(([key])=>['stage','blade','charge','ember','stick-target-idle','stick-target-hurt','stick-target-hurt-flash'].includes(key)).concat(Object.entries(window.fateFieldAssets),[['whiteSword',window.whiteSwordAtlas]]).map(([key,url])=>new Promise((resolve,reject)=>{
    const im=new Image();im.onload=()=>{art[key]=im;resolve();};im.onerror=()=>reject(Error(key));im.src=url;
  }))).then(()=>{
    fateField.setArt(art.world,art.weapons);
    const wanted=args.get('move'),reference=args.get('ref')||'none';
    const aliases={wanjian:'current',current:'current',swarm:'swarm',recall:'swarm',myriad:'rain',rain:'rain',unlimited:'current',fate:'fate'};
    choose(aliases[wanted]||'current',reference);
    if(mode==='fate'&&args.get('focus')==='melee'){
      const prep=modes.fate.demo.find(([,key])=>key==='melee')[0]-.16;
      draw(refs[ref]?.action==='melee'?Math.min(prep,refOffset()):prep);
    }
    $('play').onclick=()=>{if(playing)stop();else{if(mode==='rain'&&t>=limit)draw(startTime());play();}};
    $('restart').onclick=()=>{choose(mode,ref);play();};$('speed').onchange=()=>draw(t);
    $('prev').onclick=()=>seek((Math.ceil(t*fps-.001)-1)/fps);$('next').onclick=()=>seek((Math.floor(t*fps+.001)+1)/fps);
    $('refPrev').onclick=()=>stepReference(-1);$('refNext').onclick=()=>stepReference(1);
    $('seek').oninput=()=>seek(+$('seek').value/fps);
    for(const id of ['mirror','miss','distance'])$(id).onchange=()=>{rebuild();draw(t);};
    $('source').onchange=()=>changeRef($('source').value);$('refMovie').onloadedmetadata=updateMovie;
    $('edition').onchange=()=>{choose($('edition').value);play();};
    document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{choose(b.dataset.tab);play();});
    document.body.dataset.ready='true';if(!matchMedia('(prefers-reduced-motion: reduce)').matches)play();
  });
  window.swordPreviewV2={ready,choose,seek,stop,play,issue,status:()=>({mode,t,playing,phase:statusText()[0],swarm:activeSegment(t)?.sim.status(t),field:mode==='fate'?fieldAt(t):null})};
  ready.catch(e=>{$('state').textContent='素材载入失败 '+e.message;});
})();
