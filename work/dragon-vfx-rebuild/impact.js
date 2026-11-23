/* Energy on the incoming projectile's surface, followed by torn light faces
   and ejected stage debris. The same local coordinates drive the fallback. */
(() => {
  'use strict';
  const W=640,H=398,cx=278,cy=187,baseRadius=120,end=1.67,TAU=Math.PI*2;
  const sat=v=>Math.max(0,Math.min(1,v));
  const smooth=(a,b,t)=>{const s=sat((t-a)/(b-a));return s*s*(3-2*s);};
  const rand=n=>{const s=Math.sin(n*23.79+39.6)*3318.39;return s-Math.floor(s);};
  const surface=document.createElement('canvas');surface.width=W;surface.height=H;
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const ink=canvas.getContext('2d');
  let gl,program,ageLoc,gpuReady=false,initialised=false;
  let last=-1;
  const frag=`#version 300 es
  precision highp float;
  out vec4 result;
  uniform float age;
  float h(vec3 p){p=fract(p*vec3(.1031,.11369,.13787));p+=dot(p,p.yxz+19.19);return fract((p.x+p.y)*p.z);}
  float nz(vec3 p){vec3 c=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(h(c),h(c+vec3(1,0,0)),f.x),mix(h(c+vec3(0,1,0)),h(c+vec3(1,1,0)),f.x),f.y),
    mix(mix(h(c+vec3(0,0,1)),h(c+vec3(1,0,1)),f.x),mix(h(c+vec3(0,1,1)),h(c+vec3(1,1,1)),f.x),f.y),f.z);}
  void over(inout vec4 a,vec3 rgb,float alpha){float k=clamp(alpha,0.,1.);a=vec4(mix(a.rgb,rgb,k),a.a*(1.-k)+k);}
  float edge(float d,float scale){return exp(-abs(d)*scale);}
  float fog(vec3 p){return .61*nz(p)+.28*nz(2.1*p+8.)+.11*nz(4.2*p-4.1);}
  void main(){
    // The projectile's centre and projected radii define this coordinate
    // system. Everything begins on the skin of that same incoming sphere.
    vec2 p=(gl_FragCoord.xy-vec2(278.,211.))/120.;
    float t=age;
    float erupt=smoothstep(.21,.53,t), tear=smoothstep(.41,.84,t);
    float dying=smoothstep(.78,1.26,t), crest=exp(-pow((t-.37)/.21,2.));
    vec2 d=p-vec2(.15*erupt,.035*erupt);
    vec2 shape=vec2(1.+.29*erupt,1.+.08*erupt);
    vec2 v=d/shape;
    float a=atan(v.y,v.x),r=length(v);
    vec3 dir=vec3(v,sqrt(max(0.,1.-r*r)));
    float sea=fog(dir*4.8+vec3(.56*t,-2.2*t,t));
    float broad=fog(vec3(cos(a)*4.7,sin(a)*4.7,1.7*t));
    float rag=(broad-.49)*(.027+.30*erupt)+.024*erupt*sin(13.*a-t*8.);
    float rd=r-1.-rag;
    // The pressure travels from the opponent-facing edge back across the ball.
    float sweep=1.-smoothstep(-.04,.07,1.-clamp(v.x,-1.,1.)-2.28*smoothstep(0.,.34,t));
    float bodyLife=(1.-smoothstep(.70,.98,t))*smoothstep(.03,.29,t);
    float peel=fog(vec3(v*3.9+vec2(-1.1*t,-2.6*t),t));
    float holes=smoothstep(.03,.21,peel+.57-1.20*tear+.20*sin(a*3.+t));
    float body=sweep*bodyLife*holes*(1.-smoothstep(-.018,.014,rd))*smoothstep(-1.04,-.94,p.y);
    vec4 outp=vec4(0.);
    vec3 aqua=vec3(.16,.72,1.), ice=vec3(.64,.98,1.),hot=vec3(.97,1.,1.);
    float z=dir.z;
    float ang=atan(dir.x,max(.001,z));
    float land=dir.y+.17*dir.x;
    float s=land*6.7+.68*sin(ang*2.3+t*5.)+.39*sin(land*8.+ang*2.-t*6.)+.72*sea-t*3.2;
    float wisps=edge(sin(3.14159*s),3.8)*(.35+.8*sea);
    float fine=edge(sin(7.4*s+6.*sea),5.6);
    float veining=.43+.25*cos(3.*s+sea)+.32*sea;
    vec3 skin=mix(vec3(.085,.55,.85),ice,clamp(veining+.22*z,0.,1.));
    float hotSide=exp(-dot((v-vec2(.63,-.14))*vec2(2.5,2.),(v-vec2(.63,-.14))*vec2(2.5,2.)));
    skin=mix(skin,hot,clamp(.68*wisps+.26*fine+hotSide+.58*crest,0.,1.));
    // Broad torn blue-white light faces cross the fine currents during rupture.
    float stress=land+.36*sin(2.9*ang+.79+t*5.5)+.12*(sea-.45);
    float belt=edge(stress-.02,8.)+edge(stress+.57,11.)*.62;
    skin=mix(skin,hot,clamp(belt*(.45+.65*sea)+z*.16*crest,0.,1.));
    over(outp,skin,body);
    float rad=edge(rd,35.)*sweep*bodyLife;
    over(outp,ice,rad*(.63+.56*broad));
    float mantle=edge(rd-.055-.029*sin(8.*a+t*7.),14.)*smoothstep(.24,.58,broad);
    over(outp,aqua,mantle*(.27+.4*crest)*bodyLife*sweep);
    // A separate breaching light front opens toward the target. Its torn
    // gaps expose both the dark back layer and the stage as it lifts away.
    vec2 u=p-vec2(.34,.67)*dying;
    float n=fog(vec3(u*vec2(2.8,2.4)-vec2(1.4,2.1)*t,t*1.74));
    float m=nz(vec3(u*vec2(7.3,4.2)+2.4*n,t*2.8));
    // Break up the original skin into travelling sheets. The leading edge
    // curls away from the rest and leaves visible slots through the blast.
    float curl=u.y+.35*sin(2.8*u.x+4.1*t)+.21*u.x*u.x-.18*u.x+.33*(n-.50);
    float strips=sin(4.9*curl-4.4*t)+.57*sin(9.7*curl+3.*m)+.57*(n-.4);
    float edgeR=length((u-vec2(.18,.01))/vec2(1.34,1.07));
    float envelope=1.-smoothstep(.68,1.14,edgeR+.34*(n-.48));
    float insideSheet=smoothstep(-.46+1.08*dying,.10+1.03*dying,strips);
    float lit=smoothstep(-.26,.67,strips+1.4*(n-.42));
    float plate=erupt*(1.-smoothstep(.66,1.19,t))*smoothstep(-1.06,-.89,p.y);
    vec3 faceColor=mix(vec3(.17,.72,.98),hot,lit);
    over(outp,faceColor,envelope*insideSheet*plate);
    over(outp,hot,edge(strips-.19,5.)*plate*envelope*.67);
    float plumeGlow=exp(-1.9*dot(v,v))*erupt*(1.-smoothstep(.49,1.0,t));
    over(outp,ice,plumeGlow*.24);
    // Front fragments arc in front of the white core, with an irregular end.
    float frontBand=land-.05+.27*sin(2.65*ang+3.8*t)+.12*(sea-.5);
    float band=(1.-smoothstep(.022,.084,abs(frontBand)))*smoothstep(.10,.55,z);
    float cut=smoothstep(.33,.67,sea+.24*sin(ang*3.-t*3.));
    over(outp,mix(vec3(.045,.30,.47),aqua,sea),band*cut*body*.80);
    over(outp,hot,edge(frontBand+.046,80.)*cut*body*.66);
    // Two broad floor ripples run outwards. A travelling angular mask tears
    // each into crest fragments; no material remains behind the moving front.
    vec2 floorP=vec2(p.x-.51,(p.y+.96)/.195);
    float az=atan(floorP.y,floorP.x),fr=length(floorP);
    float uneven=nz(vec3(cos(az)*9.,sin(az)*9.,t*2.));
    float ringR=.10+2.10*(1.-exp(-max(0.,t-.10)*2.85));
    float groundWave=fr-ringR-.09*sin(az*3.+t)-.10*(uneven-.5);
    float floorLife=smoothstep(.11,.31,t)*(1.-smoothstep(.76,1.45,t));
    float broken=smoothstep(.25,.69,uneven+.24*cos(az*4.-t*6.));
    over(outp,aqua,edge(groundWave,13.)*broken*floorLife*.64);
    over(outp,hot,(edge(groundWave,48.)+.42*edge(groundWave+.14+.05*sin(az*7.),41.))*broken*floorLife);
    result=outp;
  }`;
  function initialise(){
    if(initialised)return;initialised=true;
    gl=surface.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:true});
    if(!gl)return;
    const vert='#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}';
    program=gl.createProgram();
    for(const [type,source] of [[gl.VERTEX_SHADER,vert],[gl.FRAGMENT_SHADER,frag]]){
      const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('命中材质 '+gl.getShaderInfoLog(shader));
      gl.attachShader(program,shader);gl.deleteShader(shader);
    }
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);ageLoc=gl.getUniformLocation(program,'age');gpuReady=true;
  }
  const stones=Array.from({length:137},(_,i)=>{
    // Fractures in the tiles eject clusters. The front lip sends the largest
    // slabs up before their small siblings clear the sphere.
    const group=i%11,az=TAU*rand(group*13+2)+(rand(i+21)-.5)*.54;
    return {az,z:Math.sin(az),offset:12+38*rand(group+15)+12*rand(i),
      born:.09+.38*rand(group+172)+.09*rand(i),life:.41+.80*rand(i+323),
      size:i%9===0?4.5+6*rand(i+8):.8+3.5*rand(i+81)**2,
      lift:27+138*rand(group+2)*(.47+.65*rand(i+9)),speed:76+105*rand(i+29),
      spin:(rand(i+9)-.5)*9,seed:i};
  });
  function groundDebris(c,t,front){
    for(const s of stones){
      if((s.z>0)!==front)continue;
      const age=t-s.born,u=age/s.life;if(u<=0||u>=1)continue;
      const rr=s.offset+s.speed*age;
      const x=348+Math.cos(s.az)*rr+age*35,y=307+s.z*rr*.105-4*s.lift*u*(1-u);
      const sz=s.size*(.81+.18*s.z);c.save();c.translate(x,y);c.rotate(s.spin*age+s.az);
      c.globalAlpha=smooth(0,.065,u)*(1-smooth(.68,1,u));
      const wide=.68+.7*rand(s.seed+20),height=.56+.64*rand(s.seed+48);c.scale(wide,height);
      c.beginPath();c.moveTo(-sz,-sz*.16);c.lineTo(-sz*.27,-sz*1.11);c.lineTo(sz*.67,-sz*.77);
      c.lineTo(sz,sz*.22);c.lineTo(sz*.10,sz*.8);c.lineTo(-sz*.69,sz*.55);c.closePath();
      c.fillStyle=s.seed%3===0?'#1a2530':'#324150';c.fill();
      c.beginPath();c.moveTo(-sz,-sz*.16);c.lineTo(-sz*.27,-sz*1.11);c.lineTo(sz*.67,-sz*.77);
      c.lineTo(sz*.04,sz*.03);c.closePath();c.fillStyle=s.seed%4===0?'#bcf3fc':'#738e9d';c.fill();c.restore();
    }
  }
  // Broader tears are ejected with the rising blast face, the thin chips trail behind.
  const jets=[
    [308,269,-54,-204,19,.21,.77], [342,274,22,-241,24,.26,.90],
    [384,276,92,-205,15,.33,.98], [404,269,128,-132,23,.38,1.04],
    [289,273,-83,-116,9,.29,.71], [416,262,134,-65,8,.48,1.12],
    [273,257,-72,-162,8,.48,1.00], [382,244,39,-199,9,.54,1.11],
    [346,288,1,-160,7,.22,.63]
  ];
  function plumes(c,t,front){
    jets.forEach(([x,y,dx,dy,w,born,death],i)=>{
      if((i%3===0)!==front)return;
      const u=(t-born)/(death-born);if(u<=0||u>=1)return;
      const tip=Math.min(1,u*2.8),base=smooth(.19,1,u)*.94,len=Math.hypot(dx,dy);
      const nx=-dy/len,ny=dx/len,life=Math.sin(u*Math.PI)**.7;
      function ribbon(width,fill){
        const l=[],r=[];
        for(let j=0;j<=16;j++){
          const f=base+(tip-base)*j/16,g=j/16;
          const bow=Math.sin(f*Math.PI)*(.35+u*.4)*(14+7*Math.sin(i*3.1));
          const qx=x+dx*f+nx*bow,qy=y+dy*f+ny*bow;
          const scallop=.55+.29*Math.sin(f*18.-u*4.+i)+.16*Math.cos(f*39.-i);
          const half=w*width*(.03+Math.sin(Math.PI*g)**.64)*scallop;
          l.push([qx+nx*half,qy+ny*half]);r.push([qx-nx*half*.61,qy-ny*half*.61]);
        }
        c.fillStyle=fill;c.beginPath();const outline=l.concat(r.reverse());c.moveTo(...outline[0]);
        for(let j=1;j<outline.length;j++)c.lineTo(...outline[j]);c.closePath();c.fill();
      }
      c.save();c.globalAlpha=life;
      ribbon(1.65,'rgba(39,167,238,.19)');ribbon(1,'rgba(115,234,255,.79)');ribbon(.43,'rgba(246,255,255,.92)');
      c.restore();
    });
  }
  const motes=Array.from({length:91},(_,i)=>{
    const angle=(rand(i*4+71)-.5)*2.71;
    return {x:326+56*rand(i+232),y:280+16*rand(i+413),dx:Math.sin(angle)*(76+138*rand(i+207))+31,
      dy:-(48+139*rand(i+357))*Math.cos(angle),born:.26+.43*rand(i+217),life:.44+.77*rand(i+92),r:.66+1.75*rand(i+27)};
  });
  function sparks(c,t){
    c.save();c.globalCompositeOperation='lighter';
    for(const m of motes){
      const age=t-m.born,u=age/m.life;if(u<=0||u>=1)continue;
      const x=m.x+m.dx*age,y=m.y+m.dy*age+33*age*age;
      const opacity=Math.sin(Math.PI*u)**.63;
      c.globalAlpha=opacity*.23;c.fillStyle='#24a9ff';c.beginPath();c.arc(x,y,m.r*2.9,0,TAU);c.fill();
      c.globalAlpha=opacity;c.fillStyle='#a4f9ff';c.beginPath();c.arc(x,y,m.r,0,TAU);c.fill();
    }c.restore();
  }
  // The LV3 movie ends with broken horizontal sheets crossing the revealed
  // stage. Their tapered tips travel on after the spherical surface opens.
  const streamers=[
    [291,245,1,161,6.8,.67,1.21], [342,207,1,180,5.8,.72,1.35],
    [302,278,-1,141,4.7,.78,1.29], [319,176,1,168,3.5,.81,1.22],
    [358,263,1,151,3.0,.93,1.43]
  ];
  function peelingLight(c,t){
    c.save();c.globalCompositeOperation='lighter';
    streamers.forEach(([x,y,sign,length,width,born,death],i)=>{
      const u=(t-born)/(death-born);if(u<=0||u>=1)return;
      const lead=1.58*u,tail=Math.max(0,lead-.83*Math.sin(Math.PI*u)**.68);
      c.globalAlpha=Math.sin(Math.PI*u)**.60;
      const left=[],right=[];
      for(let j=0;j<=18;j++){
        const f=j/18,d=tail+(lead-tail)*f;
        const px=x+sign*d*length,py=y-13*d+6*Math.sin(7*d+i)-3*Math.sin(14*d+i);
        const half=width*Math.sin(Math.PI*f)**.73*(.64+.30*Math.cos(d*12+i));
        left.push([px,py-half]);right.push([px,py+half*.6]);
      }
      const outline=left.concat(right.reverse());
      const gradient=c.createLinearGradient(left[0][0],y,left[18][0],y);
      gradient.addColorStop(0,'rgba(21,176,251,.07)');
      gradient.addColorStop(.27,'rgba(76,219,255,.73)');gradient.addColorStop(.59,'#ccffff');gradient.addColorStop(1,'#f8ffff');
      c.fillStyle=gradient;c.beginPath();c.moveTo(...outline[0]);
      for(let j=1;j<outline.length;j++)c.lineTo(...outline[j]);c.closePath();c.fill();
    });c.restore();
  }
  function paint(t){
    const id=Math.round(t*48);
    initialise();if(!gpuReady||gl.isContextLost())return null;
    if(last===id)return canvas;last=id;t=id/48;
    ink.clearRect(0,0,W,H);groundDebris(ink,t,false);plumes(ink,t,false);
    gl.uniform1f(ageLoc,t);gl.drawArrays(gl.TRIANGLES,0,3);ink.drawImage(surface,0,0);
    plumes(ink,t,true);peelingLight(ink,t);sparks(ink,t);groundDebris(ink,t,true);return canvas;
  }
  const fallback=new Image();
  if(window.DragonImpactAtlas)fallback.src=window.DragonImpactAtlas;
  function draw(context,age,target,ground,b){
    if(age<0||age>=end)return;
    const x=b?.x??target-103,y=b?.y??ground-baseRadius;
    const rx=b?.rx??b?.r??baseRadius,ry=b?.ry??b?.r??baseRadius;
    const expansion=1.+.49*smooth(.205,.59,age);
    const sy0=(ry+(ground-y-ry)*smooth(.19,.45,age))/baseRadius;
    const sx=rx/baseRadius*expansion,sy=sy0*expansion;
    if(sy<=0||sx<=0)return;
    const left=x-cx*sx,top=y-(expansion-1.)*(ground-y)-cy*sy,frame=paint(age);
    if(frame)context.drawImage(frame,left,top,W*sx,H*sy);
    else if(fallback.naturalWidth){
      const id=Math.min(Math.ceil(end*30)-1,Math.floor(age*30));
      context.drawImage(fallback,id%6*480,Math.floor(id/6)*298,480,298,left,top,W*sx,H*sy);
    }
    if(b&&age<.27){
      const angle=Math.atan2(((b.hitY??ground-102)-y)/ry,((b.hitX??target-30)-x)/rx);
      const span=.055+1.16*smooth(.008,.21,age);
      context.save();context.globalCompositeOperation='lighter';context.globalAlpha=smooth(0,.026,age)*(1-smooth(.12,.27,age));
      context.lineCap='round';
      for(const [width,color] of [[11,'rgba(79,204,255,.32)'],[4.8,'#b9faff'],[1.9,'white']]){
        context.lineWidth=width;context.strokeStyle=color;context.beginPath();context.ellipse(x,y,rx,ry,0,angle-span,angle+span);context.stroke();
      }
      context.restore();
    }
  }
  window.DragonImpact={draw,paint,duration:end,ready:fallback.hasAttribute('src')?fallback.decode():Promise.resolve()};
})();
