(() => {
  'use strict';
  const TAU = 2 * Math.PI;
  const release = 2.02, contact = 2.86, duration = 4.80;
  const phases = [
    {t:0, name:'举手'}, {t:.48, name:'四周汇气'}, {t:1.62, name:'托球前送'},
    {t:release, name:'双掌投出'}, {t:contact, name:'球沿触敌'}, {t:3.15, name:'球体压入'},
    {t:3.45, name:'爆发峰值'}, {t:3.55, name:'冲击面破开'}, {t:4.09, name:'飞石回落'}, {t:4.53, name:'收势'},
  ];
  const clamp = n => Math.max(0, Math.min(1, n));
  const ramp = (a,b,t) => { const q=clamp((t-a)/(b-a)); return q*q*(3-2*q); };
  const mix = (a,b,q) => a+(b-a)*q;
  const random = n => { const s = Math.sin(n*67.971+.756)*12547.907; return s-Math.floor(s); };

  // Build the orb independently from the four-second material reference.
  // Its hot patch holds at the right first, then travels across the lower half.
  const vertex = `#version 300 es
    layout(location=0) in vec3 objectPosition;
    uniform highp int layer;
    uniform float phase;
    uniform vec4 inlets[3];
    out vec3 sphereNormal;
    void main() {
      if(layer==0){
        vec2 v=vec2((gl_VertexID<<1)&2,gl_VertexID&2);
        gl_Position=vec4(v*2.-1.,0,1);sphereNormal=vec3(0,0,1);return;
      }
      sphereNormal=objectPosition;
      vec2 planar=objectPosition.xy*vec2(1.,-1.);
      vec2 unit=normalize(planar+vec2(.000001,0.));
      float angle=atan(unit.y,unit.x);
      float wave=.0035*sin(angle*7.+phase)+.0024*cos(angle*13.-phase);
      for(int i=0;i<3;i++){
        vec4 inlet=inlets[i];float age=inlet.z;
        float angular=max(0.,1.-dot(unit,inlet.xy));
        float column=exp(-angular/(.017+.077*age));
        wave+=.058*column*sin(3.14159*age)*inlet.w*cos(age*5.3);
      }
      vec3 surface=objectPosition*(1.+wave*smoothstep(.60,.97,length(planar)));
      gl_Position=vec4(surface.xy/1.65,-surface.z*.48,1.);
    }`;
  const fragment = `#version 300 es
    precision highp float;
    uniform float phase;
    uniform highp int layer;
    uniform vec4 inlets[3];
    in vec3 sphereNormal;
    out vec4 color;
    mat2 turn(float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}
    float hash3(vec3 p){
      p=fract(p*vec3(.1031,.11369,.13787)); p+=dot(p,p.yxz+19.19);
      return fract((p.x+p.y)*p.z);
    }
    float noise(vec3 p){
      vec3 c=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(mix(hash3(c),hash3(c+vec3(1,0,0)),f.x),
                     mix(hash3(c+vec3(0,1,0)),hash3(c+vec3(1,1,0)),f.x),f.y),
                 mix(mix(hash3(c+vec3(0,0,1)),hash3(c+vec3(1,0,1)),f.x),
                     mix(hash3(c+vec3(0,1,1)),hash3(c+vec3(1,1,1)),f.x),f.y),f.z);
    }
    float knot(vec2 q,vec2 center,vec2 axes,float tilt){
      vec2 v=turn(tilt)*(q-center)/axes;
      return exp(-dot(v,v));
    }
    float feather(vec2 q,vec2 root,float theta,float reach,float width,float curve,float grain){
      vec2 axis=vec2(cos(theta),sin(theta));
      vec2 delta=q-root;
      float u=dot(delta,axis)/reach;
      float v=dot(delta,vec2(-axis.y,axis.x));
      float s=clamp(u,0.,1.);
      v-=curve*s*(1.-.45*s)+.012*sin(s*5.+grain)*s;
      float taper=width*(.29+.71*sin(3.14159*pow(s,.75)));
      float brush=exp(-v*v/(taper*taper));
      float fine=exp(-abs(v/taper-.22*sin(s*9.+grain))*3.);
      return brush*(.65+.35*fine)*smoothstep(-.12,.07,u)*(1.-smoothstep(.64,1.08,u));
    }
    void main(){
      vec3 normal=normalize(sphereNormal);
      vec2 p=layer==0 ? (gl_FragCoord.xy/480.*2.-1.)*vec2(1.65,-1.65)
                      : normal.xy*vec2(1.,-1.);
      float r=length(p),ang=atan(p.y,p.x+.00001);
      vec2 unit=p/max(r,.00001);
      float z=normal.z;
      float tick=sin(phase), beat=cos(phase);
      float warp=noise(vec3(p*4.6+vec2(.31*tick,-.43*beat),.42*z));
      float rimWobble=.0035*sin(ang*7.+phase)+.0024*cos(ang*13.-phase);
      float absorbed=0., compressed=0.;
      for(int i=0;i<3;i++){
        vec4 inlet=inlets[i];
        float age=inlet.z, strength=inlet.w;
        float angular=max(0.,1.-dot(unit,inlet.xy));
        float spread=.017+.077*age;
        float column=exp(-angular/spread);
        float pulse=sin(3.14159*age)*strength;
        rimWobble+=column*pulse*(.058*cos(age*5.3));
        float wave=r-(1.-.66*age);
        absorbed+=column*pulse*exp(-wave*wave/(.009+.011*age));
        compressed+=column*pulse*exp(-(wave+.098)*(wave+.098)/(.003+.006*age));
      }
      float radius=1.+rimWobble;
      if(layer==0){
        if(r<radius-.03||r>1.65)discard;
        float outside=max(0.,r-radius);
        float hazeNoise=noise(vec3(unit*7.4+vec2(.23*tick,.34*beat),.61*tick));
        float halo=exp(-outside/(.072+.065*hazeNoise));
        float shafts=smoothstep(.38,.84,noise(vec3(unit*50.,1.2*outside+.38*tick)))*
          exp(-outside/(.111+.090*hazeNoise));
        float sparkle=noise(vec3(unit*45.,.62*tick)),filmy=0.;
        for(int i=0;i<3;i++){
          float k=float(i),bend=ang*(3.+k)+phase*.87+k*2.3;
          float edge=radius+.023+.02*k+.026*sin(bend)+.011*sin(ang*9.-phase+k);
          float arc=smoothstep(-.47,.42,cos(ang*(2.+k)+k-phase)+.32*sin(9.*ang+k));
          filmy+=exp(-abs(r-edge)*224.)*arc*(.28+.18*sparkle);
        }
        float glow=clamp(.77*halo+.22*shafts+filmy,0.,1.)*(1.-smoothstep(1.40,1.65,r));
        vec3 haze=mix(vec3(.012,.55,.83),vec3(.66,1.,1.),clamp(.45*halo+filmy+.14*shafts,0.,1.));
        color=vec4(haze*glow,glow);return;
      }
      // Soft clouds and short brushes share a depth-warped domain, while
      // each hot cluster has its own position, direction, width and reach.
      vec2 q=p+.046*(vec2(warp,noise(vec3(p*6.1-.27*tick,.9*beat)))-.5);
      float drift=smoothstep(.29,.98,phase/6.2831853);
      vec2 focus=vec2(.04-.20*drift,.075+.068*sin(phase*.75));
      vec2 disk=q-focus;
      vec2 d=turn(-.12+.29*drift)*(disk/vec2(1.,1.04));
      float density=0.;
      for(int g=0;g<4;g++){
        float f=float(g);
        vec2 center;
        float az,strength;
        if(g==0){center=vec2(.33-.42*drift,.023+.08*tick);az=.38+.68*drift;strength=.99-.17*drift;}
        else if(g==1){center=vec2(-.01-.13*drift,.34-.06*beat);az=1.71-.26*tick;strength=.89;}
        else if(g==2){center=vec2(-.36+.06*beat,-.13+.18*drift);az=3.40+.27*tick;strength=.62+.31*drift;}
        else{center=vec2(.05+.07*tick,-.31);az=-1.29+.33*beat;strength=.41+.14*drift;}
        float heat=knot(d,center,vec2(.125+.022*sin(f*3.+phase),.096+.014*f),-az);
        float mist=knot(d,center,vec2(.29,.165+.018*f),-az);
        density+=strength*(.71*heat+.30*mist);
        for(int j=0;j<8;j++){
          float k=float(j), a=hash3(vec3(f,k,1.)),b=hash3(vec3(f,k,2.));
          float theta=az+(k-3.5)*.236+(a-.5)*.31+.13*sin(phase+f+k);
          vec2 root=center+vec2(cos(theta),sin(theta))*(.024+.043*b);
          density+=strength*(.26+.39*b)*feather(d,root,theta,.15+.25*a+.04*tick,
            .018+.038*b,(a-.33)*.155+.028*sin(phase+k),k+phase);
        }
      }
      // Broken striations run along the outflow. Noise across the angular
      // coordinate splits them into uneven tufts, independent of the lobes.
      vec2 split=d+.15*(vec2(noise(vec3(d*9.4,.6*tick)),noise(vec3(d*8.3+.74,.48*beat)))-.5);
      float dist=length(split);
      float a=atan(split.y,split.x+.0001);
      float swirl=a+.36*dist+.17*sin(3.*a-4.*dist+phase)
        +.10*sin(6.*a+4.*dist+beat)+.06*(warp-.5);
      vec2 ray=vec2(cos(swirl),sin(swirl));
      float broad=noise(vec3(ray*10.+vec2(.9,-.5)*dist,.45*tick));
      float grain=noise(vec3(ray*28.+vec2(1.7,.3)*dist,3.7*dist+.5*beat));
      float broken=noise(vec3(ray*12.+dist*vec2(2.,-1.),dist*12.-.5*tick));
      float plume=smoothstep(.11,.29,dist)*(1.-smoothstep(.29+.22*broad,.51+.35*broad,dist));
      density+=plume*(.19*smoothstep(.35,.75,broad)+.58*smoothstep(.46,.77,grain)
        *smoothstep(.24,.69,broken));
      float central=1.-smoothstep(.39,.85,r+.13*(warp-.48)+.04*sin(3.*ang+phase));
      vec3 body=mix(vec3(.565,.953,.978),vec3(.785,.889,.982),central);
      body+=vec3(.075,.036,.015)*(warp-.5);
      body-=vec3(.042,.034,.015)*central*smoothstep(.48,.75,grain)*(1.-smoothstep(.33,.60,broken));
      body=mix(body,vec3(1.),clamp(density,0.,.998));

      body=mix(body,vec3(.31,.84,.97),min(.46,.49*compressed));
      body=mix(body,vec3(.985,1.,1.),min(.91,absorbed));
      float film=noise(vec3(unit*14.+p*2.6,.70*z+tick*.46));
      body+=vec3(.052,.018,.009)*(film-.39)*smoothstep(.38,.82,r);
      // A projected wavy great circle naturally disappears behind the core on
      // its far half and briefly protrudes past the rim near a tangent.
      for(int i=0;i<7;i++){
        float k=float(i),sg=i<4?1.:-1.;
        float limit=1.012+.036*hash3(vec3(k,3.,2.))+.014*sin(ang*3.+phase+k);
        float depth=sqrt(max(0.,limit*limit-r*r))*sg;
        vec3 n=vec3(p,depth);
        vec3 pole=normalize(vec3(cos(1.58*k+.24*phase),sin(1.58*k+.24*phase),.16+.22*sin(1.17*k+phase)));
        float shift=(hash3(vec3(k,1.,6.))-.5)*.68;
        float flake=dot(n,pole)-shift+(.165+.08*sin(k))*sin(dot(n,vec3(6.9,-3.2,4.5))+k+phase)
          +.088*cos(dot(n,vec3(-5.,5.,3.6))+k*.41-phase);
        float wire=exp(-abs(flake)/((i%3==0?.014:.009)*(.66+.67*warp)))*(1.-smoothstep(limit-.003,limit+.008,r));
        float show=wire*(.34+.49*smoothstep(.21,.76,warp))*(sg<0.?.48:1.);
        body=mix(body,vec3(.965,1.,1.),show*(.35+.65*smoothstep(.35,.90,r)));

      }
      float sparkle=noise(vec3(unit*45.,.62*tick));
      float rim=exp(-abs(r-.987)*mix(60.,132.,sparkle));
      body=mix(body,vec3(.94,1.,1.),rim*(.67+.33*sparkle));
      color=vec4(body,1.);
    }`;

  let orbSurface, orbGL, phaseLocation, inletLocation, layerLocation;
  let haloVAO,sphereVAO,indexCount,lastMaterialTime=-1;
  function sphereGeometry(gl){
    const rings=48,slices=96,vertices=[],indices=[];
    for(let row=0;row<=rings;row++){
      const polar=Math.PI*row/rings,sin=Math.sin(polar),z=Math.cos(polar);
      for(let col=0;col<=slices;col++){
        const angle=TAU*col/slices;
        vertices.push(sin*Math.cos(angle),sin*Math.sin(angle),z);
        if(row===rings||col===slices)continue;
        const a=row*(slices+1)+col,b=a+slices+1;
        if(row<rings-1)indices.push(a,b,b+1);
        if(row>0)indices.push(a,b+1,a+1);
      }
    }
    const vao=gl.createVertexArray();gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
    return {vao,count:indices.length};
  }
  function renderOrbSurface(time){
    const gl=orbGL;gl.uniform1f(phaseLocation,time*TAU/4);
    gl.uniform4fv(inletLocation,captured(time));gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.bindVertexArray(haloVAO);
    gl.uniform1i(layerLocation,0);gl.drawArrays(gl.TRIANGLES,0,3);
    gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
    gl.bindVertexArray(sphereVAO);gl.uniform1i(layerLocation,1);
    gl.drawElements(gl.TRIANGLES,indexCount,gl.UNSIGNED_SHORT,0);
    lastMaterialTime=time;
  }
  function initializeOrb() {
    orbSurface=document.createElement('canvas');
    orbSurface.width=orbSurface.height=480;
    const gl=orbSurface.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:true,
      depth:true,stencil:false,preserveDrawingBuffer:true});
    if(!gl) return;
    const program=gl.createProgram();
    for(const [type,text] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]) {
      const shader=gl.createShader(type);gl.shaderSource(shader,text);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program,shader);gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);haloVAO=gl.createVertexArray();
    const mesh=sphereGeometry(gl);sphereVAO=mesh.vao;indexCount=mesh.count;
    layerLocation=gl.getUniformLocation(program,'layer');
    phaseLocation=gl.getUniformLocation(program,'phase');inletLocation=gl.getUniformLocation(program,'inlets[0]');orbGL=gl;
  }

  // Each group starts in a distinct part of the arena. Its last segment and
  // the shell response share the same entry angle and arrival time.
  const sources=[
    [75,207,2.74,47],[866,148,.22,-48],[170,322,2.40,80],
    [724,314,.54,69],[200,65,3.32,-42],[559,58,-.32,-37]
  ];
  const arrivals=[.42,.53,.62,.69,.78,.86,.96,1.025,1.105,1.18,1.27,1.37,1.48,1.56,1.64];
  const packets=arrivals.map((at,i)=>{
    const [x,y,angle,arc]=sources[(i%6+Math.floor(i/6)*2)%6];
    return {x:x+(random(i+10)-.5)*49,y:y+(random(i+17)-.5)*35,
      angle:angle+(random(i+22)-.5)*.32,arc:arc+(random(i+3)-.5)*31,at,
      travel:Math.min(at-.035,.49+.19*random(i+5)),mass:.70+.88*random(i+15),seed:random(i+2)};
  });
  const totalMass=packets.reduce((n,p)=>n+p.mass,0);
  const captureDuration=.285;
  // The slope at each event belongs to both neighbouring spans. Ball
  // position and velocity therefore have a single value at release/contact.
  function hermite(from,to,v0,v1,span,q) {
    const q2=q*q,q3=q2*q;
    return (2*q3-3*q2+1)*from+(q3-2*q2+q)*span*v0+
      (3*q2-2*q3)*to+(q3-q2)*span*v1;
  }
  function tangent(a,b) { return a*b<=0?0:2*a*b/(a+b); }
  function settle(age,travel,velocity) {
    const k=6.8;
    return travel*(1-Math.exp(-k*age)*(1+(k-velocity/travel)*age));
  }
  const swing=1.605;
  function state(t,x,tx,ground) {
    const gap=tx-x, heldRadius=Math.min(85,Math.max(33,gap*.34));
    const radius=Math.min(113,Math.max(40,gap*.356));
    const hitX=tx-29.82,hitY=ground-101.85,endY=ground-radius-13;
    const endX=hitX-Math.sqrt(Math.max(1,radius*radius-(hitY-endY)**2));
    const startX=x+2,castX=Math.max(startX,Math.min(x+58,mix(startX,endX,.51)));
    const startY=ground-121-Math.sqrt(Math.max(1,heldRadius*heldRadius-19*19));
    const palmOffset=castX-(x+53);
    const castY=ground-72-Math.sqrt(Math.max(1,heldRadius*heldRadius-palmOffset*palmOffset));
    const swingSpan=release-swing,flightSpan=contact-release;
    const flightVX=(endX-castX)/flightSpan,flightVY=(endY-castY)/flightSpan;
    const releaseVX=tangent((castX-startX)/swingSpan,flightVX);
    const releaseVY=tangent((castY-startY)/swingSpan,flightVY);
    const hitVX=1.25*flightVX,hitVY=1.29*flightVY;
    let cx,cy,r,rx,ry,glow;
    if(t<release){
      const mass=packets.reduce((sum,p)=>sum+p.mass*ramp(p.at-.018,p.at+.12,t),0)/totalMass;
      r=4+(heldRadius-4)*Math.sqrt(mass);
      const gatherY=ground-121-Math.sqrt(Math.max(1,r*r-Math.min(19,r*.23)**2));
      const u=clamp((t-swing)/swingSpan);
      cx=hermite(startX,castX,0,releaseVX,swingSpan,u);
      cy=gatherY+hermite(0,castY-startY,0,releaseVY,swingSpan,u);
      glow=ramp(.26,.47,t);
    } else if(t<contact){
      const u=(t-release)/flightSpan;
      cx=hermite(castX,endX,releaseVX,hitVX,flightSpan,u);
      cy=hermite(castY,endY,releaseVY,hitVY,flightSpan,u);
      r=mix(heldRadius,radius,ramp(0,1,u));glow=1;
    } else {
      const age=t-contact;
      const depthX=Math.min(80,Math.max(32,gap*.248)),depthY=Math.min(32,radius*.30);
      cx=endX+settle(age,depthX,hitVX);cy=endY+settle(age,depthY,hitVY);
      const compression=1-Math.exp(-8.6*age)*(1+8.6*age);
      r=radius;rx=r*(1.-.085*compression);ry=r*(1.-.108*compression);
      glow=(1.-.13*ramp(.11,.20,age))*(1.-ramp(.235,.445,age));
    }
    return {x:cx,y:cy,r,rx:rx??r,ry:ry??r,glow,hitX,hitY};
  }

  function shine(ctx,x,y,r,color,aspect=1) {
    if(r<=0) return;
    ctx.save();ctx.translate(x,y);ctx.scale(1,aspect);
    const radial=ctx.createRadialGradient(0,0,0,0,0,r);
    radial.addColorStop(0,color); radial.addColorStop(1,'rgba(72,202,255,0)');
    ctx.fillStyle=radial;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();
  }
  function pathPoint(p,orb,q) {
    const entryX=orb.x+orb.r*Math.cos(p.angle),entryY=orb.y+orb.r*Math.sin(p.angle);
    const dx=entryX-p.x,dy=entryY-p.y,length=Math.max(1,Math.hypot(dx,dy));
    const nx=-dy/length,ny=dx/length;
    const u=q*(.42+.58*q), bend=p.arc*Math.sin(Math.PI*u)+
      12*Math.sin(2*Math.PI*u+p.seed*2)*Math.sin(Math.PI*u);
    return [p.x+dx*u+nx*bend,p.y+dy*u+ny*bend];
  }
  function drawIntake(ctx,t,orb) {
    if(t<.03 || t>1.72)return;
    ctx.save();
    for(const p of packets){
      const u=(t-p.at)/p.travel+1;
      if(u<=0||u>1.065)continue;
      const head=Math.min(1,u),tail=Math.max(0,head-(.26+.10*p.mass)*(1-ramp(1,1.065,u)));
      if(head<=tail+.002)continue;
      const knots=[];
      for(let i=0;i<=12;i++)knots.push(pathPoint(p,orb,mix(tail,head,i/12)));
      const first=knots[0],last=knots[12];
      const tint=ctx.createLinearGradient(...first,...last);
      tint.addColorStop(0,'#49c9ff00');tint.addColorStop(.33,'#4bb9ff90');
      tint.addColorStop(.74,'#7bdfffed');tint.addColorStop(.94,'#f6ffff');tint.addColorStop(1,'#aaffff');
      const opacity=ramp(0,.20,u)*(1-ramp(1.002,1.065,u));
      ctx.globalAlpha=opacity;ctx.fillStyle=tint;
      // Ribbon width tapers separately at the two ends, leaving a broad
      // luminous shoulder and a fine crest which can be read at game scale.
      const left=[],right=[];
      for(let i=0;i<=12;i++){
        const q=i/12,prev=knots[Math.max(0,i-1)],next=knots[Math.min(12,i+1)];
        const dx=next[0]-prev[0],dy=next[1]-prev[1],norm=Math.max(.001,Math.hypot(dx,dy));
        const w=(3.9+2.45*p.mass)*Math.sin(Math.PI*q)**.75*(.22+.98*q);
        left.push([knots[i][0]-dy/norm*w,knots[i][1]+dx/norm*w]);
        right.push([knots[i][0]+dy/norm*w*.62,knots[i][1]-dx/norm*w*.62]);
      }
      ctx.beginPath();ctx.moveTo(...left[0]);for(const xy of left.slice(1))ctx.lineTo(...xy);
      for(let i=12;i>=0;i--)ctx.lineTo(...right[i]);ctx.closePath();ctx.fill();
      const trace=ctx.createLinearGradient(...first,...last);
      trace.addColorStop(0,'#f3ffff00');trace.addColorStop(.63,'#e5ffff75');trace.addColorStop(1,'#ffffff');
      ctx.lineWidth=1.6+.47*p.mass;ctx.strokeStyle=trace;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(...first);
      for(const xy of knots.slice(1))ctx.lineTo(...xy);ctx.stroke();
      if(p.mass>1.02){
        ctx.globalAlpha=.72*opacity;ctx.lineWidth=1.35+.5*p.mass;ctx.beginPath();ctx.moveTo(...first);
        for(let i=1;i<=12;i++){
          const q=i/12,splay=(5+3*p.mass)*Math.sin(Math.PI*q)*Math.sin(4.1*q+p.seed*6+.7*t);
          ctx.lineTo(knots[i][0]+splay*.35,knots[i][1]+splay);
        }
        ctx.stroke();
      }
      ctx.globalAlpha=opacity;
      shine(ctx,last[0],last[1],9+p.mass*3.3,'#c7ffffb9');
    }
    ctx.restore();
  }
  function captured(t) {
    const data=new Float32Array(12);
    let at=0;
    for(let i=packets.length-1;i>=0&&at<12;i--){
      const p=packets[i],u=(t-p.at)/captureDuration;
      if(u<0 || u>=1)continue;
      data.set([Math.cos(p.angle),Math.sin(p.angle),u,p.mass/1.42],at);at+=4;
    }
    return data;
  }
  function paintOrb(ctx,t,b) {
    if(b.glow<=0) return;
    if(!orbSurface) initializeOrb();
    const time=t%4;
    ctx.save();ctx.globalAlpha*=b.glow;
    if(orbGL && !orbGL.isContextLost()) {
      if(time!==lastMaterialTime)renderOrbSurface(time);
      const w=b.rx*1.65,h=b.ry*1.65;
      ctx.drawImage(orbSurface,b.x-w,b.y-h,2*w,2*h);
    } else {
      const ph=time*TAU/4, drift=ramp(.29,.98,time/4);
      ctx.translate(b.x,b.y);ctx.scale(b.rx,b.ry);
      const halo=ctx.createRadialGradient(0,0,.96,0,0,1.46);
      for(const [pos,col] of [[0,'#dcffff'],[.09,'#8bffffcf'],[.25,'#44daff7f'],[.53,'#259cde30'],[1,'#1685ae00']])
        halo.addColorStop(pos,col);
      ctx.fillStyle=halo;ctx.fillRect(-1.46,-1.46,2.92,2.92);
      const g=ctx.createRadialGradient(-.025,.045,.1,0,0,1.01);
      g.addColorStop(0,'#cde6fc');g.addColorStop(.48,'#c8e5fc');
      g.addColorStop(.82,'#a6f6fb');g.addColorStop(.965,'#93f5f9');g.addColorStop(1,'#e2ffff');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,1,0,TAU);ctx.fill();
      const clusters=[
        [.35-.54*drift,.10+.07*Math.sin(ph),.39+.68*drift,.91],
        [-.015-.19*drift,.38,1.71,.83],[-.31-.10*drift,-.065+.18*drift,3.42,.61+.23*drift],
        [.07+.05*Math.sin(ph),-.24,-1.29,.39]
      ];
      for(let i=0;i<clusters.length;i++){
        const [x,y,az,energy]=clusters[i];
        const bloom=ctx.createRadialGradient(x,y,0,x,y,.27);
        bloom.addColorStop(0,'rgba(255,255,255,'+energy+')');bloom.addColorStop(.5,'rgba(255,255,255,'+energy*.44+')');
        bloom.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=bloom;
        ctx.fillRect(x-.27,y-.27,.54,.54);
        for(let j=0;j<12;j++){
          const id=i*23+j,theta=az+(j-5.4)*.186+(random(id+1)-.5)*.24+.11*Math.sin(ph+j);
          const len=.14+.24*random(id+8),wid=.012+.032*random(id+2),bend=(random(id+15)-.38)*.14;
          ctx.save();ctx.translate(x+.023*Math.cos(theta),y+.023*Math.sin(theta));ctx.rotate(theta);
          const paint=ctx.createLinearGradient(0,0,len,0);
          paint.addColorStop(0,'rgba(255,255,255,'+energy*.48+')');
          paint.addColorStop(.52,'rgba(255,255,255,'+energy*.42+')');paint.addColorStop(1,'rgba(255,255,255,0)');
          ctx.fillStyle=paint;ctx.beginPath();ctx.moveTo(-.06,0);
          ctx.bezierCurveTo(.22*len,-wid,len*.68,bend-wid,len,bend*1.16);
          ctx.bezierCurveTo(len*.60,bend+wid*.49,len*.19,wid,-.06,0);ctx.fill();ctx.restore();
        }
      }
      const centerX=.04-.20*drift,centerY=.075+.068*Math.sin(ph*.75);
      for(let i=0;i<98;i++){
        const az=TAU*random(i+73), inner=.13+.29*random(i+18), outer=inner+.09+.25*random(i+67);
        const bend=.13*Math.sin(ph+i)+.20*(random(i+49)-.5),w=.005+.013*random(i+38);
        ctx.save();ctx.translate(centerX,centerY);ctx.rotate(az);
        const paint=ctx.createLinearGradient(inner,0,outer,0);
        paint.addColorStop(0,'#eff7ff00');paint.addColorStop(.42,'rgba(255,255,255,'+(.19+.28*random(i+7))+')');
        paint.addColorStop(1,'#eff7ff00');ctx.fillStyle=paint;ctx.beginPath();ctx.moveTo(inner,0);
        ctx.bezierCurveTo(inner+.07,-w,outer-.10,bend*.4,outer,bend);
        ctx.bezierCurveTo(outer-.105,bend*.4+w,inner+.065,w,inner,0);ctx.fill();ctx.restore();
      }
      for(let i=0;i<12;i++){
        const a=i*.91+ph*.19, off=(random(i+27)-.5)*.50, start=-.14+2.4*random(i+33);
        ctx.beginPath();ctx.lineWidth=.005+.008*random(i+5);ctx.strokeStyle='rgba(235,255,255,'+(.19+.22*random(i+2))+')';
        for(let j=0;j<=48;j++){
          const k=start+(1.65+1.35*random(i+19))*j/48;
          const side=off+.42*Math.sin(k+.7*i)+.135*Math.sin(k*5.+i+ph);
          const u=1.026*Math.cos(k),v=side*Math.sin(k);
          const x=u*Math.cos(a)-v*Math.sin(a),y=u*Math.sin(a)+v*Math.cos(a);
          if(j)ctx.lineTo(x,y);else ctx.moveTo(x,y);
        }
        ctx.stroke();
      }
      const responses=captured(t);
      for(let i=0;i<responses.length;i+=4){
        const u=responses[i+2],power=responses[i+3]*Math.sin(u*Math.PI);
        if(power<=0)continue;
        const dist=1.-.62*u,cx=responses[i]*dist,cy=responses[i+1]*dist;
        const local=ctx.createRadialGradient(cx,cy,0,cx,cy,.28);
        local.addColorStop(0,'rgba(255,255,255,'+Math.min(.82,power)+')');local.addColorStop(1,'#cfffff00');
        ctx.fillStyle=local;ctx.fillRect(cx-.28,cy-.28,.56,.56);
      }
      ctx.lineWidth=.012;ctx.strokeStyle='#e6ffffe6';ctx.beginPath();ctx.arc(0,0,.982,0,TAU);ctx.stroke();
      for(let i=0;i<17;i++){
        const a=TAU*random(i+28)+.125*Math.sin(i+ph);
        ctx.beginPath();ctx.strokeStyle='rgba(170,253,255,'+(.33+.30*random(i+12))+')';
        ctx.lineWidth=.006+.005*random(i+8);ctx.ellipse(0,0,1.012+.052*random(i+4),.987+.049*random(i+32),a,a,a+.18+.84*random(i+5));ctx.stroke();
      }
    }
    ctx.restore();
  }

  function palmContact(ctx,t,origin,ground,pose,orb) {
    const power=ramp(1.970,2.015,t)*(1-ramp(2.14,2.25,t));
    if(!power)return;
    const palms=pose==='drive'?[[50.8,-71.2],[52.1,-55.6]]:[[60.0,-76.4],[61.3,-60.8]];
    ctx.save();ctx.globalAlpha=power;
    for(const [ox,oy] of palms){
      const x=origin+ox,y=ground+oy,dx=x-orb.x,dy=y-orb.y;
      const ratio=Math.hypot(dx/orb.rx,dy/orb.ry);
      if(ratio<.96)continue;
      const ex=orb.x+dx/ratio,ey=orb.y+dy/ratio,d=Math.hypot(ex-x,ey-y);
      if(d>30)continue;
      shine(ctx,x,y,6.3,'#a4ffffcb');
      if(d<1.2)continue;
      const shear=ctx.createLinearGradient(x,y,ex,ey);
      shear.addColorStop(0,'#edffffea');shear.addColorStop(.40,'#8ce7ffc7');shear.addColorStop(1,'#c0ffff28');
      ctx.fillStyle=shear;ctx.beginPath();ctx.moveTo(x-1.2,y);
      ctx.quadraticCurveTo(x+(ex-x)*.62-2,y+(ey-y)*.46,ex-3.5,ey-1.2);
      ctx.quadraticCurveTo(ex,ey+1.4,x+1.2,y+.6);ctx.fill();
    }
    ctx.restore();
  }
  function impact(ctx,t,tx,ground,b) {
    window.DragonImpact.draw(ctx,t-contact,tx,ground,b);
  }
  function draw(ctx,t,scene) {
    const x=scene.casterX??390, tx=scene.targetX??680, ground=scene.ground??318;
    const b=state(t,x,tx,ground), age=t-contact;
    ctx.save();
    scene.stage(ctx);
    const dim=ramp(.18,.83,t)*(1-ramp(contact+.79,contact+1.56,t));
    ctx.fillStyle='rgba(10,16,47,'+((.32+.14*ramp(0,.16,age))*dim)+')';ctx.fillRect(0,0,960,400);
    if(b.glow>0) {
      ctx.save();ctx.globalAlpha=.20*b.glow;shine(ctx,b.x,ground+2,b.r*2.07,'#9affff',.19);ctx.restore();
    }
    drawIntake(ctx,t,b);
    const pose=t<.13?'idle':t<.28?'raise':t<1.80?'lift':t<1.970?'raise':
      t<2.117?'drive':t<2.53?'throw':t<2.625?'drive':t<contact+.89?'recover':'idle';
    // Rear shoe centers measured on row 712 of the approved 720px frames.
    const footOffset={idle:0,raise:1.45,lift:1.45,drive:1.78,throw:3.78,recover:.1};
    const recoil=10*ramp(.16,.47,age)+4*ramp(.46,.72,age);
    const hurt=age>.037&&age<1.27;
    scene.fighter(ctx,'target',tx+recoil+(hurt?.20:0),hurt?'hurt':'idle',{});
    paintOrb(ctx,t,b);
    const caster=x+footOffset[pose];
    scene.fighter(ctx,'caster',caster,pose,{});
    palmContact(ctx,t,caster,ground,pose,b);
    if(age>0 && age<.75) {
      const light=ramp(0,.095,age)*(1-ramp(.15,.75,age));
      ctx.fillStyle='rgba(155,229,249,'+(.16*light)+')';ctx.fillRect(0,0,960,400);
      ctx.save();ctx.globalAlpha=.41*light;shine(ctx,tx,ground-67,422,'#e3feff');ctx.restore();
      const pointFlash=ramp(0,.048,age)*(1-ramp(.082,.22,age));
      ctx.save();ctx.globalAlpha=.66*pointFlash;shine(ctx,b.hitX+8*ramp(0,.18,age),b.hitY,37,'#e6feff');ctx.restore();
    }
    impact(ctx,t,tx,ground,b);
    ctx.restore();
  }
  let ready;
  function warmOrb() {
    const scratch=document.createElement('canvas');
    scratch.width=scratch.height=32;
    const ctx=scratch.getContext('2d');
    paintOrb(ctx,0,{x:16,y:16,r:10,rx:10,ry:10,glow:1});
    // Await the first real material draw and compositing copy before playback.
    ctx.getImageData(16,16,1,1);
  }
  window.DragonSpirit = {duration,phases,draw,get ready(){
    return ready??=Promise.all([window.DragonImpact.ready,Promise.resolve().then(warmOrb)]);
  }};
})();
