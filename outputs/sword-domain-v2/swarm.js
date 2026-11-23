/* Interactive 万剑归宗. World units are stage pixels; +z is towards the viewer.
 * Each sword owns its orbit phase and recorded flights. Seeking only samples those paths. */
(() => {
  'use strict';
  const TAU = Math.PI * 2, GROUND = 314, CASTER = 320, EYE = 490;
  const clamp = v => Math.max(0, Math.min(1, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = x => { const k=clamp(x); return k*k*(3-2*k); };
  const step = (a,b,t) => smooth((t-a)/(b-a));
  const pt = (x,h,z) => ({x,h,z});
  const nrm = v => { const k=Math.hypot(v.x,v.h,v.z)||1; return pt(v.x/k,v.h/k,v.z/k); };
  const sub = (a,b) => pt(a.x-b.x,a.h-b.h,a.z-b.z);
  const add = (a,b,s) => pt(a.x+b.x*s,a.h+b.h*s,a.z+b.z*s);
  const lerp = (a,b,s) => pt(mix(a.x,b.x,s),mix(a.h,b.h,s),mix(a.z,b.z,s));
  function rand(i,k) { const n=Math.sin((i+1)*113.61+(k+31)*71.17)*19837.261; return n-Math.floor(n); }
  function project(p){
    const k=1+p.z*.00062;
    return {x:EYE+(p.x-EYE)*k,y:GROUND-p.h*k+p.z*.265,k};
  }
  function cubic(a,b,c,d,u){
    const v=1-u,aa=v*v*v,bb=3*v*v*u,cc=3*v*u*u,dd=u*u*u;
    return pt(aa*a.x+bb*b.x+cc*c.x+dd*d.x,aa*a.h+bb*b.h+cc*c.h+dd*d.h,aa*a.z+bb*b.z+cc*c.z+dd*d.z);
  }
  function path(ctx,coords,fill,stroke,width){
    ctx.beginPath();ctx.moveTo(coords[0],coords[1]);
    for(let i=2;i<coords.length;i+=2)ctx.lineTo(coords[i],coords[i+1]);
    ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
  }
  function line(ctx,x,y,x2,y2,color,width){
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();
  }
  const silver={edge:'#38414a',shade:'#929ea8',mid:'#e0e6eb',lit:'#ffffff',guard:'#c0c8cf',guardDark:'#414951',grip:'#3c4149',wrap:'#afb7bf'};
  function sword(ctx,p,dir,len,alpha,roll,variant) {
    const a=project(p),g=project(add(p,dir,-len));
    const vx=g.x-a.x,vy=g.y-a.y,blade=Math.hypot(vx,vy);
    if(blade<.3||alpha<.009)return;
    const kind=silver;
    const thick=len*a.k*(variant===1?.064:variant===2?.047:.055)*(.72+.28*Math.abs(Math.cos(roll)));
    const grip=len*a.k*(.197),guard=len*a.k*(variant===2?.138:.156),rim=(Math.min(.90,.44+len*.0075))*a.k;
    ctx.save();ctx.globalAlpha*=clamp(alpha);ctx.translate(a.x,a.y);ctx.rotate(Math.atan2(vy,vx));ctx.lineJoin='round';
    const bevel=.13+.1*Math.sin(roll),t=thick;
    {
      const reach=Math.max(3,t*3.4);
      const aura=ctx.createLinearGradient(0,-reach,0,reach);
      for(const [stop,color] of [[0,'rgba(235,240,246,0)'],[.27,'rgba(225,232,240,.19)'],[.46,'rgba(252,253,255,.72)'],[.54,'rgba(252,253,255,.72)'],[.73,'rgba(225,232,240,.19)'],[1,'rgba(235,240,246,0)']])aura.addColorStop(stop,color);
      path(ctx,[-t*2,0,blade*.16,-reach*.8,blade*.72,-reach,blade*.98,-reach*.6,blade,0,blade*.97,reach*.65,blade*.67,reach,blade*.14,reach*.82],aura);
    }
    const outline=[0,0,blade*.21,-t*.71,blade*.82,-t,blade*.91,-t*1.19,blade,-t*.78,blade,t*.78,blade*.90,t*1.19,blade*.83,t,blade*.20,t*.75];
    path(ctx,outline,kind.mid,kind.edge,rim);
    path(ctx,[0,0,blade*.24,-t*.12,blade*.91,t*bevel,blade,t*.13,blade,t*.79,blade*.90,t*1.1,blade*.8,t*.93,blade*.23,t*.69],kind.shade);
    line(ctx,blade*.16,-t*.28,blade*.83,-t*.82,kind.lit,Math.max(.6,t*.37));
    if(blade>28)line(ctx,blade*.40,0,blade*.89,t*.07,kind.lit,.48);
    {
      const white='#ffffff';
      path(ctx,[.1,0,blade*.23,-t*.49,blade*.85,-t*.53,blade*.96,-t*.18,blade*.82,t*.12,blade*.19,t*.24],white);
      line(ctx,blade*.06,0,blade*.87,-t*.28,white,Math.max(1.14,t*.65));
    }
    const l=blade;
    path(ctx,[l+.4,-guard,l+grip*.37,-guard*.84,l+grip*.34,-guard*.56,l+grip*.23,-guard*.36,l+grip*.22,guard*.36,l+grip*.34,guard*.56,l+grip*.37,guard*.84,l+.4,guard,l-grip*.14,guard*.94,l+.3,guard*.42,l-grip*.15,0,l+.3,-guard*.42,l-grip*.14,-guard*.94],kind.guard,kind.guardDark,rim*.88);
    path(ctx,[l+grip*.13,-t*.72,l+grip*.96,-t*.47,l+grip*.96,t*.47,l+grip*.13,t*.72],kind.grip,kind.guardDark,.65);
    for(let j=0;j<3;j++)line(ctx,l+grip*(.28+j*.19),-t*.56,l+grip*(.37+j*.19),t*.53,kind.wrap,.62);
    path(ctx,[l+grip*.93,0,l+grip*1.12,-t*.94,l+grip*1.31,0,l+grip*1.12,t*.94],kind.guard,kind.guardDark,.65);
    ctx.restore();
  }
  function shadow(ctx,p,dir,len,alpha,fieldMode=false,brightBlade=false){
    const slope=fieldMode?1.0:brightBlade?.31:.22,depth=fieldMode?.65:.17;
    const a=project(pt(p.x-p.h*slope,0,p.z+p.h*depth));
    const tail=add(p,dir,-len*1.24);
    const b=project(pt(tail.x-tail.h*slope,0,tail.z+tail.h*depth));
    const fade=alpha*(fieldMode?.39:brightBlade?.53:.28)*(1-(brightBlade?.36:.68)*clamp(p.h/235));
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,w=fieldMode?len*.044:brightBlade?len*.066:len*.048;
    const nx=-dy/d*w,ny=dx/d*w;
    ctx.save();ctx.globalAlpha*=fade;
    if(brightBlade){
      path(ctx,[a.x-nx*.32,a.y-ny*.32,a.x+dx*.57+nx*1.4,a.y+dy*.57+ny*1.4,b.x+nx*.92,b.y+ny*.92,b.x-nx*.92,b.y-ny*.92,a.x+.57*dx-nx*1.4,a.y+.57*dy-ny*1.4],'rgba(39,44,51,.43)');
    }
    path(ctx,[a.x,a.y,a.x+.69*dx+nx,a.y+.69*dy+ny,b.x+nx*.28,b.y+ny*.28,b.x-nx*.28,b.y-ny*.28,a.x+.69*dx-nx,a.y+.69*dy-ny],'#222831');
    ctx.restore();
  }
  const COUNT = 41;
  const specs = Array.from({length:COUNT}, (_,id)=>({
    id, born:.025+.39*rand(id,111), phase:id*2.399963+.85*rand(id,107),
    radius:53+122*rand(id,108), speed:1.83+.72*rand(id,109), len:26+11*rand(id,110),
    zScale:.77+.22*rand(id,112), lane:rand(id,118)
  }));
  const parkedDir = s => nrm(pt(-.28+s.lane*.53,-1,.29*Math.sin(s.phase)));
  function onWheel(s,t,caster) {
    const angle=s.phase+t*s.speed;
    const pulse=1+.14*Math.sin(angle+.32*s.id)+.085*Math.cos(t*1.22+s.id);
    const radius=s.radius*pulse*mix(.24,1,step(s.born-.04,s.born+.53,t));
    const z=159*Math.tanh(radius*s.zScale*Math.sin(angle)/159);
    const height=65-.28*z+6*Math.sin(angle*2+.28*s.id)+8*Math.cos(angle+.9)+5*Math.sin(s.id*.8);
    return pt(caster-25*Math.sin(t*.94+.3)+radius*Math.cos(angle),height,z);
  }
  function tangent(point,time){return nrm(sub(point(time+.002),point(time-.002)));}
  function segment(p0,p1,p2,p3,t0,t1){return {p0,p1,p2,p3,t0,t1};}
  function sampleSegment(s,t){return cubic(s.p0,s.p1,s.p2,s.p3,clamp((t-s.t0)/(s.t1-s.t0)));}

  // +z and -z cross the actor plane. Split a trailing stroke there so its back
  // half can pass behind the silhouette while its leading end is already in front.
  function paintTrail(ctx,nodes,front,width,opacity) {
    ctx.save();ctx.globalAlpha*=opacity;ctx.lineCap='round';
    for(let i=1;i<nodes.length;i++){
      let a=nodes[i-1],b=nodes[i];
      if((a.z>=0)!==front&&(b.z>=0)!==front)continue;
      if((a.z>=0)!==(b.z>=0)){
        const u=-a.z/(b.z-a.z), cut={x:mix(a.x,b.x,u),y:mix(a.y,b.y,u),z:0,w:mix(a.w,b.w,u)};
        if((a.z>=0)!==front)a=cut;else b=cut;
      }
      const w=(a.w+b.w)*.5,thick=width*(.12+.88*w);
      line(ctx,a.x,a.y,b.x,b.y,'rgba(216,228,240,'+(.05+.13*w)+')',thick*3.5);
      line(ctx,a.x,a.y,b.x,b.y,'rgba(234,241,247,'+(.16+.65*w)+')',thick*1.55);
      line(ctx,a.x,a.y,b.x,b.y,'rgba(255,255,255,'+(.11+.79*w*w)+')',thick*.63);
    }
    ctx.restore();
  }

  // The same first entrance into the target ellipse drives the flash and the actor.
  function firstContact(curve,targetX){
    function inside(t){
      const q=project(sampleSegment(curve,t));
      return ((q.x-targetX)/16)**2+((q.y-(GROUND-64))/32)**2<=1;
    }
    let before=curve.t0;
    for(let j=1;j<=48;j++){
      let after=mix(curve.t0,curve.t1,j/48);
      if(inside(after)){
        for(let i=0;i<14;i++){const m=(before+after)*.5;if(inside(m))after=m;else before=m;}
        return after;
      }
      before=after;
    }
    return null;
  }

  function create(initial={}) {
    let start=0,caster=CASTER,defaultTarget=660,defaultHit=true,renewSingle=false,active=false,lastCommand=-Infinity;
    let histories=[],eventLog=[],frameCache=null;
    function reset(config={},at=0){
      caster=Number.isFinite(config.casterX)?config.casterX:CASTER;
      defaultTarget=Number.isFinite(config.targetX)?config.targetX:660;
      defaultHit=config.hit!==false;renewSingle=config.renewSingle===true;start=at;active=true;lastCommand=at;
      histories=specs.map(()=>[]);eventLog=[];frameCache=null;
    }
    function clear(){active=false;histories=specs.map(()=>[]);eventLog=[];frameCache=null;}
    function wheel(s,t){return onWheel(s,t-start,caster);}
    function wheelDir(s,t){return tangent(q=>wheel(s,q),t);}
    function opAt(s,time){
      const log=histories[s.id];
      for(let j=log.length-1;j>=0;j--)if(log[j].start<=time)return log[j];
      return null;
    }
    function phase(s,time,op=opAt(s,time)){
      if(!active||time<start)return 'inactive';
      if(!op)return time<start+s.born+.31?'forming':'orbit';
      if(op.type==='recall')return time<op.end?'returning':'orbit';
      if(op.type==='shot'&&time>=op.end)return time<op.ready?'forming':'orbit';
      return time<op.end?'flight':'ground';
    }
    function tip(s,time,op=opAt(s,time)){
      if(!op)return wheel(s,time);
      if(op.type==='shot'&&time>=op.end)return wheel(s,time);
      if(op.type==='recall'){
        if(time<op.lift)return op.rest;
        if(time<op.end)return sampleSegment(op.back,time);
        return wheel(s,time);
      }
      if(time<op.loose){
        if(!op.coil)return wheel(s,time);
        const origin=wheel(s,time),u=step(op.start,op.loose,time);
        return lerp(origin,op.coil,u*.83);
      }
      if(time<op.pass)return sampleSegment(op.air,time);
      if(op.type==='shot')return sampleSegment(op.out,time);
      return time<op.end?sampleSegment(op.down,time):op.rest;
    }
    function pose(s,t){
      if(!active||t<start+s.born)return null;
      const op=opAt(s,t),state=phase(s,t,op),p=tip(s,t,op);
      if(op?.type==='shot'&&t>=op.end&&t<op.refill)return null;
      const buried=parkedDir(s);
      let dir,burial=0;
      if(state==='ground'){dir=buried;burial=step(op.end-.05,op.end+.05,t);}
      else if(state==='returning'&&t<=op.lift){dir=buried;burial=1;}
      else{
        // Never sample across the discontinuity between a consumed missile and
        // the new blade that will appear in its vacant orbit slot.
        if(op?.type==='shot'&&t>=op.refill)dir=wheelDir(s,t);
        else if(op?.type==='shot'&&t>op.end-.004)dir=nrm(sub(tip(s,t,op),tip(s,t-.004,op)));
        else dir=tangent(q=>tip(s,q),t);
        if(op?.type==='drop'&&state==='flight'&&t>op.end-.075&&t<op.end){
          dir=nrm(lerp(dir,buried,step(op.end-.075,op.end,t)));
          burial=step(op.end-.05,op.end+.05,t);
        }
        if(state==='returning'){
          const u=step(op.lift,op.lift+.12,t);
          const pitch=mix(-Math.PI/2,Math.atan2(dir.h,dir.x),u);
          dir=nrm(pt(Math.cos(pitch),Math.sin(pitch),dir.z*u));burial=1-u;
        }
      }
      let alpha=step(start+s.born,start+s.born+.14,t);
      if(op?.type==='shot'&&t>=op.refill)alpha*=step(op.refill,op.ready,t);
      return {p,dir,state,len:s.len*(1-.16*burial),alpha};
    }
    function status(t){
      const k={total:active&&t>=start?COUNT:0,forming:0,orbit:0,flight:0,forward:0,dropping:0,ground:0,returning:0,active:active&&t>=start};
      if(k.active)for(const s of specs){
        const op=opAt(s,t),state=phase(s,t,op);k[state]++;
        if(state==='flight')k[op.type==='drop'?'dropping':'forward']++;
      }
      const inTurn=renewSingle&&k.active&&specs.some(s=>{const op=opAt(s,t);return op?.type==='shot'&&t<op.turnReady;});
      k.canSingle=k.orbit>0&&!inTurn;k.canVolley=!renewSingle&&k.orbit>0;k.canDrop=k.canVolley;k.canRecall=!renewSingle&&k.ground>0;
      return k;
    }
    function mark(type,s,time,p,action){const q=project(p);eventLog.push({type,id:s.id,time,x:q.x,y:q.y,action});}
    function launch(s,t,volley,targetX,hit){
      const forward=targetX>=caster?1:-1;
      const lane=s.lane,rank=histories[s.id].length;
      const loose=t+(volley?.24+.21*lane+.11*(s.id%9===0):.055);
      const coil=volley?pt(caster+forward*(14+35*lane),62+16*Math.sin(s.phase),38*Math.cos(s.phase)):null;
      const coilPoint=q=>coil?lerp(wheel(s,q),coil,.83*step(t,loose,q)):wheel(s,q);
      const from=coilPoint(loose),toward=tangent(coilPoint,loose);
      const depth=(rand(s.id,88+rank)-.5)*14;
      const aim=pt(targetX,hit?63+(lane-.5)*22:148+(lane-.5)*22,depth);
      const pass=loose+.13+Math.min(.42,Math.abs(aim.x-from.x)/1100)+.04*lane;
      const aimDir=nrm(sub(aim,from));
      const air=segment(from,add(from,toward,25+19*lane),add(aim,aimDir,-(39+26*lane)),aim,loose,pass);
      const collision=hit?firstContact(air,targetX):null;
      // The level trajectory continues beyond the far edge of the viewport.
      // The rear of the hilt must also leave before the slot can be replenished.
      const exitX=forward>0?1050:-90;
      const beyond=pt(exitX,aim.h+aimDir.h*16,aim.z);
      const outEnd=pass+.09+Math.abs(exitX-aim.x)/970;
      const out=segment(aim,add(aim,aimDir,44),pt(exitX-forward*52,beyond.h,beyond.z),beyond,pass,outEnd);
      const end=collision??outEnd,refill=end+.16+.10*lane,ready=refill+.18;
      const op={type:'shot',start:t,loose,coil,pass,air,out,end,turnReady:collision??pass,refill,ready};
      const action=volley?'volley':'single';
      histories[s.id].push(op);
      if(collision!==null)mark('hit',s,collision,sampleSegment(air,collision),action);
      else mark('exit',s,end,beyond,action);
      mark('refill',s,ready,wheel(s,ready),action);
    }
    function drop(s,t,targetX,hit,index){
      const lane=s.lane,forward=targetX>=caster?1:-1;
      const loose=t+.055+.18*lane;
      const from=wheel(s,loose),tangentDir=wheelDir(s,loose);
      const width=Math.min(285,Math.abs(targetX-caster)*.86);
      const spread=(s.id*.618034+.07*rand(s.id,67))%1;
      let restX,restZ;
      if(hit){
        // One leading sword crosses the torso; surrounding blades cover a fan
        // of actual ground locations and may independently intersect the target.
        restX=index===0?targetX+forward*3:targetX+forward*((spread-.40)*width);
        restZ=index===0?-3:(rand(s.id,115)-.67)*241;
      }else{
        // Use the larger clear side of the stage and keep the lanes away from
        // the opponent, even at the most distant setting of the player.
        const clearSide=targetX<575?1:-1;
        restX=targetX+clearSide*(72+spread*Math.min(183,Math.abs(targetX-caster)*.42));
        restZ=(rand(s.id,115)-.67)*241;
      }
      const rest=pt(Math.max(54,Math.min(912,restX)),0,restZ);
      const apex=pt(rest.x-forward*(3+7*lane),174+65*lane,rest.z-4-6*lane);
      const pass=loose+.34+.18*lane+Math.min(.12,Math.abs(apex.x-from.x)/3300);
      const leave=add(from,tangentDir,36+21*lane);leave.h+=52;
      const air=segment(from,leave,pt(apex.x-forward*9,apex.h+38,apex.z-2),apex,loose,pass);
      const end=pass+.30+.11*lane;
      const down=segment(apex,pt(apex.x+forward*2,apex.h-17,apex.z+1),
                         pt(rest.x-forward,71+11*lane,rest.z-1),rest,pass,end);
      const op={type:'drop',start:t,loose,coil:null,air,pass,end,down,rest};
      histories[s.id].push(op);
      const collision=hit?firstContact(down,targetX):null;
      if(collision!==null)mark('hit',s,collision,sampleSegment(down,collision),'drop');
      mark('land',s,end,rest,'drop');
    }
    function summon(s,t){
      const prev=opAt(s,t),rest=prev.rest;
      const lift=t+.12*s.lane,end=lift+.54+Math.min(.45,Math.abs(rest.x-caster)/1100)+.13*s.lane;
      const finish=wheel(s,end),dir=wheelDir(s,end);
      const b=pt(rest.x+24+26*s.lane,87+42*s.lane,rest.z+43*Math.sin(s.phase));
      // Bezier exit velocity matches the phase and tangent of this specific blade.
      const speed=Math.hypot(...Object.values(sub(wheel(s,end+.01),finish)))*100;
      const handle=Math.min(130,speed*(end-lift)/3);
      const back=segment(rest,b,add(finish,dir,-handle),finish,lift,end);
      histories[s.id].push({type:'recall',start:t,lift,end,rest,back});
      mark('rejoin',s,end,finish,'recall');
    }
    function command(type,t,opts={}){
      const refused=reason=>({ok:false,reason,ids:[]});
      if(!active)return refused('inactive');
      if(!Number.isFinite(t)||t<start||t<lastCommand)return refused('time');
      if(!['single','volley','drop','recall'].includes(type))return refused('command');
      if(renewSingle&&type!=='single')return refused('round-mode');
      if(renewSingle&&!status(t).canSingle)return refused('round-not-ready');
      const want=type==='recall'?'ground':'orbit';
      let choices=specs.filter(s=>phase(s,t)===want);
      if(!choices.length)return refused(want==='ground'?'no-ground':'no-orbit');
      const targetX=Number.isFinite(opts.targetX)?opts.targetX:defaultTarget,hit=opts.hit??defaultHit;
      if(type==='single'){
        // Select a visible sword already pointing generally downrange. Other blades
        // continue on their own absolute phases through the entire launch.
        const facing=targetX>=caster?1:-1;
        const score=s=>{const p=wheel(s,t);return facing*p.x*.008+facing*wheelDir(s,t).x+p.z*.002;};
        choices=[choices.reduce((a,b)=>score(a)>=score(b)?a:b)];
      }
      if(type==='drop')choices=choices.slice(0,12);
      choices.forEach((s,i)=>{
        if(type==='recall')summon(s,t);
        else if(type==='drop')drop(s,t,targetX,hit,i);
        else launch(s,t,type==='volley',targetX,hit);
      });
      eventLog.sort((a,b)=>a.time-b.time||a.id-b.id);
      lastCommand=t;frameCache=null;
      return {ok:true,reason:'',ids:choices.map(s=>s.id)};
    }
    function events(fromExclusive=-Infinity,toInclusive=Infinity){
      const after=value=>{
        let first=0,last=eventLog.length;
        while(first<last){
          const mid=(first+last)>>>1;
          if(eventLog[mid].time<=value)first=mid+1;else last=mid;
        }
        return first;
      };
      return eventLog.slice(after(fromExclusive),after(toInclusive)).map(e=>({...e}));
    }
    function frame(t) {
      if(frameCache&&frameCache.time===t)return frameCache;
      const visible=[];
      for(const s of specs){
        const now=pose(s,t);if(!now||now.alpha<=0)continue;
        const op=opAt(s,t);
        const winding=now.state==='orbit'||now.state==='forming'||(op&&t<op.loose);
        const span=winding?.35+.17*s.lane:now.state==='returning'?.20:.11;
        const ribbon=[];
        const resting=now.state==='ground'||(now.state==='returning'&&t<op.lift);
        if(!resting){
          for(let i=0;i<=12;i++){
            const w=i/12,at=t-span*(1-w);
            if(op?.type==='shot'&&t>=op.refill&&at<op.refill)continue;
            const q=pose(s,at);if(!q)continue;
            const heel=add(q.p,q.dir,-q.len*1.07);
            const px=project(heel);ribbon.push({x:px.x,y:px.y,z:heel.z,w});
          }
        }
        visible.push({s,now,ribbon,resting});
      }
      visible.sort((a,b)=>a.now.p.z-b.now.p.z);
      frameCache={time:t,visible,recent:events(t-.29,t)};
      return frameCache;
    }
    function spark(ctx,e,age){
      const hot=e.type==='hit',life=1-step(.028,hot?.22:.25,age);
      if(life<=0||e.type==='rejoin')return;
      ctx.save();ctx.globalAlpha*=life;
      for(let j=0;j<(hot?6:3);j++){
        const a=hot?rand(e.id,41+j)*TAU:-Math.PI*(.19+.65*rand(e.id,42+j));
        const speed=(hot?87:57)*(1+rand(e.id,48+j));
        const tail=Math.max(0,age-.045);
        line(ctx,e.x+Math.cos(a)*tail*speed,e.y+Math.sin(a)*tail*speed,
          e.x+Math.cos(a)*age*speed,e.y+Math.sin(a)*age*speed+age*age*48,
          hot?'#ffffff':'#cbd2d9',hot?1.55:1.10);
      }
      if(age<.073){
        const r=(hot?12:5)*(1-age/.073);
        const light=ctx.createRadialGradient(e.x,e.y,0,e.x,e.y,r);
        light.addColorStop(0,'rgba(255,255,255,.95)');light.addColorStop(.35,'rgba(240,245,250,.85)');light.addColorStop(1,'rgba(216,226,236,0)');
        ctx.fillStyle=light;ctx.fillRect(e.x-r,e.y-r,r*2,r*2);
      }
      ctx.restore();
    }
    function paint(ctx,t,{pass='front',mirror=false}={}){
      if(!ctx||!active||t<start||!Number.isFinite(t))return;
      const current=frame(t);
      ctx.save();if(mirror){ctx.translate(960,0);ctx.scale(-1,1);}
      if(pass==='ground'){
        for(const {now} of current.visible)shadow(ctx,now.p,now.dir,now.len,now.alpha,false,true);
        for(const e of current.recent)if(e.type==='land')spark(ctx,e,t-e.time);
      } else {
        const front=pass==='front';
        for(const {s,now,ribbon,resting} of current.visible){
          if(ribbon.length>1)paintTrail(ctx,ribbon,front,1.55+.54*s.lane,now.alpha);
          if((now.p.z>=0)!==front)continue;
          sword(ctx,now.p,now.dir,now.len,now.alpha,t*3+s.id*.84,s.id%3);
          const tip=project(now.p),heel=project(add(now.p,now.dir,-now.len*.78));
          ctx.save();ctx.globalAlpha*=now.alpha*(resting?.20:.36);
          line(ctx,heel.x,heel.y,tip.x,tip.y,'#ffffff',1.5);ctx.restore();
        }
        if(front)for(const e of current.recent)if(e.type==='hit')spark(ctx,e,t-e.time);
      }
      ctx.restore();
    }
    reset(initial);
    return {reset,clear,command,status,events,paint};
  }
  globalThis.SwordSwarm=Object.freeze({create,count:COUNT});
})();
