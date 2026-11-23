/* Archer's Reality Marble, a visual study. The scene clock has no battle rules. */
(() => {
  'use strict';
  const W=960,H=400,CASTER=320,FLOOR=314,PI=Math.PI,TAU=2*PI;
  const sat=x=>Math.max(0,Math.min(1,x));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const ease=x=>{const k=sat(x);return k*k*(3-2*k);};
  const ramp=(a,b,t)=>ease((t-a)/(b-a));
  const noise=(n,k)=>{const v=Math.sin((n+11)*37.412+(k+7)*114.23)*24361.23;return v-Math.floor(v);};
  const point=(x,y)=>({x,y});
  function line(c,a,b,color,width){
    c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
  }
  function shape(c,nodes,fill){
    if(!nodes.length)return;
    c.fillStyle=fill;c.beginPath();c.moveTo(nodes[0].x,nodes[0].y);
    for(let i=1;i<nodes.length;i++)c.lineTo(nodes[i].x,nodes[i].y);c.closePath();c.fill();
  }
  function tempCanvas(w,h){
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;return canvas;
  }
  const art={world:null,weapons:null};
  const rows=[
    [41,13,188,974,134,135],[284,13,204,974,383,384],
    [578,15,111,966,677,637],[772,12,255,977,902,900],
    [1112,92,133,878,1123,1164],[1322,93,133,875,1450,1398],
  ];
  function mipChain(source){
    const chain=[source];
    while(chain.at(-1).height>34){
      const prev=chain.at(-1),next=tempCanvas(Math.max(1,Math.ceil(prev.width/2)),Math.ceil(prev.height/2)),nc=next.getContext('2d');
      nc.imageSmoothingEnabled=true;nc.imageSmoothingQuality='high';nc.drawImage(prev,0,0,next.width,next.height);chain.push(next);
    }
    return chain;
  }
  let blades=[],worldTextureDirty=true;
  function setArt(world,weapons){
    if(world){art.world=world;worldTextureDirty=true;}
    if(!weapons||art.weapons===weapons)return;
    art.weapons=weapons;
    blades=rows.map(([x,y,w,h,tip,grip])=>{
      const scale=460/h,b=tempCanvas(Math.ceil(w*scale),460),bc=b.getContext('2d');
      bc.drawImage(weapons,x,y,w,h,0,0,b.width,460);
      const tint=tempCanvas(b.width,460),tc=tint.getContext('2d');
      tc.drawImage(b,0,0);tc.globalCompositeOperation='source-in';tc.fillStyle='#f4f5f6';tc.fillRect(0,0,b.width,460);
      const edge=tempCanvas(b.width,460),ec=edge.getContext('2d');
      for(const [dx,dy] of [[2,0],[-2,0],[0,2],[0,-2]])ec.drawImage(tint,dx,dy);
      ec.globalCompositeOperation='destination-out';ec.drawImage(tint,0,0);ec.globalCompositeOperation='source-over';
      const patina=tempCanvas(b.width,460),pc=patina.getContext('2d');pc.drawImage(b,0,0);
      pc.globalCompositeOperation='source-atop';
      const oxide=pc.createLinearGradient(0,0,b.width,0);
      oxide.addColorStop(0,'rgba(87,56,43,.58)');oxide.addColorStop(.37,'rgba(116,82,59,.56)');oxide.addColorStop(.67,'rgba(83,55,47,.44)');oxide.addColorStop(1,'rgba(164,104,60,.57)');
      pc.fillStyle=oxide;pc.fillRect(0,0,b.width,460);
      const silver=tempCanvas(b.width,460),sc=silver.getContext('2d');
      sc.drawImage(b,0,0);
      const pixels=sc.getImageData(0,0,b.width,460);
      for(let i=0;i<pixels.data.length;i+=4){
        const src=pixels.data,lit=(src[i]*.30+src[i+1]*.59+src[i+2]*.11)/255;
        const v=174+81*Math.sqrt(lit);
        src[i]=src[i+1]=src[i+2]=v;
      }
      sc.putImageData(pixels,0,0);
      return {body:b,mips:mipChain(silver),steelMips:mipChain(patina),tint,edge,tip:(tip-x)*scale,grip:(grip-x)*scale};
    });
  }
  function loadImg(url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Unable to load '+String(url).slice(0,80)));im.src=url;});}
  const sources=window.fateFieldAssets||{world:'assets/fate-world.webp',weapons:'assets/fate-weapons.webp'};
  const ready=Promise.all([loadImg(sources.world),loadImg(sources.weapons)]).then(([w,s])=>setArt(w,s));

  // Geometry-independent fire boundary. Distance is measured on an inclined
  // advancing surface rooted at the caster's feet. The flame field transports
  // turbulent folds upwards while slower lobes expand away from the source.
  const vert=`#version 300 es
    void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(2.*p-1.,0.,1.);}`;
  const frag=`#version 300 es
    precision highp float;
    uniform sampler2D stageTex,realmTex;
    uniform float boundary,clock,flip,origin;
    out vec4 color;
    float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
    float fb(vec2 p){
      mat2 m=mat2(1.57,-1.19,1.19,1.57);
      float a=.55*noise(p);p=m*p+9.17;a+=.27*noise(p);p=m*p+4.81;a+=.135*noise(p);p=m*p-7.42;return a+.055*noise(p);
    }
    float arrival(vec2 p){
      vec2 q=p-vec2(origin,314.);
      vec2 ground=vec2(q.x,q.y*mix(3.12,2.92,smoothstep(-8.,18.,q.y)));
      float bearing=atan(ground.y,ground.x);
      float arena=length(ground)+8.*sin(bearing*5.+.9)+7.*sin(bearing*9.-.45);
      float sky=469.+max(0.,175.-p.y)*1.51+.20*abs(q.x)+16.*sin(p.x*.015)+9.*cos(p.y*.027+p.x*.009);
      return mix(arena,sky,1.-smoothstep(137.,213.,p.y));
    }
    void main(){
      vec2 sz=vec2(960.,400.),uv=gl_FragCoord.xy/sz;
      vec2 screen=vec2(uv.x,1.-uv.y)*sz;
      vec2 p=vec2(mix(screen.x,960.-screen.x,flip),screen.y);
      vec2 q=p-vec2(origin,314.);
      float radius=-42.+boundary*990.;
      float d=arrival(p);
      float front=radius-d;
      vec2 plane=vec2(q.x,q.y*3.02);
      float nearSide=smoothstep(-.52,.69,dot(plane,vec2(-.62,.79))/max(1.,length(plane)));
      float surge=smoothstep(.018,.106,boundary)*(1.-smoothstep(.58,.79,boundary));
      float lead=13.+76.*smoothstep(.015,.32,boundary);
      float edge=smoothstep(-133.,-28.,front)*(1.-smoothstep(57.,111.,front));
      vec2 flow=p*vec2(.019,.013)+vec2(0,clock*2.18);
      float eddy=fb(flow*.61+vec2(2.8*noise(flow*.48),-.30*clock));
      float small=fb(flow*1.74+vec2(eddy*2.35,clock*.1));
      float fuel=smoothstep(.29,.83,.62*eddy+.38*small);
      float edgeDist=front+(.20+fuel)*30.*(eddy-.43);
      float revealed=smoothstep(-4.,5.,edgeDist);
      vec2 shift=vec2((small-.5)*7.,(eddy-.46)*11.)*edge/sz;
      vec2 stUV=clamp(uv+shift,0.,1.);
      vec3 old=texture(stageTex,stUV).rgb;
      vec3 realm=texture(realmTex,clamp(uv+shift*.61,0.,1.)).rgb;
      vec3 base=mix(old,realm,revealed);
      // Each rising flame samples a lower piece of the racing ground front.
      // Crests are disconnected hot tongues with rolling dark gaps between them.
      float tongue=0.,filament=0.,coldVapor=0.,coldCore=0.;
      float flameHeight=17.+69.*smoothstep(.17,.79,eddy)+15.*noise(vec2(p.x*.018,clock*.64));
      float draft=(p.x<origin?-.21:.21)+.11*sin(p.x*.024+clock*2.);
      float prev=front+(small-.48)*24.+(eddy-.51)*26.;
      if(abs(front)<390.)for(int j=0;j<12;j++){
        float u=(float(j)+1.)/12.;
        float h=u*flameHeight;
        vec2 foot=p+vec2(h*(draft+(small-.5)*.46)+sin(u*4.8+eddy*7.)*5.*u,h);
        float traced=radius-arrival(foot)+(small-.48)*(24.+24.*u)+(eddy-.51)*26.;
        float separation=prev*traced<=0.?0.:min(abs(prev),abs(traced));
        float filamentWidth=(7.+12.*fuel)*(1.-.49*u);
        float ribbon=exp(-separation/filamentWidth);
        vec2 streak=vec2(foot.x*.034+eddy*1.28,p.y*.016+clock*2.14+u*.9);
        float eddies=.60*noise(streak)+.27*noise(streak*2.4+small)+.13*eddy;
        float seam=.49*small+.36*eddies+.15*eddy;
        float lace=smoothstep(.24+.33*u,.58+.22*u,seam);
        float s=ribbon*lace*(1.-.32*u);
        tongue=max(tongue,s);
        filament=max(filament,exp(-separation/(2.8+2.5*fuel))*smoothstep(.38+.24*u,.70+.08*u,seam)*(1.-.69*u));
        // Cyan pressure rises out of the near part of the sheet. Its foot
        // overtakes the moving hot boundary; the far flame still stands behind.
        float ca=prev+lead,cb=traced+lead;
        float off=ca*cb<=0.?0.:min(abs(ca),abs(cb));
        float vapor=exp(-off/(26.+25.*fuel))*(1.-smoothstep(.55,1.26,u));
        coldVapor=max(coldVapor,vapor*smoothstep(.18+.29*u,.64+.12*u,seam));
        coldCore=max(coldCore,exp(-off/(12.+12.*fuel))*(1.-smoothstep(.11,.65,u))*(.68+.32*seam));
        prev=traced;
      }
      float glow=exp(-abs(front)/(12.+48.*fuel));
      float ignite=smoothstep(.005,.08,boundary)*(1.-smoothstep(.90,1.,boundary));
      float hotSide=1.-.36*nearSide*surge;
      tongue*=ignite*hotSide;filament*=ignite*hotSide;glow*=ignite*hotSide;
      base*=1.-.14*glow;
      base=mix(base,vec3(.67,.115,.028),glow*.33);
      base=mix(base,mix(vec3(.97,.22,.031),vec3(1.,.76,.27),fuel),clamp(tongue*1.62,0.,1.));
      base+=vec3(.57,.25,.050)*glow*.55+vec3(1.,.70,.25)*filament*.75;
      float reach=surge*(.10+.90*nearSide)*(1.-smoothstep(150.,275.,abs(q.y)));
      float skyHalo=exp(-abs(front+lead)/(44.+26.*fuel))*reach;
      base=mix(base,vec3(.105,.50,.87),skyHalo*.47);
      base=mix(base,mix(vec3(.21,.72,1.),vec3(.68,.98,1.),small),clamp(1.29*coldVapor*reach,0.,1.));
      base=mix(base,vec3(.99,1.,1.),smoothstep(.17,.81,coldCore*reach));
      base+=vec3(.13,.26,.31)*skyHalo;
      color=vec4(base,1.);
    }`;
  let hardware;
  function renderer(){
    if(hardware!==undefined)return hardware;
    const canvas=tempCanvas(W,H),gl=canvas.getContext('webgl2',{alpha:false,preserveDrawingBuffer:true,antialias:false});
    if(!gl){hardware=null;return hardware;}
    const program=gl.createProgram();
    for(const [type,code] of [[gl.VERTEX_SHADER,vert],[gl.FRAGMENT_SHADER,frag]]){
      const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));
      gl.attachShader(program,s);gl.deleteShader(s);
    }
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    const uniforms=Object.fromEntries(['stageTex','realmTex','boundary','clock','flip','origin'].map(k=>[k,gl.getUniformLocation(program,k)]));
    const textures=[0,1].map(i=>{
      const tx=gl.createTexture();gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tx);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);return tx;
    });
    gl.uniform1i(uniforms.stageTex,0);gl.uniform1i(uniforms.realmTex,1);
    const transfer=(i,img)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,textures[i]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);};
    hardware={gl,canvas,draw(source,state){
      if(gl.isContextLost())return false;
      transfer(0,source);if(worldTextureDirty){transfer(1,art.world);worldTextureDirty=false;}
      gl.viewport(0,0,W,H);gl.uniform1f(uniforms.boundary,state.boundary);gl.uniform1f(uniforms.clock,state.time);gl.uniform1f(uniforms.flip,state.mirror?1:0);
      gl.uniform1f(uniforms.origin,state.casterX);
      gl.drawArrays(gl.TRIANGLES,0,3);return true;
    }};
    return hardware;
  }
  function frontier(x,y,b,origin){
    const dy=y-FLOOR,wy=dy*lerp(3.12,2.92,ramp(-8,18,dy)),dx=x-origin,a=Math.atan2(wy,dx);
    const arena=Math.hypot(dx,wy)+8*Math.sin(5*a+.9)+7*Math.sin(9*a-.45);
    const sky=469+Math.max(0,175-y)*1.51+.20*Math.abs(dx)+16*Math.sin(x*.015)+9*Math.cos(y*.027+x*.009);
    return -42+b*990-lerp(arena,sky,1-ramp(137,213,y));
  }
  function fallbackWall(c,s){
    const {boundary:b,time,mirror}=s,rx=-42+b*990;
    if(rx<=0)return;
    const region=new Path2D(),steps=135,embers=[];
    for(let i=0;i<=steps;i++){
      const a=i/steps*TAU,dx=Math.cos(a),dy=Math.sin(a);let low=0,high=1800;
      for(let n=0;n<10;n++){const r=(low+high)/2;if(frontier(s.casterX+r*dx,FLOOR+dy*r,b,s.casterX)>0)low=r;else high=r;}
      const r=low+3*Math.sin(a*39+time*2.4);let x=s.casterX+dx*r;const y=FLOOR+dy*r;
      if(mirror)x=W-x;if(!i)region.moveTo(x,y);else region.lineTo(x,y);
      if(i<steps&&x>-45&&x<W+45&&y>0&&y<H+60)embers.push({x,y,i});
    }
    region.closePath();c.save();c.clip(region);c.drawImage(art.world,0,0,W,H);c.restore();
    c.save();c.lineJoin='round';for(const [width,col] of [[23,'rgba(239,86,17,.24)'],[9,'rgba(255,133,30,.68)'],[2,'#ffdf8f']]){c.lineWidth=width;c.strokeStyle=col;c.stroke(region);}
    for(const {x,y,i} of embers){
      const seed=noise(i,78),w=6+8*seed,h=12+35*(.5+.5*Math.sin(time*5.7+i*.72))*(.6+seed),sway=8*Math.sin(time*3+i);
      const g=c.createLinearGradient(x,y,x,y-h);g.addColorStop(0,'rgba(255,210,71,.85)');g.addColorStop(.49,'rgba(255,132,34,.73)');g.addColorStop(1,'rgba(221,61,20,0)');
      c.fillStyle=g;c.beginPath();c.moveTo(x-w,y);c.bezierCurveTo(x-w*.6,y-h*.57,x+sway-w*.4,y-h*.78,x+sway,y-h);
      c.bezierCurveTo(x+sway-w*.2,y-h*.57,x+w,y-h*.39,x+w,y);c.closePath();c.fill();
    }c.restore();
    fallbackPressure(c,s);
  }
  function pressureEnvelope(b){
    return ramp(.018,.106,b)*(1-ramp(.58,.79,b));
  }
  function pulseRadius(b){
    return -42+b*990+13+76*ramp(.015,.32,b);
  }
  function fallbackPressure(c,s){
    const strength=pressureEnvelope(s.boundary),r=pulseRadius(s.boundary);
    if(strength<.005||r<=2)return;
    // The camera-near lip is strongest; the far arc is thin and translucent.
    c.save();if(s.mirror){c.translate(W,0);c.scale(-1,1);}
    for(let i=0;i<94;i++){
      const a=i/94*TAU,side=ramp(-.52,.69,-.62*Math.cos(a)+.79*Math.sin(a));
      const phase=s.time*3.2+2.8*Math.sin(i*1.27),vary=.67+.33*Math.sin(phase);
      const bend=r+6*Math.sin(5*a)+4*Math.sin(9*a+.7);
      const x=s.casterX+Math.cos(a)*bend,y=FLOOR+Math.sin(a)*bend/3.02;
      const alpha=strength*(.07+.93*side),rad=14+21*vary;
      if(x<-rad||x>W+rad||y<-rad||y>H+rad)continue;
      c.save();c.translate(x,y-6*vary);c.scale(1.33,.70+vary*.35);
      const g=c.createRadialGradient(0,0,0,0,0,rad);
      g.addColorStop(0,'rgba(243,255,255,'+(.83*alpha)+')');g.addColorStop(.37,'rgba(123,235,255,'+(.76*alpha)+')');
      g.addColorStop(.72,'rgba(54,170,246,'+(.37*alpha)+')');g.addColorStop(1,'rgba(49,122,232,0)');
      c.fillStyle=g;c.fillRect(-rad,-rad,rad*2,rad*2);c.restore();
    }c.restore();
  }
  function launchFlash(c,s){
    const b=s.boundary,flash=ramp(.006,.041,b)*(1-ramp(.057,.170,b));
    if(flash<=.001)return;
    const x=s.mirror?W-s.casterX:s.casterX;
    c.save();c.translate(x,FLOOR-2);c.scale(1,.39);c.globalAlpha*=flash;
    const r=65+410*b,g=c.createRadialGradient(0,0,0,0,0,r);
    g.addColorStop(0,'#ffffff');g.addColorStop(.19,'#efffff');g.addColorStop(.42,'rgba(123,234,255,.96)');
    g.addColorStop(.70,'rgba(48,153,254,.42)');g.addColorStop(1,'rgba(33,96,227,0)');
    c.fillStyle=g;c.fillRect(-r,-r,r*2,r*2);c.restore();
  }
  function nearImpulse(c,s){
    const b=s.boundary,energy=pressureEnvelope(b),r=pulseRadius(b);
    if(energy<.008||r<4)return;
    // Tiny spray crossing the near edge gives depth, while the flash body is
    // rendered behind the fighters, leaving silhouettes readable at its peak.
    c.save();
    for(let i=0;i<21;i++){
      const born=.060+noise(i,57)*.34,u=(b-born)/.14;
      if(u<0||u>=1)continue;
      const a=.12+noise(i,59)*2.79,rr=pulseRadius(born);
      const x=s.casterX+Math.cos(a)*(rr+u*(19+47*noise(i,13)));
      const y=FLOOR+Math.sin(a)*rr/3.02-(16+41*noise(i,51))*Math.sin(u*PI)+u*8;
      const k=(1+.9*noise(i,31))*(.54+.46*Math.sin(u*PI)),ang=i*.72+u*5.5;
      c.save();c.translate(x,y);c.rotate(ang);c.globalAlpha*=Math.sin(u*PI)*energy;
      shape(c,[point(-1.9*k,0),point(-.4*k,-k),point(2.4*k,-.2*k),point(.6*k,1.05*k)],'#263e57');
      line(c,point(-.4*k,-k),point(1.9*k,-.35*k),'#d6fcff',.9);c.restore();
    }c.restore();
  }
  function firebrands(c,s){
    if(s.boundary>=.965||s.boundary<=.03)return;
    for(let i=0;i<205;i++){
      const x0=noise(i,51)*W,y0=30+noise(i,53)*365;
      const distance=frontier(x0,y0,s.boundary,s.casterX),age=distance/570;
      if(age<0||age>.26)continue;
      const side=x0>s.casterX?1:-1,n=noise(i,58),x=x0+side*age*(18+44*n);
      const y=y0-(80+124*n)*age+90*age*age,screenX=s.mirror?W-x:x;
      c.save();c.globalAlpha*=(1-age/.26)*(.5+.5*n);
      line(c,point(screenX-.65*side,y+2+2.6*n),point(screenX,y),n>.62?'#ffeca5':'#ff954e',.7+.83*n);c.restore();
    }
  }
  function background(c,s){
    if(!art.world||s.boundary<=.0002)return;
    if(s.boundary>=.9998){c.drawImage(art.world,0,0,W,H);return;}
    const gpu=renderer();
    if(gpu&&gpu.draw(c.canvas,s))c.drawImage(gpu.canvas,0,0,W,H);
    else fallbackWall(c,s);
    launchFlash(c,s);
    firebrands(c,s);
  }
  function drawSteel(c,k,x,y,a,length,opts={}){
    const b=blades[k];if(!b||length<.15)return;
    const h=b.body.height,scale=length/h,grip=opts.grip||false,pivotX=grip?b.grip:b.tip,pivotY=grip?h*.873:0;
    c.save();c.globalAlpha*=sat(opts.alpha??1);c.translate(x,y);c.rotate(a+PI/2);c.scale(scale*(opts.roll??1),scale);
    const l=-pivotX,top=-pivotY,levels=opts.weathered?b.steelMips:b.mips;
    const level=Math.max(0,Math.min(levels.length-1,Math.floor(Math.log2(h/Math.max(1,length))))),image=levels[level];
    if(opts.ghost!=null){
      const u=sat(opts.ghost);
      c.save();c.globalAlpha*=.55;c.drawImage(b.edge,l,top);c.restore();
      // A materialization wave travels along the real blade silhouette.
      const yEdge=top+(1-u)*h;
      c.save();c.beginPath();c.rect(l-1,yEdge,b.body.width+2,top+h-yEdge+1);c.clip();c.drawImage(image,l,top,b.body.width,h);c.restore();
      c.save();c.beginPath();c.rect(l-1,yEdge-8,b.body.width+2,14);c.clip();c.drawImage(b.tint,l,top);c.restore();
    }else{c.drawImage(image,l,top,b.body.width,h);}
    c.restore();
  }
  const planted=Array.from({length:52},(_,i)=>{
    const depth=(i+.5)/52,y=lerp(240,385,depth**1.42)+(noise(i,4)-.5)*9;
    let x=24+noise(i,7)*910;
    if(y>294&&(Math.abs(x-320)<43||Math.abs(x-660)<45))x+=x<485?-73:72;
    const len=lerp(9,77,depth**1.52)*(.69+noise(i,8)*.68);
    return {i,x,y,len,a:PI/2+(noise(i,10)-.48)*.70,id:i%4,roll:.95+.61*noise(i,17)};
  }).concat([
    {x:61,y:388,len:138,a:1.80,id:1,roll:1.39},
    {x:880,y:384,len:121,a:1.25,id:3,roll:1.35},
    {x:452,y:358,len:88,a:1.71,id:2,roll:1.21}
  ]).sort((a,b)=>a.y-b.y);
  function plantedPass(c,s,front){
    for(const v of planted){
      if((v.y>FLOOR)!==front)continue;
      const alpha=s.boundary>=.999?1:ramp(-8,24,frontier(v.x,v.y,s.boundary,s.casterX));
      if(alpha<=.003)continue;
      const x=s.mirror?W-v.x:v.x,a=s.mirror?PI-v.a:v.a;
      c.save();c.globalAlpha*=alpha;
      const length=v.len*.91,st=v.len*.035;
      shape(c,[point(x,v.y),point(x+length*.56,v.y+length*.14-st),point(x+length,v.y+length*.22),point(x+length*.55,v.y+length*.14+st)],'rgba(36,24,22,.56)');
      drawSteel(c,v.id,x,v.y,a,v.len,{roll:v.roll,weathered:true});c.restore();
    }
  }
  function air(c,s,front){
    const t=s.time;
    for(let i=front?0:22;i<(front?22:52);i++){
      const phase=noise(i,9),life=(t*(.066+.05*phase)+noise(i,16))%1;
      const y=lerp(377,72,life)+Math.sin(t*.7+i)*6;
      const worldX=(noise(i,5)*1080+life*(99+80*phase)+10*Math.sin(10*life+i))%1060-40;
      const amount=s.boundary>=.999?1:ramp(8,88,frontier(worldX,y,s.boundary,s.casterX));
      const alpha=amount*Math.sin(life*PI)*(.36+.34*phase);
      if(alpha<.008)continue;const x=s.mirror?W-worldX:worldX,size=front?1.05+.95*phase:.4+.65*phase;
      c.save();c.globalAlpha*=alpha;line(c,point(x-.8*size,y+1.5*size),point(x+.4*size,y-.3*size),front?'#ffbf73':'#f3ac67',size);c.restore();
    }
  }
  function meleeEndX({targetX=660,hit=true}={}){
    return targetX-(hit?67:111);
  }
  function actorOffset(s){
    return s.action==='melee'?(meleeEndX(s)-(s.casterX??CASTER))*ramp(.16,.79,s.age):0;
  }
  // The blade's local origin is the middle of the wrapped grip, with its tip
  // pointing to the right. Both hands use this same anchor in every pose.
  function falchion(c,x,y,angle,kind='ivory',length=39,roll=1){
    c.save();c.translate(x,y);c.rotate(angle);c.scale(length/39,length/39*roll);
    const ink='#34343b',etched=kind==='engraved';
    c.lineJoin='round';c.lineWidth=.82;
    c.beginPath();c.moveTo(2.8,-2.6);c.quadraticCurveTo(13.2,-1.7,24.8,-3.7);
    c.quadraticCurveTo(31.3,-5.0,38.0,-8.8);
    c.quadraticCurveTo(36.6,-5.7,33.3,-2.5);c.lineTo(32.5,-.8);
    c.quadraticCurveTo(28.0,3.0,21.4,4.4);c.quadraticCurveTo(11.8,5.6,3.0,3.1);c.closePath();
    c.fillStyle=etched?'#e4e6e6':'#f2f3f3';c.fill();c.strokeStyle=ink;c.stroke();
    const blade=new Path2D();blade.moveTo(3,-2.3);blade.quadraticCurveTo(24,.12,38,-8.8);
    blade.quadraticCurveTo(25.2,.34,22.3,1.7);blade.quadraticCurveTo(9.4,4.3,3.2,2.7);blade.closePath();
    c.fillStyle=etched?'#b8bbbe':'#c8cbce';c.fill(blade);
    c.beginPath();c.moveTo(5.6,3.05);c.quadraticCurveTo(22.3,7.6,32.7,-.95);
    c.quadraticCurveTo(35.5,-4.35,38,-8.8);c.strokeStyle='#ffffff';c.lineWidth=1.05;c.stroke();
    if(etched){
      c.save();c.clip(blade);c.lineWidth=.56;c.strokeStyle='#a5a7a8';
      for(let i=9;i<37;i+=4.6){
        const bend=(i-9)*(i-9)*.009;
        c.beginPath();c.moveTo(i,-3-bend);c.lineTo(i+2.2,-.4-bend);c.lineTo(i+1.1,2.0-bend);c.lineTo(i+3.5,4.0-bend);c.stroke();
      }c.restore();
    }
    shape(c,[point(3,-2.3),point(12,-1.4),point(5.75,1.7),point(3.2,2.4)],etched?'#ededeb':'#68696d');
    c.strokeStyle='#343035';c.lineWidth=.8;c.fillStyle='#6b5955';
    c.beginPath();c.moveTo(1.5,-2.1);c.lineTo(3.3,-3.6);c.lineTo(4.4,-2.7);c.lineTo(4.2,2.8);c.lineTo(2.5,3.9);c.lineTo(1.3,2.0);c.closePath();c.fill();c.stroke();
    line(c,point(-6.1,0),point(2.3,0),'#191b1e',2.85);
    for(let i=-5.5;i<1;i+=1.7)line(c,point(i,-1),point(i+.8,.8),'#acaa9f',.49);
    line(c,point(-6.7,-.5),point(-6.3,1.2),'#a8a19c',1.45);c.restore();
  }
  function limbJoint(a,b,l1,l2,side){
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(.01,Math.hypot(dx,dy)),den=Math.min(d,l1+l2-.001);
    const forward=Math.max(0,(den*den+l1*l1-l2*l2)/(2*den)),height=Math.sqrt(Math.max(0,l1*l1-forward*forward));
    return point(a.x+dx/d*forward-dy/d*height*side,a.y+dy/d*forward+dx/d*height*side);
  }
  function limb(c,a,m,b,width,ink){
    c.strokeStyle=ink;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.beginPath();
    c.moveTo(a.x,a.y);c.lineTo(m.x,m.y);c.lineTo(b.x,b.y);c.stroke();
  }
  function glove(c,shoulder,hand,angle,dark,side=1,drawFist=true){
    const elbow=limbJoint(shoulder,hand,16.8,17.8,side);
    limb(c,shoulder,elbow,hand,dark?5.95:6.65,dark?'#17151c':'#0c0b10');
    const x=lerp(elbow.x,hand.x,.70),y=lerp(elbow.y,hand.y,.70),a=Math.atan2(hand.y-elbow.y,hand.x-elbow.x);
    c.save();c.translate(x,y);c.rotate(a);
    shape(c,[point(-4.0,-3.3),point(2.8,-4.0),point(4.4,2.8),point(-3.6,3.4)],dark?'#24212b':'#312b35');c.restore();
    if(drawFist)fist(c,hand,angle,dark);
  }
  function fist(c,hand,angle,dark){
    c.save();c.translate(hand.x,hand.y);c.rotate(angle);
    c.fillStyle=dark?'#211e25':'#131219';c.beginPath();c.ellipse(0,.05,3.4,3.1,-.15,0,TAU);c.fill();
    line(c,point(-1,-2),point(1.5,-1.7),dark?'#48414a':'#61535a',.7);c.restore();
  }
  function footPosition(dist,travel,rear){
    const rest=rear?-19:17,base=point(rest,-2.5);
    if(Math.abs(travel)<.1)return base;
    const steps=Math.max(2,Math.ceil(Math.abs(travel)/75)*2),phase=sat(dist/travel)*steps,stepLength=travel/steps;
    let x=rest,y=-2.5;
    for(let i=rear?0:1;i<steps;i+=2){
      const goal=i>=steps-2?travel+rest:(i+1.46)*stepLength;
      if(phase<=i)break;
      const f=sat(phase-i);
      x=lerp(x,goal,ease(f));y=-2.5-(6+Math.min(4,Math.abs(stepLength)*.12))*Math.sin(PI*f);
      if(f<1)break;
    }
    return point(x-dist,y);
  }
  function leg(c,hip,ankle,far){
    const knee=limbJoint(hip,ankle,26.5,26,-1);
    limb(c,hip,knee,ankle,far?6.55:7.6,far?'#151219':'#0b0b10');
    const nx=ankle.x,ny=ankle.y;
    shape(c,[point(nx-4.0,ny-9.9),point(nx+3.0,ny-10.1),point(nx+2.9,ny-4.6),point(nx+7.4,ny+.04),point(nx+7,ny+2.2),point(nx-4.8,ny+2.2),point(nx-4.0,ny-3)],far?'#29222e':'#352a35');
    line(c,point(nx-3.7,ny-9.7),point(nx+3,ny-10.1),'#62535c',.58);
  }
  // Pelvis shift, leading shoulder, and the two grip positions (local pixels).
  // Last column of each grip is blade heading in degrees. The original
  // fighter's long sword is never part of these full-body drawings.
  const guard=[0,-47,6,-73,11,-90,-13,-52,142,19,-52,-48];
  const crossed=[0,-45,5,-71,11,-90,-12,-54,-27,20,-52,-134];
  const poses=[
    [0,guard],
    [.145,[-2,-44,1,-70,6,-87,-14,-49,151,15,-59,-62]],
    [.244,[-1,-44,4,-70,10,-87,-16,-50,54,21,-58,-112]],
    [.307,crossed],[.397,crossed],
    [.54,[1,-43,13,-66,22,-81,-9,-60,158,17,-54,-14]],
    [.69,[2,-46,10,-71,15,-88,-7,-55,151,-1,-83,-117]],
    [.767,[3,-47,10,-72,15,-90,-8,-59,172,10,-88,-88]],
    [.86,[5,-46,13,-71,19,-88,-6,-67,202,31,-59,-5]],
    [.905,[6,-44,14,-68,21,-83,-8,-69,212,35,-55,19]],
    [.985,[3,-43,10,-69,17,-85,4,-79,272,16,-50,4]],
    [1.075,[6,-44,14,-71,21,-86,32,-68,355,-9,-57,136]],
    [1.13,[5,-44,13,-70,20,-84,31,-61,376,-9,-54,124]],
    [1.25,[3,-45,10,-71,16,-87,12,-56,426,-12,-49,19]],
    [1.44,[1,-46,7,-73,12,-90,-7,-51,477,17,-55,-45]],
    [1.64,guard.map((v,i)=>i===8?v+360:v)],
  ];
  function poseAt(t){
    if(t<=0||t>=1.64)return guard;
    let idx=1;while(idx<poses.length-1&&poses[idx][0]<t)idx++;
    const [ta,a]=poses[idx-1],[tb,b]=poses[idx],u=(t-ta)/(tb-ta);
    // Hermite tangents stop at real reversals. Unlike per-segment easing the
    // wrists and sword edges can keep speed through adjoining poses.
    const before=poses[Math.max(0,idx-2)],after=poses[Math.min(poses.length-1,idx+1)],dt=tb-ta;
    function slope(a,b,len){return !len?0:(b-a)/len;}
    function limited(prev,next){return prev*next<=0?0:2*prev*next/(prev+next);}
    return a.map((v,i)=>{
      const mid=slope(v,b[i],dt);
      const m0=dt*limited(slope(before[1][i],v,ta-before[0]),mid);
      const m1=dt*limited(mid,slope(b[i],after[1][i],after[0]-tb));
      return lerp(v,b[i],u*u*(3-2*u))+m0*u*(1-u)*(1-u)-m1*u*u*(1-u);
    });
  }
  function poseHands(s){
    const pose=poseAt(s.action==='melee'?s.age:0);
    return [6,9].map((i,j)=>({p:point(pose[i],pose[i+1]),angle:pose[i+2]*PI/180,kind:j?'engraved':'ivory',length:j?39:37,roll:j?1:.89}));
  }
  function bladePoint(hand,u){
    const cs=Math.cos(hand.angle),sn=Math.sin(hand.angle),scale=hand.length/39;
    const x=(4+34*u)*scale,y=-8.8*u*u*scale*hand.roll;
    return point(hand.p.x+cs*x-sn*y,hand.p.y+sn*x+cs*y);
  }
  function ribbon(c,s,id,begin,end){
    if(s.age<begin||s.age>end+.080)return;
    c.save();c.lineJoin='round';
    const live=Math.min(s.age,end),lifetime=1-ramp(end,end+.080,s.age);
    let prev=null;
    for(let i=0;i<=9;i++){
      const age=Math.max(begin,live-.094+.094*i/9),sub={...s,age},h=poseHands(sub)[id];
      const dx=actorOffset(sub)-actorOffset(s),outer=bladePoint(h,1),inner=bladePoint(h,.50);
      outer.x+=dx;inner.x+=dx;
      if(prev){
        c.globalAlpha=lifetime*(.025+.18*(i/9)**2);shape(c,[prev.inner,prev.outer,outer,inner],'#f3f3f4');
        c.globalAlpha=lifetime*(.04+.29*(i/9)**2);line(c,prev.outer,outer,'#ffffff',.85);
      }prev={inner,outer};
    }c.restore();
  }
  function torso(c,hip,sh){
    const a=Math.atan2(sh.y-hip.y,sh.x-hip.x)+PI/2,l=Math.hypot(sh.x-hip.x,sh.y-hip.y);
    c.save();c.translate(hip.x,hip.y);c.rotate(a);c.scale(1,l/27);
    shape(c,[point(-4,1.3),point(-4.8,-10),point(-6.5,-22),point(-4.8,-26),point(1.7,-28),point(6.1,-25.0),point(5.3,-18),point(3.7,-9),point(4.0,1)],'#141219');
    shape(c,[point(-9.6,-21.1),point(-7.7,-25.3),point(-3.4,-28.0),point(1,-28.3),point(-.3,-23.7),point(-4.3,-20.6)],'#302a35');
    shape(c,[point(.4,-28.0),point(4.5,-27.1),point(8.9,-23.3),point(9.7,-20.4),point(3.0,-22.4)],'#28232d');
    c.restore();
  }
  function sash(c,hip,trail){
    c.save();c.translate(hip.x,hip.y);
    shape(c,[point(-4.2,-.5),point(-2.3,1.6),point(-5.7-trail,13.5),point(-9.1-trail*.88,15),point(-7.2-trail*.45,8)],'#932d38');
    shape(c,[point(-2.8,-.5),point(.2,1.2),point(.8-trail*.77,17.3),point(-3.6-trail,15.6)],'#b03e44');
    shape(c,[point(-4.9,-3),point(4.7,-2.6),point(5.2,.8),point(-4.8,.9)],'#bb434c');
    line(c,point(-4.6,-2.9),point(4.5,-2.6),'#db6461',.61);c.restore();
  }
  function drawHead(c,x,y,a,atlas){
    c.save();c.translate(x,y);c.rotate(a);
    if(atlas){
      c.beginPath();c.ellipse(0,0,14.59,14.40,-.02,0,TAU);c.clip();
      c.drawImage(atlas,74,101,72,70,-14.7,-14.45,29.4,28.90);
    }else{
      const skin=c.createLinearGradient(-10,-12,10,13);skin.addColorStop(0,'#151017');skin.addColorStop(.68,'#0b0a0e');skin.addColorStop(1,'#09090c');
      c.fillStyle=skin;c.beginPath();c.ellipse(0,0,14.5,14.4,0,0,TAU);c.fill();
      shape(c,[point(2.1,-.65),point(8,2.6),point(7.1,3.9),point(4.5,3.1)],'#ef835a');
      shape(c,[point(10.5,2.7),point(13.1,0),point(12.0,3.5)],'#f58b64');
    }c.restore();
  }
  function drawCaster(c,raw={},atlas=null){
    const s={casterX:CASTER,targetX:660,hit:true,age:0,...raw},active=s.action==='melee',dist=actorOffset(s),travel=active?meleeEndX(s)-s.casterX:0;
    const p=poseAt(active?s.age:0),hip=point(p[0],p[1]),sh=point(p[2],p[3]);
    const hands=poseHands(s),far=hands[0],near=hands[1];
    const feet=[footPosition(dist,travel,true),footPosition(dist,travel,false)];
    // The left grip stays left of its shoulder while the blade turns across
    // the chest. The engraved blade from the opposite grip crosses in front.
    const chestGuard=active&&s.age>=.248&&s.age<=.463;
    const nearElbow=active?1-2*ramp(.152,.278,s.age)*(1-ramp(.424,.569,s.age)):1;
    function farArm(){
      falchion(c,far.p.x,far.p.y,far.angle,far.kind,far.length,far.roll);
      glove(c,point(sh.x-2.2,sh.y+.4),far.p,far.angle,true);
    }
    c.save();if(s.mirror){c.translate(W,0);c.scale(-1,1);}c.translate(s.casterX+dist,FLOOR);
    c.fillStyle='#17272d52';c.beginPath();c.ellipse(0,1,26,4,0,0,TAU);c.fill();
    if(active){ribbon(c,s,1,.755,.916);ribbon(c,s,0,.988,1.143);}
    leg(c,point(hip.x-1.8,hip.y+2),feet[0],true);
    if(!chestGuard)farArm();
    leg(c,point(hip.x+1.3,hip.y+2),feet[1],false);torso(c,hip,sh);
    sash(c,hip,active?Math.min(5.9,Math.abs(travel)*.05)*ramp(.15,.41,s.age)*(1-ramp(.73,1.23,s.age)):0);
    line(c,sh,point(p[4],p[5]+5),'#131017',5);
    drawHead(c,p[4],p[5],(sh.x-hip.x-6)*.018,atlas);
    if(chestGuard){
      glove(c,point(sh.x-2.2,sh.y+.4),far.p,far.angle,true,1,false);
      glove(c,point(sh.x+2,sh.y+1.2),near.p,near.angle,false,nearElbow,false);
      falchion(c,far.p.x,far.p.y,far.angle,far.kind,far.length,far.roll);
      fist(c,far.p,far.angle,true);
      falchion(c,near.p.x,near.p.y,near.angle,near.kind,near.length,near.roll);
      fist(c,near.p,near.angle,false);
    }else{
      falchion(c,near.p.x,near.p.y,near.angle,near.kind,near.length,near.roll);
      glove(c,point(sh.x+2,sh.y+1.2),near.p,near.angle,false,nearElbow);
    }
    c.restore();
  }
  const times={project:1.28,melee:1.64,volley:2.15};
  function spark(c,x,y,t,duration,color,seed,n=15){
    if(t<0||t>duration)return;
    const u=t/duration;c.save();c.globalAlpha*=1-ramp(.18,1,u);
    for(let j=0;j<n;j++){
      const a=(j*.61803398875+noise(j,seed)*.22)*TAU,v=52+139*noise(j,seed+19),p=Math.min(1,u+.025)*duration,r=v*p;
      const x2=x+Math.cos(a)*r,y2=y+Math.sin(a)*r+65*p*p,lag=.020+.025*noise(j,seed+7);
      const d=Math.max(0,p-lag);
      line(c,point(x+Math.cos(a)*v*d,y+Math.sin(a)*v*d+65*d*d),point(x2,y2),color,.75+1.3*noise(j,seed+17));
    }c.restore();
  }
  function wire(c,x,y,angle,length,u,seed){
    if(u<=0||u>=1)return;
    c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha*=Math.sin(u*PI);
    for(let j=0;j<3;j++){
      c.beginPath();const b=(j-1)*4;
      for(let k=0;k<=9;k++){
        const f=k/9,offset=b+(noise(k,seed+j*3)-.5)*9*Math.sin(PI*f);
        const xx=length*Math.min(f,u*1.34);
        if(!k)c.moveTo(xx,offset);else c.lineTo(xx,offset);
        if(f>u*1.34)break;
      }
      c.lineWidth=j===1?1.2:.6;c.strokeStyle=j===1?'#ffffff':'#d1d4d8';c.stroke();
    }c.restore();
  }
  function projectAction(c,s){
    const t=s.age;
    // Trace opposing falchions in two passes so each silhouette can be read.
    for(let j=0;j<2;j++){
      const a=t-.10*j,u=ramp(.06,.80,a),vis=ramp(.0,.14,a)*(1-ramp(.93,1.26,t));
      if(vis<=0)continue;
      const x=s.casterX+28+j*20,y=255-j*34-13*ramp(.05,.50,a),angle=j?-.34:-.92,length=46;
      c.save();c.globalAlpha*=vis;wire(c,x,y,angle,length,u,j+14);
      c.translate(x,y);c.rotate(angle);c.beginPath();c.rect(-9,-20,(length+16)*u,40);c.clip();
      falchion(c,0,0,0,j?'ivory':'engraved',length);c.restore();
    }
  }
  function melee(c,s){
    if(!s.hit)return;
    for(const [i,at] of contacts.entries()){
      const age=s.age-at;if(age<0||age>.21)continue;
      const grip=poseHands({...s,age:at})[1-i],tip=bladePoint(grip,.88);
      const x=s.casterX+actorOffset({...s,age:at})+tip.x,y=FLOOR+tip.y;
      spark(c,x,y,age,.21,'#ffe4af',29+i*11,17);
      if(age<.062){
        c.save();c.globalAlpha*=1-age/.062;
        line(c,point(x-4,y+2),point(x+5,y-4),'#fff9e5',1.7);c.restore();
      }
    }
  }
  const arsenal=Array.from({length:33},(_,i)=>{
    const group=i%3,ordinal=Math.floor(i/3),z=noise(i,7),birth=.055+.18*noise(i,3)+.095*group;
    const hit=[1.02,1.22,1.45][group]+(ordinal-5)*.013;
    return {i,k:i%4,group,z,birth,hit,fire:hit-.22-.065*z,len:38+40*z,
      x:CASTER-134+noise(i,11)*193,y:114+noise(i,13)*142,spread:(noise(i,14)-.5)*67};
  });
  function salvoState(v,a,s){
    if(a<v.birth||a>v.hit+.41)return null;
    // Close-quarters summoning uses the free space behind the wielder. The
    // straight flight line remains legible after a preceding melee approach.
    const rackShift=Math.max(0,225-(s.targetX-s.casterX));
    const launch=point(v.x+s.casterX-CASTER-rackShift,v.y),target=point(s.targetX+(v.i%4===0?16:0),(s.hit?246:151)+v.spread);
    const dx=target.x-launch.x,dy=target.y-launch.y,ang=Math.atan2(dy,dx);
    const u=(a-v.fire)/(v.hit-v.fire);
    if(u<0){const drift=1-ramp(v.birth,v.fire,a);
      return {p:point(launch.x-5*drift,launch.y+9*drift),a:ang-.12*drift,alpha:ramp(v.birth,v.birth+.095,a),ghost:ramp(v.birth,v.fire-.06,a)};}
    const advance=u<=1?u*(.36+.64*u):1+(u-1)*1.25;
    return {p:point(launch.x+dx*advance,launch.y+dy*advance),a:ang,alpha:1-ramp(v.hit+.10,v.hit+.405,a),ghost:1};
  }
  function volley(c,s,front){
    for(const v of arsenal){
      if((v.z>=.56)!==front)continue;
      const q=salvoState(v,s.age,s);if(!q)continue;
      const {p,a,alpha,ghost}=q;
      if(s.age>=v.fire){
        const old=salvoState(v,Math.max(v.fire,s.age-.050),s),total=v.len;
        if(old){
          const hx=Math.cos(a)*total,hy=Math.sin(a)*total,nx=-Math.sin(a)*(1.15+.45*v.z),ny=Math.cos(a)*(1.15+.45*v.z);
          c.save();c.globalAlpha*=alpha*.75;shape(c,[point(old.p.x-hx,old.p.y-hy),point(p.x-hx+nx,p.y-hy+ny),point(p.x-hx-nx,p.y-hy-ny)],'#e6e7e8');c.restore();
        }
      }
      drawSteel(c,v.k,p.x,p.y,a,v.len,{alpha,roll:.71+v.z*.29,ghost:ghost<.998?ghost:null});
      if(ghost<1){const back=point(p.x-Math.cos(a)*v.len,p.y-Math.sin(a)*v.len);
        wire(c,back.x,back.y,a,v.len,ghost,v.i);}
    }
    if(front&&s.hit)for(const [j,tm] of [1.02,1.22,1.45].entries())spark(c,s.targetX,249+(j-1)*12,s.age-tm,.22,'#fff1c4',j+31,14);
  }
  function paint(c,raw={}){
    const s={time:0,boundary:0,action:null,age:0,casterX:CASTER,targetX:660,mirror:false,hit:true,pass:'background',...raw};
    s.boundary=sat(s.boundary);
    if(s.pass==='background'){background(c,s);return;}
    if(s.boundary<=0)return;
    const front=s.pass==='front';
    c.save();plantedPass(c,s,front);air(c,s,front);
    if(s.mirror){c.translate(W,0);c.scale(-1,1);}
    if(front)nearImpulse(c,s);
    if(s.action==='volley')volley(c,s,front);
    if(front&&s.action==='project')projectAction(c,s);
    if(front&&s.action==='melee')melee(c,s);
    c.restore();
  }
  const contacts=[.86,1.075];
  window.fateField={paint,ready,setArt,setBackdrop:im=>setArt(im,null),drawCaster,actorOffset,meleeEndX,duration:times,
    events:{project:{materialized:.80},melee:{crossedGuard:.35,guardHold:[.307,.397],contact:contacts[0],contacts},volley:{contacts:[1.02,1.22,1.45]}}};
})();
