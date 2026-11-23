/* Sword choreography. Positions are in stage space: x to the right, h upward,
 * z toward the audience. The tracked point of every blade is its striking tip. */
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
  const jade={edge:'#204c3c',shade:'#5aa368',mid:'#b7e787',lit:'#f2ffd2',guard:'#d8d995',guardDark:'#404f3a',grip:'#31473d',wrap:'#c7bd79',tail:[211,253,149]};
  const rain={edge:'#525961',shade:'#a8aeb4',mid:'#e6e8eb',lit:'#ffffff',guard:'#d9dde0',guardDark:'#55595e',grip:'#42454a',wrap:'#c6c9cc',tail:[247,248,250]};
  const iron={edge:'#26343e',shade:'#657a86',mid:'#adbbbf',lit:'#f0eadd',guard:'#c4a274',guardDark:'#453e3b',grip:'#493735',wrap:'#cfb087',tail:[240,209,151]};
  function sword(ctx,p,dir,len,kind,alpha,roll,variant) {
    const a=project(p),g=project(add(p,dir,-len));
    const vx=g.x-a.x,vy=g.y-a.y,blade=Math.hypot(vx,vy);
    if(blade<.3||alpha<.009)return;
    const needle=kind===rain;
    const thick=len*a.k*(needle?.030:variant===1?.064:variant===2?.047:.055)*(.72+.28*Math.abs(Math.cos(roll)));
    const grip=len*a.k*(needle?.126:.197),guard=len*a.k*(needle?.082:variant===2?.138:.156),rim=(needle?.55:Math.min(.90,.44+len*.0075))*a.k;
    ctx.save();ctx.globalAlpha*=clamp(alpha);ctx.translate(a.x,a.y);ctx.rotate(Math.atan2(vy,vx));ctx.lineJoin='round';
    const bevel=.13+.1*Math.sin(roll),t=thick;
    const energized=kind===jade||kind===goldJade;
    if(energized){
      const reach=Math.max(3,t*3.4);
      const aura=ctx.createLinearGradient(0,-reach,0,reach);
      for(const [stop,color] of [[0,'rgba(193,255,100,0)'],[.27,'rgba(204,252,105,.19)'],[.46,'rgba(238,255,158,.72)'],[.54,'rgba(238,255,158,.72)'],[.73,'rgba(204,252,105,.19)'],[1,'rgba(193,255,100,0)']])aura.addColorStop(stop,color);
      path(ctx,[-t*2,0,blade*.16,-reach*.8,blade*.72,-reach,blade*.98,-reach*.6,blade,0,blade*.97,reach*.65,blade*.67,reach,blade*.14,reach*.82],aura);
    }
    const outline=[0,0,blade*.21,-t*.71,blade*.82,-t,blade*.91,-t*1.19,blade,-t*.78,blade,t*.78,blade*.90,t*1.19,blade*.83,t,blade*.20,t*.75];
    path(ctx,outline,kind.mid,kind.edge,rim);
    path(ctx,[0,0,blade*.24,-t*.12,blade*.91,t*bevel,blade,t*.13,blade,t*.79,blade*.90,t*1.1,blade*.8,t*.93,blade*.23,t*.69],kind.shade);
    line(ctx,blade*.16,-t*.28,blade*.83,-t*.82,kind.lit,Math.max(.6,t*.37));
    if(blade>28)line(ctx,blade*.40,0,blade*.89,t*.07,kind.lit,.48);
    if(energized||needle){
      const white=energized?'#ffffeb':'#ffffff';
      path(ctx,[.1,0,blade*.23,-t*.49,blade*.85,-t*.53,blade*.96,-t*.18,blade*.82,t*.12,blade*.19,t*.24],white);
      line(ctx,blade*.06,0,blade*.87,-t*.28,white,energized?Math.max(1.14,t*.65):Math.max(.9,t*.62));
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
      path(ctx,[a.x-nx*.32,a.y-ny*.32,a.x+dx*.57+nx*1.4,a.y+dy*.57+ny*1.4,b.x+nx*.92,b.y+ny*.92,b.x-nx*.92,b.y-ny*.92,a.x+.57*dx-nx*1.4,a.y+.57*dy-ny*1.4],'rgba(37,49,33,.43)');
    }
    path(ctx,[a.x,a.y,a.x+.69*dx+nx,a.y+.69*dy+ny,b.x+nx*.28,b.y+ny*.28,b.x-nx*.28,b.y-ny*.28,a.x+.69*dx-nx,a.y+.69*dy-ny],'#1d3036');
    ctx.restore();
  }
  // A ribbon runs along locations previously crossed by the blade, even through
  // its curved climb. The wide end meets the hilt, leaving the blade readable.
  function trail(ctx,sample,t,span,color,width,alpha,offset,energized=false){
    const points=[],count=10;
    for(let i=0;i<=count;i++) {
      const w=i/count,s=sample(t-span*(1-w));
      if(!s)continue;
      const p=offset ? add(s.p,s.dir,-s.len*offset) : s.p;
      points.push({...project(p),w});
    }
    if(points.length<2)return;
    const left=[],right=[];
    for(let i=0;i<points.length;i++){
      const p=points[i],prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
      const dx=next.x-prev.x,dy=next.y-prev.y,d=Math.hypot(dx,dy)||1;
      const k=width*(.06+.94*p.w)*(.83+.17*Math.sin(p.w*6.1));
      left.push([p.x-dy/d*k,p.y+dx/d*k]);right.push([p.x+dy/d*k,p.y-dx/d*k]);
    }
    ctx.save();ctx.globalAlpha*=alpha;
    for(let i=1;i<points.length;i++){
      const w=(points[i-1].w+points[i].w)/2;
      const fill='rgba('+color+','+(.105+.83*w)+')';
      if(energized){
        for(const [factor,ink] of [[2.55,'rgba(213,255,125,'+(.055+.15*w)+')'],[1.35,'rgba(228,255,163,'+(.10+.32*w)+')']]){
          const a=points[i-1],b=points[i],pa=left[i-1],pb=left[i];
          const ax=(pa[0]-a.x)*factor,ay=(pa[1]-a.y)*factor,bx=(pb[0]-b.x)*factor,by=(pb[1]-b.y)*factor;
          path(ctx,[a.x+ax,a.y+ay,b.x+bx,b.y+by,b.x-bx,b.y-by,a.x-ax,a.y-ay],ink);
        }
      }
      path(ctx,[...left[i-1],...left[i],...right[i],...right[i-1]],fill);
      if(energized){
        const a=points[i-1],b=points[i];
        line(ctx,a.x,a.y,b.x,b.y,'rgba(255,255,217,'+(.07+.85*w*w)+')',.32+width*.68*w);
      }
    }
    ctx.restore();
  }
  function impact(ctx,landing,age,weight,metallic=true) {
    if(age<0||age>.48)return;
    const {p,id}=landing;
    const rays=8+Math.floor(rand(id,47)*7);
    const envelope=1-step(.055,.37,age);
    if(envelope>.01){
      ctx.save();ctx.globalAlpha*=envelope;
      for(let j=0;j<rays;j++){
        const s=rand(id,j+24),theta=(j+rand(id,j+36)*.62)*TAU/rays;
        const hot=j<3;
        const radius=(44+61*s)*(hot?1.3:1),vy=(67+140*rand(id,j+15))*(hot?1.20:1);
        const travel=Math.min(.39,age+.012),lag=Math.max(0,travel-.052-.031*s);
        const source=p2=>project(pt(p.x+Math.cos(theta)*radius*p2,Math.max(0,vy*p2-253*p2*p2),p.z+Math.sin(theta)*radius*p2));
        const a=source(travel),b=source(lag),w=(hot?1.48+.66*s:.70+.68*s)*weight;
        line(ctx,b.x+.42,b.y+.55,a.x+.42,a.y+.55,metallic?'#485d64':'#8e7356',w+1.12);
        if(metallic&&hot)line(ctx,b.x,b.y,a.x,a.y,'rgba(210,254,255,.46)',w+2.1);
        line(ctx,b.x,b.y,a.x,a.y,metallic?'#ffffff':'#fff1c7',w);
        if(hot&&age>.08)line(ctx,mix(a.x,b.x,.22),mix(a.y,b.y,.22),a.x,a.y,'#ffffff',w*1.2);
      }
      if(age<.109){
        const a=project(p),k=(1-age/.109)*weight,r=4+6*k;
        const flash=ctx.createRadialGradient(a.x,a.y,0,a.x,a.y,r);
        flash.addColorStop(0,'rgba(255,255,249,.93)');flash.addColorStop(.29,'rgba(224,251,247,.60)');flash.addColorStop(1,'rgba(199,242,231,0)');
        ctx.fillStyle=flash;ctx.fillRect(a.x-r,a.y-r,2*r,2*r);
        path(ctx,[a.x-7*k,a.y+.4,a.x-1,a.y-1,a.x,a.y-9*k,a.x+1,a.y-1,a.x+6*k,a.y+.4,a.x,a.y+2.1*k],'#fffef0');
      }
      ctx.restore();
    }
  }
  const swarm=Array.from({length:37},(_,i)=>{
    const ring=i%3,slot=Math.floor(i/3),phase=slot*TAU/(ring===0?13:12)+ring*.92+rand(i,1)*.30;
    const launch=1.94+rand(i,2)*.60;
    const land=3.04+rand(i,3)*1.25;
    const range=Math.sqrt((i+.4)/37),az=i*2.399963+rand(i,10)*.57;
    return {i,ring,phase,launch,land,arrival:Math.max(launch+.48,land-.75-rand(i,4)*.14),drop:.56+rand(i,5)*.20,
      born:.09+rand(i,6)*.63,len:26+rand(i,7)*14,dx:Math.cos(az)*range*125,z:Math.sin(az)*range*111};
  });
  function orbit(s,t,caster){
    const life=t-s.born,g=.42+.58*step(-.055,.55,life);
    const r=(72+s.ring*39+rand(s.i,8)*24)*g;
    const theta=s.phase+t*(s.ring===1?-1:1)*(1.78+.10*s.ring+.27*rand(s.i,9));
    const z=Math.sin(theta)*r*.86;
    return pt(caster+Math.cos(theta)*r,60+s.ring*10-.27*z+16*Math.sin(theta*2+.71*s.ring)+5*Math.sin(theta*3+.4*s.i)+(1-g)*22,z);
  }
  function flight(s,t,caster,target){
    if(t<=s.launch)return orbit(s,t,caster);
    const touch=pt(target+s.dx,0,s.z);
    const top=pt(touch.x+(-16+rand(s.i,13)*39),174+rand(s.i,12)*61,touch.z+5+rand(s.i,14)*27);
    const fallStart=Math.max(s.arrival,s.land-s.drop);
    if(t<s.arrival){
      const start=orbit(s,s.launch,caster),tangent=nrm(sub(start,orbit(s,s.launch-.014,caster)));
      const head=add(start,tangent,26+rand(s.i,17)*47);head.h+=26;
      return cubic(start,head,pt(top.x-51,top.h+26,top.z+16),top,clamp((t-s.launch)/(s.arrival-s.launch)));
    }
    if(t<fallStart) {
      const u=clamp((t-s.arrival)/(fallStart-s.arrival)),bell=Math.sin(u*Math.PI);
      return pt(top.x+bell*7,top.h+bell*3,top.z-bell*3);
    }
    if(t<s.land){
      const u=clamp((t-fallStart)/(s.land-fallStart)),drop=.12*u+.88*u*u;
      return lerp(top,touch,drop);
    }
    return touch;
  }
  function swarmBlade(s,t,caster,target){
    const fadeAt=4.32+rand(s.i,52)*.20;
    if(t<s.born||t>fadeAt+.25)return null;
    const p=flight(s,t,caster,target);
    const fallDir=nrm(pt(-( -10+rand(s.i,13)*33),-198-rand(s.i,12)*61,-5-rand(s.i,14)*27));
    let dir;
    if(t>=s.arrival-.12){
      const at=s.arrival-.12;
      const entering=nrm(sub(flight(s,at+.006,caster,target),flight(s,at-.006,caster,target)));
      dir=nrm(lerp(entering,fallDir,step(at,s.arrival+.085,t)));
    }else dir=nrm(sub(flight(s,t+.005,caster,target),flight(s,t-.005,caster,target)));
    let length=s.len*(1+.31*step(s.launch+.20,s.arrival+.08,t));
    if(t>=s.land){
      const a=t-s.land,tilt=step(0,.095,a)*((rand(s.i,16)-.5)*.41)+.11*Math.sin(a*48)*Math.exp(-a*13);
      dir=nrm(pt(dir.x+tilt,dir.h,dir.z));
      length*=1-.24*step(0,.072,a);
    }
    return {p,dir,len:length,alpha:step(s.born,s.born+.155,t)*(1-step(fadeAt,fadeAt+.25,t))};
  }
  // At the high turn a second, finer silver blade peels away from some main
  // blades. Its tip flies its own ballistic path, hits its own tile and sparks.
  const splitBlades=swarm.filter(s=>s.i%5!==0).map(s=>({s,id:80+s.i,
    dx:(rand(s.i,91)-.5)*115,dz:(rand(s.i,92)-.5)*76,
    land:Math.max(3.07,Math.min(4.27,s.land+(rand(s.i,93)-.5)*.28)),len:30+rand(s.i,94)*17}));
  function secondaryBlade(e,t,caster,target){
    const born=e.s.arrival-.090,p0=flight(e.s,born,caster,target);
    const dst=pt(target+e.s.dx+e.dx,0,e.s.z+e.dz);
    const fadeAt=4.29+rand(e.id,17)*.25;
    if(t<born||t>fadeAt+.25)return null;
    const u=clamp((t-born)/(e.land-born)),v=u*u;
    const kc=Math.cos(u*Math.PI)*Math.PI;
    const dir=nrm(pt(2*u*(dst.x-p0.x)+e.dx*.38*kc,2*u*(dst.h-p0.h)+27*kc,2*u*(dst.z-p0.z)));
    const p=lerp(p0,dst,v);
    p.x+=e.dx*.38*Math.sin(u*Math.PI);p.h+=27*Math.sin(u*Math.PI);
    if(t>e.land){dir.x+=((rand(e.id,11)-.5)*.42)*step(0,.09,t-e.land);}
    return {p,dir:nrm(dir),len:e.len*(1-.26*step(e.land,e.land+.07,t)),alpha:step(born,born+.115,t)*(1-step(fadeAt,fadeAt+.25,t))};
  }
  function floorChip(ctx,foot,id,age){
    if(age<0||age>.54)return;
    const puff=step(0,.04,age)*(1-step(.10,.54,age));
    ctx.save();ctx.globalAlpha*=puff;
    const contact=project(foot),flare=1-step(.014,.23,age);
    if(flare>0){
      ctx.save();ctx.translate(contact.x,contact.y);ctx.scale(1,.33);
      const r=9+13*flare,lamp=ctx.createRadialGradient(0,0,0,0,0,r);
      lamp.addColorStop(0,'rgba(253,255,254,'+(.80*flare)+')');lamp.addColorStop(.31,'rgba(214,248,255,'+(.45*flare)+')');lamp.addColorStop(1,'rgba(181,235,250,0)');
      ctx.fillStyle=lamp;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();
    }
    for(let j=0;j<3;j++){
      const angle=rand(id,j+59)*TAU,dist=(8+17*rand(id,j+53))*age;
      const p=project(pt(foot.x+Math.cos(angle)*dist,2+age*(7+rand(id,j+66)*17),foot.z+Math.sin(angle)*dist));
      const radius=(3+rand(id,j+71)*5)*(1+age);
      const dust=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);
      dust.addColorStop(0,'rgba(176,192,195,.48)');dust.addColorStop(.62,'rgba(166,183,183,.18)');dust.addColorStop(1,'rgba(151,172,176,0)');
      ctx.fillStyle=dust;ctx.fillRect(p.x-radius,p.y-radius,2*radius,2*radius);
    }
    ctx.restore();
  }
  function swarmFrame(ctx,t,o) {
    const caster=o.casterX;
    // Keep missed rain in a visible patch of empty tiles beside the target.
    const toRight=o.targetX<780,edge=toRight?913:Math.max(80,caster+117);
    const near=o.targetX+(toRight?61:-61);
    const target=o.hit?o.targetX:(edge+near)/2;
    const spread=o.hit?1:Math.min(1,Math.abs(edge-near)/350);
    const adapt=s=>o.hit?s:{...s,dx:s.dx*spread};
    const sorted=[];
    for(const source of swarm) {
      const s=adapt(source);
      const state=swarmBlade(s,t,caster,target);
      if(state)sorted.push({s,state,z:state.p.z});
      else if(t>=s.land&&t<s.land+.48)sorted.push({s,state:null,z:s.z});
    }
    for(const source of splitBlades){
      const echo=o.hit?source:{...source,s:adapt(source.s),dx:source.dx*spread};
      const state=secondaryBlade(echo,t,caster,target);
      if(state||t>=echo.land&&t<echo.land+.45)sorted.push({echo,state,z:state?state.p.z:echo.s.z+echo.dz});
    }
    sorted.sort((a,b)=>a.z-b.z);
    for(const {s,echo,state,z} of sorted){
      if(o.pass==='ground'){
        if(state)shadow(ctx,state.p,state.dir,state.len,state.alpha,false,s&&t<s.launch+.24);
        if(echo)floorChip(ctx,pt(target+echo.s.dx+echo.dx,0,echo.s.z+echo.dz),echo.id,t-echo.land);
        else floorChip(ctx,pt(target+s.dx,0,s.z),s.i,t-s.land);
        continue;
      }
      if((z>=0)!==(o.pass==='front'))continue;
      if(echo){
        if(state){
          if(t<echo.land)trail(ctx,a=>secondaryBlade(echo,a,caster,target),t,.10,rain.tail.join(','),1.04,state.alpha,1.05);
          sword(ctx,state.p,state.dir,state.len,rain,state.alpha,.4+echo.id*.92,2);
        }
        if(t>=echo.land)impact(ctx,{p:pt(target+echo.s.dx+echo.dx,0,echo.s.z+echo.dz),id:echo.id},t-echo.land,.74,true);
        continue;
      }
      if(state){
        const {p,dir,len,alpha}=state,inOrbit=t<s.launch,fall=t>Math.max(s.arrival,s.land-s.drop);
        const trailLife=(inOrbit?1:.85)*(1-step(s.land-.022,s.land+.025,t))*alpha;
        if(trailLife>.025){
          const dt=inOrbit?.48:fall?.105:t<s.arrival?.16:.088;
          trail(ctx,a=>swarmBlade(s,a,caster,target),t,dt,rain.tail.join(','),inOrbit?1.65:fall?1.65:2.1,trailLife,1.13);
        }
        sword(ctx,p,dir,len,rain,alpha,Math.min(t,s.land)*(inOrbit?2.8:.9)+s.i*.9,s.i%3);
      }
      if(t>=s.land)impact(ctx,{p:pt(target+s.dx,0,s.z),id:s.i},t-s.land,.82,true);
    }
  }
  const field=Array.from({length:30},(_,i)=>{
    // Half the swords populate the distant ridge; the few near hilts frame
    // the fighters rather than forming a picket fence at their feet.
    const lane=i%3,depth=(lane===0?-232:lane===1?-81:62)+(rand(i,1)-.5)*(lane===2?96:80);
    let xx=64+((i*.61803398875)%1)*786+rand(i,11)*21;
    if(lane===2&&Math.abs(xx-320)<38)xx-=56;
    if(lane===2&&Math.abs(xx-660)<38)xx+=53;
    const slant=(rand(i,13)-.48)*.8;
    return {i,tip:pt(xx,0,depth),dir:nrm(pt(slant,-1,.19*(rand(i,14)-.5))),len:(lane===0?18:lane===1?30:48)+rand(i,15)*(lane===0?18:lane===1?22:35),
      land:.44+(xx-98)*.0007+rand(i,16)*.42,clear:4.94+rand(i,19)*.44};
  });
  const launchIds=[7,27], launchTimes=[2.02,3.55], strikeTimes=[2.64,4.17];
  // Each release draws one blade out of its own place in the field.
  function drawnSword(f,t,o) {
    const j=launchIds.indexOf(f.i),time=launchTimes[j],aim=pt(o.targetX,o.hit?65:144,o.hit?0:-14);
    if(j<0||t<time)return null;
    const age=t-time,wind=.29,hitTime=.62;
    const lift=pt(o.casterX+42,85,j?15:-12);
    const along=nrm(sub(aim,lift)),to=add(aim,along,110);
    if(age<wind){
      const s=step(0,wind,age),p=cubic(f.tip,add(f.tip,f.dir,-72),pt(lift.x-24,lift.h+18,lift.z),lift,s);
      const a=Math.atan2(f.dir.h,f.dir.x),end=Math.atan2(along.h,along.x);
      const angle=a+(end-a)*step(.04,wind*.94,age);
      return {p,dir:pt(Math.cos(angle),Math.sin(angle),mix(f.dir.z,along.z,s)),alpha:1,len:f.len};
    }
    const u=clamp((age-wind)/(hitTime-wind));
    const d=u*.22+.78*u*u;
    const p=age<=hitTime?lerp(lift,aim,d):lerp(aim,to,clamp((age-hitTime)/.10));
    if(!o.hit&&age>hitTime){
      const u=clamp((age-hitTime)/.25);
      return {p:add(aim,along,(1025-aim.x)*u/Math.max(.12,along.x)),dir:along,alpha:1-step(.79,.868,age),len:f.len};
    }
    return {p,dir:along,alpha:1-step(hitTime+(o.hit?.013:.17),hitTime+(o.hit?.102:.255),age),len:f.len};
  }
  function fieldBlade(f,t,o){
    const moving=drawnSword(f,t,o);
    if(moving)return moving.alpha>.002?moving:null;
    const elapsed=t-f.land;
    if(elapsed<-.37||t>f.clear+.34)return null;
    const land=clamp(1+elapsed/.36),drop=1-land*land;
    const p=add(f.tip,f.dir,-(74+rand(f.i,35)*35)*drop);
    const settle=elapsed<0?0:Math.sin(elapsed*43)*Math.exp(-elapsed*13)*.068;
    const dir=nrm(pt(f.dir.x+settle,f.dir.h,f.dir.z));
    return {p,dir,len:f.len,alpha:step(-.37,-.18,elapsed)*(1-step(f.clear,f.clear+.34,t))};
  }
  function bladeFlare(ctx,p,age){
    if(age<0||age>.24)return;
    const at=project(p),life=1-age/.24;
    ctx.save();ctx.translate(at.x,at.y);ctx.globalAlpha=life;
    for(let k=0;k<9;k++){
      const a=k*2.400+.14,spd=58+rand(k,42)*116,r=(age+.015)*spd;
      const x=Math.cos(a),y=Math.sin(a);
      line(ctx,x*r*.39,y*r*.39,x*r,y*r, k%2?'#f7ebc8':'#ffe4a6',1.4*life+.60);
    }
    ctx.restore();
  }
  function cog(ctx,x,y,r,spin,lean) {
    ctx.save();ctx.translate(x,y);ctx.scale(lean,1);ctx.rotate(spin);
    const gear=new Path2D(),n=r>77?22:16;
    for(let j=0;j<n;j++){
      for(const [dt,rad] of [[-.49,.91],[-.30,.91],[-.21,1],[.16,1],[.25,.91],[.49,.91]]){
        const a=(j+dt)*TAU/n,px=r*rad*Math.cos(a),py=r*rad*Math.sin(a);
        if(j===0&&dt===-.49)gear.moveTo(px,py);else gear.lineTo(px,py);
      }
    }
    gear.closePath();
    const spokes=r>77?8:6;
    for(let j=0;j<spokes;j++){
      const a=(j+.12)*TAU/spokes,b=(j+.88)*TAU/spokes;
      gear.moveTo(r*.3*Math.cos(a),r*.3*Math.sin(a));
      gear.arc(0,0,r*.82,a,b);
      gear.arc(0,0,r*.30,b,a,true);gear.closePath();
    }
    gear.moveTo(r*.14,0);gear.arc(0,0,r*.14,0,TAU);
    const offset=r*.051;
    ctx.save();ctx.translate(offset*Math.sin(spin)+offset*Math.cos(spin),offset*Math.cos(spin)-offset*Math.sin(spin));ctx.fillStyle='#3b3336';ctx.fill(gear,'evenodd');ctx.restore();
    const patina=ctx.createLinearGradient(-r,-r,r,1.1*r);
    patina.addColorStop(0,'#342e38');patina.addColorStop(.48,'#76513a');patina.addColorStop(.69,'#4f3c3d');patina.addColorStop(1,'#977454');
    ctx.fillStyle=patina;ctx.fill(gear,'evenodd');
    ctx.strokeStyle='#a88559';ctx.lineWidth=r>80?1.24:.91;ctx.stroke(gear);
    ctx.beginPath();ctx.arc(0,0,r*.875,0,TAU);ctx.arc(0,0,r*.235,0,TAU);ctx.lineWidth=.95;ctx.strokeStyle='#75543f';ctx.stroke();
    ctx.restore();
  }
  function fieldAtmosphere(ctx,t){
    const bloom=step(.13,1.25,t)*(1-step(4.92,5.60,t));
    if(bloom<.006)return;
    ctx.save();ctx.globalAlpha*=bloom;
    const light=ctx.createLinearGradient(0,0,0,375);
    for(const [s,c] of [[0,'rgba(100,52,46,.49)'],[.28,'rgba(211,130,57,.46)'],[.48,'rgba(240,175,88,.49)'],[.63,'rgba(129,85,66,.32)'],[1,'rgba(112,67,50,.13)']])light.addColorStop(s,c);
    ctx.fillStyle=light;ctx.fillRect(0,0,960,400);
    ctx.save();
    // The arena's roof and distant banks occlude the machinery at the horizon.
    const sky=new Path2D();sky.moveTo(0,0);sky.lineTo(960,0);sky.lineTo(960,132);sky.lineTo(899,119);
    sky.lineTo(816,128);sky.lineTo(756,133);sky.lineTo(709,127);sky.lineTo(670,107);sky.lineTo(671,93);
    sky.lineTo(594,59);sky.lineTo(507,54);sky.lineTo(495,34);sky.lineTo(483,15);sky.lineTo(478,4);
    sky.lineTo(473,16);sky.lineTo(454,38);sky.lineTo(450,56);sky.lineTo(370,61);sky.lineTo(290,89);
    sky.lineTo(275,111);sky.lineTo(218,133);sky.lineTo(146,125);sky.lineTo(91,122);sky.lineTo(0,138);sky.closePath();
    ctx.clip(sky);ctx.globalAlpha*=.80;
    cog(ctx,59,112,78,-.31+t*.021,.91);
    cog(ctx,202,49,47,.11-t*.032,.71);
    cog(ctx,754,117,59,-.15-t*.036,.79);
    cog(ctx,930,-18,119,.33+t*.018,.96);
    ctx.restore();ctx.restore();
  }
  function fieldFrame(ctx,t,o){
    if(o.pass==='ground')fieldAtmosphere(ctx,t);
    const ordered=[];
    for(const f of field){
      const state=fieldBlade(f,t,o);
      if(state)ordered.push({f,state,z:state.p.z});
    }
    ordered.sort((a,b)=>a.z-b.z);
    for(const {f,state,z} of ordered){
      const {p,dir,len,alpha}=state;
      if(o.pass==='ground'){
        shadow(ctx,p,dir,len,alpha,true);continue;
      }
      if((z>=0)!==(o.pass==='front'))continue;
      const j=launchIds.indexOf(f.i);
      if(j>=0&&t>launchTimes[j]+.275&&t<strikeTimes[j]+.15){
        trail(ctx,a=>drawnSword(f,a,o),t,.12,iron.tail.join(','),3.05,alpha,1.13);
      }else if(t<f.land){
        trail(ctx,a=>fieldBlade(f,a,o),t,.052,'221,227,219',1.06,alpha*.76,1.13);
      }
      sword(ctx,p,dir,len,iron,alpha,f.i*.73+clamp((t-f.land+.36)/.36),f.i%3);
      if(t>=f.land&&t<f.land+.39)impact(ctx,{p:f.tip,id:f.i+49},t-f.land,.87,false);
      const exit=t-f.clear;
      if(exit>0&&exit<.37){
        for(let k=0;k<4;k++){
          const brush=rand(f.i,k+47),age=exit/.37,at=project(pt(f.tip.x+dir.x*(-len*brush)+14*Math.sin(k*2.4+f.i)*age,brush*len+(5+brush*32)*age,f.tip.z));
          ctx.save();ctx.globalAlpha*=(1-age)*.9;line(ctx,at.x,at.y,at.x+1.5,at.y-2.8,'#f9d7a2',1.0);ctx.restore();
        }
      }
    }
    if(o.pass==='front'&&o.hit)for(const when of strikeTimes)bladeFlare(ctx,pt(o.targetX,65,0),t-when);
  }
  const goldJade={edge:'#3b5d39',shade:'#83b763',mid:'#dfefa8',lit:'#ffffd7',guard:'#bfcb81',guardDark:'#3e5042',grip:'#364436',wrap:'#b6b987',tail:[227,250,156]};
  const returning=Array.from({length:41},(_,i)=>{
    const late=i%9===0;
    const release=2.68+rand(i,100)*.27+(late?.18:0);
    const crossing=release+.397+.075*rand(i,101);
    const ground=crossing+.27+.23*rand(i,102);
    const pull=4.55+.42*rand(i,103)+(late?.22:0),rejoin=pull+.69+.25*rand(i,105);
    const final=6.63+rand(i,117)*.26+(late?.26:0);
    return {i,late,born:.025+.46*rand(i,111),phase:i*2.399963+.85*rand(i,107),radius:53+122*rand(i,108),
      speed:1.83+.72*rand(i,109),len:26+11*rand(i,110),zScale:.77+.22*rand(i,112),
      release,crossing,ground,pull,rejoin,final,depart:Math.min(7.80,final+.79+.10*rand(i,106)),
      runZ:(rand(i,113)-.5)*97,runH:(rand(i,114)-.5)*42,restZ:(rand(i,115)-.5)*222,
      outer:i%5===0||i%7===2,restX:.03+.65*rand(i,116),lane:rand(i,118)};
  });
  function wheel(s,t,caster,second) {
    const enter=second?1:step(s.born-.04,s.born+.57,t);
    const tight=second?step(6.15,s.final-.01,t):step(1.93,s.release-.015,t);
    const a=s.phase+t*s.speed+(second?.84:0)+tight*(s.late?.42:1.07);
    const pulse=1+.14*Math.sin(a*.99+.32*s.i)+.085*Math.cos(t*1.22+s.i);
    const radius=s.radius*pulse*mix(.24,1,enter)*mix(1,s.late?.57:.26,tight);
    const z=159*Math.tanh(radius*s.zScale*Math.sin(a)/159);
    const drift=(second?-14:-25)*Math.sin(t*.94+.3);
    const h=65-.28*z+6*Math.sin(a*2+.28*s.i)+8*Math.cos(a+.9)+5*Math.sin(s.i*.8);
    return pt(caster+drift+radius*Math.cos(a),h,z);
  }
  function resting(s,o){
    const span=o.targetX-o.casterX;
    let x=s.outer?o.casterX+span*(-.30+1.05*s.lane):o.targetX+21+s.restX*span;
    if(!o.hit&&!s.outer)x=Math.max(o.targetX+58,x+31);
    return pt(Math.min(906,x),0,s.restZ);
  }
  function recallPoint(s,t,o){
    if(t<s.release)return wheel(s,t,o.casterX,false);
    const from=o.casterX,to=o.targetX,span=to-from;
    const z=s.runZ,h=(o.hit?67:147)+s.runH;
    const aim=pt(s.outer?from+span*(.12+.51*s.lane):to,h,z),rest=resting(s,o);
    if(t<s.crossing){
      const a=wheel(s,s.release,from,false),tangent=nrm(sub(a,wheel(s,s.release-.009,from,false)));
      const b=add(a,tangent,27+s.lane*22),c=pt(mix(from,aim.x,.53),h+8+s.runZ*.09,z*.73);
      return cubic(a,b,c,aim,clamp((t-s.release)/(s.crossing-s.release)));
    }
    if(t<s.ground){
      const u=clamp((t-s.crossing)/(s.ground-s.crossing));
      const b=pt(aim.x+40+s.lane*28,h-2,z+3),c=pt(rest.x+14,56+9*s.lane,rest.z+17);
      return cubic(aim,b,c,rest,u);
    }
    if(t<s.pull)return rest;
    if(t<s.rejoin){
      const u=clamp((t-s.pull)/(s.rejoin-s.pull)),land=wheel(s,s.rejoin,from,true);
      const tangent=nrm(sub(wheel(s,s.rejoin+.01,from,true),land));
      const b=pt(rest.x+24+36*s.lane,65+71*(1-s.lane),rest.z+72*Math.sin(s.phase));
      const c=add(land,tangent,-(44+78*s.lane));
      return cubic(rest,b,c,land,u);
    }
    if(t<s.final)return wheel(s,t,from,true);
    const u=clamp((t-s.final)/(s.depart-s.final));
    const a=wheel(s,s.final,from,true),dir=nrm(sub(a,wheel(s,s.final-.012,from,true)));
    const b=add(a,dir,23+24*s.lane);
    return cubic(a,b,pt(to+span*.035,h-3,z*.62),pt(1067,64+s.runH*1.15+(o.hit?0:85),z+s.runZ*.71),u);
  }
  function recallBlade(s,t,o){
    if(t<s.born||t>s.depart)return null;
    const p=recallPoint(s,t,o);
    const groundDirection=nrm(pt(-.08+s.lane*.18,-1,s.runZ*.001));
    const parked=t>=s.ground&&t<s.pull;
    let dir=groundDirection;
    if(!parked){
      const d=nrm(sub(recallPoint(s,t+.004,o),recallPoint(s,t-.004,o)));
      // A planted sword lifts hilt-first for a few frames before the glowing
      // tip sweeps over into the direction of the return curve.
      if(t>=s.pull&&t<s.pull+.105){
        const angle=mix(-Math.PI/2,Math.atan2(d.h,d.x),step(s.pull,s.pull+.105,t));
        dir=nrm(pt(Math.cos(angle),Math.sin(angle),d.z*step(s.pull,s.pull+.105,t)));
      }else if(t>s.ground-.07&&t<s.ground){
        dir=nrm(lerp(d,groundDirection,step(s.ground-.07,s.ground,t)));
      }else dir=d;
    }
    const buried=step(s.ground-.03,s.ground+.06,t)*(1-step(s.pull,s.pull+.09,t));
    return {p,dir,len:s.len*(1-.16*buried),alpha:step(s.born,s.born+.135,t),parked};
  }
  let recallCache;
  function recallFrame(ctx,t,o){
    if(!recallCache||recallCache.t!==t||recallCache.target!==o.targetX||recallCache.caster!==o.casterX||recallCache.hit!==o.hit){
      const blades=[];
      for(const s of returning){
        const state=recallBlade(s,t,o);
        if(state)blades.push({s,state});
      }
      blades.sort((a,b)=>a.state.p.z-b.state.p.z);
      recallCache={t,target:o.targetX,caster:o.casterX,hit:o.hit,blades};
    }
    for(const {s,state} of recallCache.blades){
      const {p,dir,len,alpha,parked}=state;
      if(o.pass==='ground'){shadow(ctx,p,dir,len,alpha,false,true);continue;}
      if((p.z>=0)!==(o.pass==='front'))continue;
      const before=t<s.release,orbiting=before||t>=s.rejoin&&t<s.final;
      const air=1-step(s.ground-.028,s.ground+.035,t)*(1-step(s.pull,s.pull+.12,t));
      if(!parked&&air>.03){
        const span=orbiting?.36+.15*s.lane:t>=s.pull&&t<s.rejoin?.17:t<s.crossing||t>s.final?.10:.105;
        trail(ctx,a=>recallBlade(s,a,o),t,span,goldJade.tail.join(','),orbiting?1.35+.57*s.lane:1.75,air*alpha,1.11,true);
      }
      if(t>=s.ground&&t<s.ground+.17)impact(ctx,{p:resting(s,o),id:s.i},t-s.ground,.43,false);
      // The blade edge catches a yellow-green light; its guard stays metallic.
      const heel=project(add(p,dir,-len*.84)),tip=project(p);
      ctx.save();ctx.globalAlpha*=alpha*(parked?.18:.30);
      line(ctx,tip.x,tip.y,heel.x,heel.y,'#e3ff95',len*.185);ctx.restore();
      const rollTime=t<s.ground?t:t<s.pull?s.ground:t-s.pull+s.ground;
      sword(ctx,p,dir,len,goldJade,alpha,rollTime*1.8+s.i*.72,s.i%3);
    }
  }
  function paint(ctx,t,settings={}){
    const {move='myriad',pass='front',targetX=660,casterX=CASTER,mirror=false,hit=true}=settings;
    if(!ctx||!Number.isFinite(t)||t<0)return;
    const o={move,pass,targetX,casterX,hit};
    ctx.save();
    if(mirror){ctx.translate(960,0);ctx.scale(-1,1);}
    if(move==='myriad')swarmFrame(ctx,t,o);
    if(move==='unlimited')fieldFrame(ctx,t,o);
    if(move==='recall')recallFrame(ctx,t,o);
    ctx.restore();
  }
  globalThis.swordVfx={duration:{myriad:5.05,unlimited:5.8,recall:7.90},events:{
    myriad:{orbit:1.40,launch:2.23,descent:2.94,firstContact:Math.min(...swarm.map(s=>s.land)),rain:3.59,lastContact:Math.max(...swarm.map(s=>s.land))},
    unlimited:{plant:.91,field:1.66,releases:launchTimes,impacts:strikeTimes,recede:5.03},
    recall:{wreath:1.45,compress:2.44,volley:3.13,planted:4.10,return:5.38,reformed:6.12,
      finalCompress:6.62,finalVolley:7.13,impacts:[3.21,3.39,7.21,7.41]}
  },paint};
})();
