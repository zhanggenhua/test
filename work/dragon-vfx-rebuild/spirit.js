(() => {
  'use strict';
  const TAU = 2 * Math.PI;
  const swing = 1.57, release = 2.0, contact = 2.50, duration = 4.80;
  const phases = [
    {t:0, name:'举手'}, {t:.48, name:'四周汇气'}, {t:1.67, name:'托球前送'},
    {t:release, name:'双掌投出'}, {t:2.23, name:'飞行'}, {t:contact, name:'球沿触敌'}, {t:2.66, name:'球体压入'},
    {t:2.88, name:'爆发峰值'}, {t:3.16, name:'冲击面破开'}, {t:3.73, name:'飞石回落'}, {t:4.53, name:'收势'},
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
    uniform mat4 vp;
    uniform vec3 center, radii;
    out vec3 sphereNormal;
    out vec2 glowPoint;
    void main() {
      if(layer==0){
        vec2 v=vec2((gl_VertexID<<1)&2,gl_VertexID&2);
        glowPoint=(v*2.-1.)*1.65;
        gl_Position=vp*vec4(center+vec3(glowPoint*radii.xy,0.),1.);
        sphereNormal=vec3(0,0,1);return;
      }
      sphereNormal=objectPosition;glowPoint=vec2(0.);
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
      gl_Position=vp*vec4(center+surface*vec3(radii.x,-radii.y,-radii.z),1.);
    }`;
  const fragment = `#version 300 es
    precision highp float;
    uniform float phase;
    uniform highp int layer;
    uniform vec4 inlets[3];
    uniform vec3 momentum;
    uniform float energy;
    in vec3 sphereNormal;
    in vec2 glowPoint;
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
      vec2 p=layer==0 ? glowPoint
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
        color=vec4(haze*glow*.72*energy,glow*.52*energy);return;
      }
      // Soft clouds and short brushes share a depth-warped domain, while
      // each hot cluster has its own position, direction, width and reach.
      vec2 heading=momentum.xy;
      float flow=momentum.z;
      float slip=dot(p,heading);
      vec2 q=p+.046*(vec2(warp,noise(vec3(p*6.1-.27*tick,.9*beat)))-.5);
      // The inner filaments shear back along the launch vector.
      q+=heading*flow*(.09+.14*slip)*(1.-smoothstep(.55,1.,r));
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
      float streaking=exp(-abs(dot(p,vec2(-heading.y,heading.x)))*10.)
        *smoothstep(-.84,-.24,slip)*(1.-smoothstep(.28,.72,slip));
      density+=streaking*.32*flow*(.65+.35*grain);
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
      color=vec4(body*(1.+.115*density)*energy,energy);
    }`;

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
  function worldOrb(gl,makeProgram,sphere){
    const pg=makeProgram(gl,vertex,fragment);
    const names=['vp','center','radii','layer','phase','inlets[0]','momentum','energy'];
    const u=Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(pg,name)]));
    const halo=gl.createVertexArray();
    return function(time,ball,stage){
      if(ball.glow<=.001)return;
      gl.useProgram(pg);
      gl.uniformMatrix4fv(u.vp,false,stage.matrix);
      gl.uniform3f(u.center,ball.x,ball.y,0);
      gl.uniform3f(u.radii,ball.rx,ball.ry,ball.r);
      gl.uniform1f(u.phase,(time%4)*TAU/4);
      gl.uniform4fv(u['inlets[0]'],captured(time));
      gl.uniform3f(u.momentum,...ball.direction,ball.flow);
      gl.uniform1f(u.energy,ball.glow);

      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.CULL_FACE);gl.depthMask(false);
      gl.bindVertexArray(halo);
      gl.uniform1i(u.layer,0);gl.drawArrays(gl.TRIANGLES,0,3);

      gl.enable(gl.CULL_FACE);gl.frontFace(gl.CCW);gl.cullFace(gl.BACK);
      gl.depthMask(ball.glow>=.995);
      gl.bindVertexArray(sphere.vao);gl.uniform1i(u.layer,1);
      gl.drawElements(gl.TRIANGLES,sphere.count,gl.UNSIGNED_SHORT,0);
      gl.depthMask(true);
    };
  }

  // Each group starts in a distinct part of the arena. Its last segment and
  // the shell response share the same entry angle and arrival time.
  const sources=[
    [75,207,2.74,47],[866,148,.22,-48],[170,322,2.40,80],
    [724,314,.54,69],[200,65,3.32,-42],[559,58,-.32,-37]
  ];
  const arrivals=[.31,.43,.51,.59,.67,.76,.86,.93,1.01,1.10,1.20,1.28,1.36,1.43,1.48];
  const packets=arrivals.map((at,i)=>{
    const [x,y,angle,arc]=sources[(i%6+Math.floor(i/6)*2)%6];
    return {x:x+(random(i+10)-.5)*49,y:y+(random(i+17)-.5)*35,
      angle:angle+(random(i+22)-.5)*.32,arc:arc+(random(i+3)-.5)*31,at,
      travel:Math.min(at-.035,.49+.19*random(i+5)),mass:.70+.88*random(i+15),seed:random(i+2)};
  });
  const totalMass=packets.reduce((n,p)=>n+p.mass,0);
  const captureDuration=.285;
  // The planted push and the free flight meet with the same velocity.
  function push(from,to,v,span,q) {
    return mix(from,to,q*q*(3-2*q))+v*span*q*q*(q-1);
  }
  function integrateBrake(speed,age,tau){
    return -speed*tau*Math.expm1(-age/tau);
  }
  function state(t,x,tx,ground) {
    const gap=tx-x, radius=Math.min(87,Math.max(38,gap*.30));
    const heldX=x+2, heldY=ground-123-radius;
    const handX=x+61,handY=ground-71;
    const castX=Math.min(x+67,tx-radius-40);
    const castY=handY-Math.sqrt(Math.max(1,radius*radius-(castX-handX)**2));
    const hitX=tx-30, hitY=ground-64;
    const endY=ground-radius-7;
    const endX=hitX-Math.sqrt(Math.max(1,radius*radius-(hitY-endY)**2));
    const flightSpan=contact-release,pushSpan=release-swing;
    const vx=(endX-castX)/flightSpan,vy=(endY-castY)/flightSpan;
    const gravity=.34*vy/flightSpan;
    const launchVY=vy-.5*gravity*flightSpan;
    const hitVY=launchVY+gravity*flightSpan;
    let cx,cy,r=radius,rx,ry,glow,flow=0;
    if(t<swing){
      const mass=packets.reduce((sum,p)=>sum+p.mass*ramp(p.at,p.at+.084,t),0)/totalMass;
      r=5+(radius-5)*Math.cbrt(mass);
      cx=heldX;
      cy=ground-123-r;
      glow=ramp(.15,.37,t);
    }else if(t<release){
      const q=(t-swing)/pushSpan;
      cx=push(heldX,castX,vx,pushSpan,q);
      cy=push(heldY,castY,launchVY,pushSpan,q);
      glow=1;
      flow=.36*ramp(.1,1,q);
    }else if(t<contact){
      const dt=t-release;
      cx=castX+vx*dt;
      cy=castY+dt*(launchVY+.5*gravity*dt);
      glow=1;
      flow=mix(.36,1,ramp(0,.14,dt));
    }else{
      const age=t-contact;
      const drop=(ground-radius-endY)+2.3;
      cx=endX+integrateBrake(vx,age,.177);
      cy=endY+integrateBrake(hitVY,age,drop/hitVY);
      const crush=ramp(.015,.145,age)*(1-.70*ramp(.16,.29,age));
      rx=radius*(1-.065*crush);ry=radius*(1-.038*crush);
      glow=1-ramp(.047,.215,age);
      flow=Math.exp(-age/.09);
    }
    const directionLength=Math.hypot(vx,vy);
    return {x:cx,y:cy,r,rx:rx??r,ry:ry??r,glow,hitX,hitY,flow,
            direction:[vx/directionLength,vy/directionLength]};
  }

  function intakePaths(x,tx,ground){
    return packets.map((p,i)=>{
      const shell=state(p.at,x,tx,ground);
      const depth=.62*(2*random(i+29)-1),plane=Math.sqrt(1-depth*depth);
      const nx=plane*Math.cos(p.angle),ny=plane*Math.sin(p.angle);
      const end=[shell.x+shell.r*nx,shell.y+shell.r*ny,shell.r*depth];
      const startZ=175*(2*random(i+73)-1);
      const dx=end[0]-p.x,dy=end[1]-p.y,length=Math.max(1,Math.hypot(dx,dy));
      const control1=[p.x+.28*dx-dy/length*p.arc,p.y+.28*dy+dx/length*p.arc,mix(startZ,end[2],.38)];
      const reach=Math.min(94,.33*length);
      const control2=[end[0]+nx*reach,end[1]+ny*reach,end[2]+depth*reach];
      return {...p,start:[p.x,p.y,startZ],end,control1,control2};
    });
  }
  function pathPoint(p,q){
    const u=q*(.61+.39*q),v=1-u;
    return p.start.map((start,i)=>v*v*v*start+3*v*v*u*p.control1[i]+3*v*u*u*p.control2[i]+u*u*u*p.end[i]);
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
  function worldFlow(gl,makeProgram){
    const pg=makeProgram(gl,`#version 300 es
      layout(location=0) in vec3 point;
      layout(location=1) in vec3 profile;
      uniform mat4 vp;
      out vec3 field;
      void main(){field=profile;gl_Position=vp*vec4(point,1.);}`,
    `#version 300 es
      precision highp float;
      in vec3 field;
      out vec4 light;
      void main(){
        float core=exp(-5.8*field.y*field.y);
        float tail=smoothstep(0.,.31,field.x);
        float amount=field.z*tail*(1.-smoothstep(.72,1.,abs(field.y)));
        light=vec4(mix(vec3(.14,.82,1.18),vec3(1.05,1.46,1.58),core*field.x)*amount,amount);
      }`);
    const vp=gl.getUniformLocation(pg,'vp'),vao=gl.createVertexArray(),buffer=gl.createBuffer();
    gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);
    gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);
    let paths=[],key='';
    return function(time,stage){
      const {casterX:x,targetX:tx,ground}=stage.scene;
      const b=stage.ball,data=[];
      function ribbon(points,width,visibility){
        const strips=points.map((p,i)=>{
          const before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)];
          const dx=after[0]-before[0],dy=after[1]-before[1],length=Math.max(.01,Math.hypot(dx,dy));
          const t=i/(points.length-1),w=width*(.11+.89*Math.sin(Math.PI*t)**.72)*(.30+.70*t);
          return [-1,1].map(edge=>[p[0]-dy/length*w*edge,p[1]+dx/length*w*edge,p[2],t,edge,visibility]);
        });
        for(let i=1;i<strips.length;i++){
          const [a,c]=strips[i-1],[b,d]=strips[i];
          data.push(...a,...b,...c,...c,...b,...d);
        }
      }
      if(time<swing){
        const current=[x,tx,ground].join('/');
        if(current!==key){paths=intakePaths(x,tx,ground);key=current;}
        for(const p of paths){
          const phase=(time-p.at)/p.travel+1;
          if(phase<=0||phase>=1.065)continue;
          const head=Math.min(1,phase);
          const tail=Math.max(0,head-(.26+.10*p.mass)*(1-ramp(1,1.065,phase)));
          if(head<=tail+.002)continue;
          const points=Array.from({length:13},(_,i)=>pathPoint(p,mix(tail,head,i/12)));
          const visibility=ramp(0,.18,phase)*(1-ramp(1.002,1.065,phase));
          ribbon(points,2.9+1.6*p.mass,visibility);
        }
      }
      const wake=ramp(release-.015,release+.09,time)*(1-ramp(contact-.04,contact+.13,time));
      if(wake>.002){
        const [ux,uy]=b.direction;
        for(let i=0;i<9;i++){
          const side=2*random(i+17)-1,delay=.036+.104*random(i+62);
          const z=(2*random(i+5)-1)*.49,across=.84*side;
          const back=Math.sqrt(Math.max(.05,1-across*across-z*z));
          const points=Array.from({length:9},(_,j)=>{
            const u=j/8,old=state(time-delay*(1-u),x,tx,ground);
            const extra=(1-u)*(9+24*random(i+19));
            return [old.x-old.r*(ux*back+uy*across)-ux*extra,
                    old.y-old.r*(uy*back-ux*across)-uy*extra,old.r*z];
          });
          ribbon(points,1.35+1.35*random(i+6),wake*(.39+.48*random(i+74)));
        }
      }
      const age=time-contact;
      if(age>=0&&age<.145){
        const gain=(.53+.47*ramp(0,.025,age))*(1-ramp(.038,.145,age));
        for(let i=0;i<5;i++){
          const turn=-.92+i*.45, length=(15+20*random(i+33))*(.61+4*age);
          const points=Array.from({length:7},(_,j)=>{
            const u=j/6;
            return [b.hitX+length*u*Math.cos(turn),b.hitY+length*u*Math.sin(turn),-4-i*4];
          });
          ribbon(points,2.3,gain);
        }
      }
      if(!data.length)return;
      gl.useProgram(pg);gl.uniformMatrix4fv(vp,false,stage.matrix);
      gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.depthMask(false);
      gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.ONE,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STREAM_DRAW);
      gl.drawArrays(gl.TRIANGLES,0,data.length/6);gl.depthMask(true);
    };
  }

  function worldEffects(gl,makeProgram){
    const sphere=sphereGeometry(gl),vp=new Float32Array(16);
    const vertexUniforms=new Map(),eye=[0,0,0];
    const geometry={
      program:(v,f)=>makeProgram(gl,v,f),sphere,
      draw(mesh){gl.bindVertexArray(mesh.vao);gl.drawElements(gl.TRIANGLES,mesh.count,mesh.type??gl.UNSIGNED_SHORT,0);},
      uniforms(program,age){
        let u=vertexUniforms.get(program);
        if(!u){u=['vp','age','eye'].map(name=>gl.getUniformLocation(program,name));vertexUniforms.set(program,u);}
        gl.useProgram(program);
        gl.uniformMatrix4fv(u[0],false,vp);gl.uniform1f(u[1],age);gl.uniform3fv(u[2],eye);
      },
    };
    const renderOrb=worldOrb(gl,makeProgram,sphere),renderFlow=worldFlow(gl,makeProgram);
    const renderVolume=SpiritVolumeBuild(gl,geometry),renderEjecta=SpiritEjectaBuild(gl,geometry);
    return (_age,stage,_hiddenLayer,opaqueDepth)=>{
      const {clock,ball,matrix}=stage,age=clock-contact;
      renderOrb(clock,ball,stage);
      renderFlow(clock,stage);
      if(age<0||age>1.67)return;
      // Impact meshes use sphere units around local (0,1,0). Transform them into the arena.
      for(let row=0;row<4;row++){
        vp[row]=matrix[row]*ball.rx;
        vp[4+row]=-matrix[4+row]*ball.ry;
        vp[8+row]=-matrix[8+row]*ball.r;
        vp[12+row]=matrix[row]*ball.x+matrix[4+row]*(ball.y+ball.ry)+matrix[12+row];
      }
      eye[0]=(stage.eye[0]-ball.x)/ball.rx;
      eye[1]=1+(ball.y-stage.eye[1])/ball.ry;
      eye[2]=-stage.eye[2]/ball.r;
      geometry.groundFront=-stage.frontZ/ball.r;
      renderEjecta(age,'stones');renderEjecta(age,'floor');renderEjecta(age,'back');
      renderVolume(age,opaqueDepth);renderEjecta(age,'front');
    };
  }

  function arenaFrame(clock,scene){
    const age=clock-contact;
    const casterPose=clock<.13?'idle':clock<.28?'raise':clock<1.86?'lift':
      clock<1.97?'drive':clock<2.23?'throw':clock<contact+1.24?'recover':'idle';
    const footOffset={idle:0,raise:1.45,lift:1.45,drive:1.78,throw:3.78,recover:.1};
    return {clock,scene,ball:state(clock,scene.casterX,scene.targetX,scene.ground),
            casterPose,casterOffset:footOffset[casterPose],casterDepth:-95,
            targetPose:age>=0&&age<1.30?'hurt':'idle',
            ambience:1-.28*ramp(.18,.83,clock)*(1-ramp(contact+.79,contact+1.60,clock))};
  }
  let ready,renderer;
  window.DragonSpirit={
    duration,phases,get realtime(){return renderer?.active??false;},
    draw(ctx,t,scene){
      if(!renderer){scene.stage(ctx);return;}
      const layer=renderer.draw(t,{x:scene.casterX,y:scene.ground},{scene});
      if(layer)ctx.drawImage(layer,0,0);
    },
    get ready(){
      return ready??=Promise.resolve().then(()=>{
        const canvas=document.createElement('canvas');canvas.width=960;canvas.height=400;
        renderer=DragonBeamVolume.createStudy(canvas,(gl,program)=>createDragonArenaStage(gl,program,arenaFrame),worldEffects,true);
      });
    },
  };
})();
