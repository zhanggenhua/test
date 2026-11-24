(() => {
  'use strict';
  const width=960,height=540,ground=318;
  const legacyScene={casterX:350,targetX:680,ground};
  const look=[532,ground-73,0];
  const cameras={reference:[3,46,662,38.5],side:[0,7,750,36],reverse:[146,35,713,40]};
  const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit=a=>{const length=Math.hypot(...a);return a.map(x=>x/length);};
  const mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
  function ease(a,b,t){
    const q=Math.min(1,Math.max(0,(t-a)/(b-a)));
    return q*q*(3-2*q);
  }

  function camera(view){
    const [yaw,pitch,distance,fov]=cameras[view.camera]??cameras.reference;
    const azimuth=(view.yaw??yaw)*Math.PI/180;
    const elevation=(view.pitch??pitch)*Math.PI/180;
    const back=[Math.sin(azimuth)*Math.cos(elevation),-Math.sin(elevation),-Math.cos(azimuth)*Math.cos(elevation)];
    const eye=look.map((x,i)=>x+back[i]*distance);
    const right=unit(cross([0,-1,0],back)),up=cross(back,right);
    const viewMatrix=[right[0],up[0],back[0],0,right[1],up[1],back[1],0,right[2],up[2],back[2],0,
      -dot(right,eye),-dot(up,eye),-dot(back,eye),1];
    const near=20,far=3400,f=1/Math.tan(fov*Math.PI/360);
    const projection=[f*height/width,0,0,0,0,f,0,0,0,0,-(far+near)/(far-near),-1,0,0,-2*far*near/(far-near),0];
    const matrix=new Float32Array(16);
    for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let i=0;i<4;i++)matrix[c*4+r]+=projection[i*4+r]*viewMatrix[c*4+i];
    return {matrix,eye,right,down:up.map(v=>-v)};
  }

  const vertex=`#version 300 es
    precision highp float;
    layout(location=0) in vec3 position;
    layout(location=1) in vec3 normal;
    uniform mat4 vp;
    uniform bool floorMesh;
    uniform vec3 root,tip;
    uniform vec2 thickness;
    out vec3 world,N;
    void main(){
      if(floorMesh){world=position;N=normal;}
      else{
        vec3 axis=normalize(tip-root);
        vec3 right=normalize(cross(axis,vec3(0,0,1)));
        vec3 forward=cross(right,axis);
        world=mix(root,tip,position.y)+right*position.x*thickness.x+forward*position.z*thickness.y;
        N=mat3(right,axis,forward)*normal;
      }
      gl_Position=vp*vec4(world,1.);
    }`;
  const fragment=`#version 300 es
    precision highp float;
    uniform bool floorMesh;
    uniform vec3 base,orb,eye;
    uniform float age,power;
    in vec3 world,N;
    out vec4 color;
    ${DragonSpirit.impactLighting}
    float hash(vec2 v){return fract(sin(dot(v,vec2(59.47,79.11)))*18458.62);}
    void main(){
      vec3 offset=orb-world;
      vec3 normal=normalize(N);
      float distance2=dot(offset,offset);
      float facing=max(0.,dot(normal,normalize(offset)));
      float key=.30+.62*max(0.,dot(normal,normalize(vec3(-.46,-.84,-.37))));
      vec3 albedo=base;
      if(floorMesh){
        vec2 p=world.xz/45.,edge=abs(fract(p-.5)-.5);
        vec2 seam=1.-smoothstep(vec2(.008),.019+fwidth(p)*1.2,edge);
        float grout=max(seam.x,seam.y);
        albedo*=.88+.20*hash(floor(p))+.07*hash(floor(world.xz*1.7));
        albedo+=vec3(.066,.072,.081)*grout;
        vec2 foot=(world.xz-vec2(351.,0.))/vec2(27.,18.);
        albedo*=1.-.49*exp(-dot(foot,foot));
      }
      float bounce=power*(.20+.8*facing)*exp(-distance2/42000.);
      float distanceFade=mix(.62,1.,exp(-length(eye-world)*.00042));
      vec3 light=albedo*key*distanceFade+bounce*vec3(.082,.26,.52);
      if(floorMesh)light+=spiritGroundImpulse(offset.xz,age);
      light+=spiritImpactFlash(offset,age,facing);
      color=vec4(light,1.);
    }`;

  function createStage(gl,makeProgram,anime){
    const program=makeProgram(gl,vertex,fragment);
    const names=['vp','floorMesh','base','orb','eye','age','power','root','tip','thickness'];
    const u=Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(program,name)]));
    function upload(points){
      const vao=gl.createVertexArray();gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.STATIC_DRAW);
      for(const i of [0,1]){
        gl.enableVertexAttribArray(i);
        gl.vertexAttribPointer(i,3,gl.FLOAT,false,24,i*12);
      }
      return {vao,count:points.length/6};
    }
    const triangles=[0,1,2,0,2,3];
    const slab=[[-2200,ground,-2200],[3000,ground,-2200],[3000,ground,2200],[-2200,ground,2200]];
    const deck=upload(triangles.flatMap(i=>[...slab[i],0,-1,0]));
    const box=[
      [-.5,0,-.5],[.5,0,-.5],[.5,1,-.5],[-.5,1,-.5],
      [-.5,0,.5],[.5,0,.5],[.5,1,.5],[-.5,1,.5],
    ];
    const faces=[
      [[0,1,2,3],[0,0,-1]],[[5,4,7,6],[0,0,1]],[[4,0,3,7],[-1,0,0]],
      [[1,5,6,2],[1,0,0]],[[4,5,1,0],[0,-1,0]],[[3,2,6,7],[0,1,0]],
    ];
    const body=upload(faces.flatMap(([indices,n])=>triangles.flatMap(i=>[...box[indices[i]],...n])));
    const steel=[.33,.40,.48],trim=[.17,.23,.31],hands=[.51,.60,.67];
    const stage={frontZ:-1800,study:true};
    function segment(from,to,x,z,material){
      gl.uniform3fv(u.root,from);gl.uniform3fv(u.tip,to);
      gl.uniform2f(u.thickness,x,z);gl.uniform3fv(u.base,material);
      gl.drawArrays(gl.TRIANGLES,0,body.count);
    }
    function caster(t,scene){
      const follow=ease(2.23,2.65,t),recover=ease(3.75,4.48,t);
      const lift=ease(.08,.28,t)*(1-recover),throwing=ease(1.57,2.0,t);
      const stance=throwing*(1-recover),x=scene.casterX;
      const hip=[x-6+stance*9,ground-45+stance*5,0],chest=[hip[0]+stance*12,hip[1]-37,0];
      segment(hip,chest,21,27,steel);
      segment([chest[0]+1,chest[1]-2,0],[chest[0]+2,chest[1]-19,0],16,17,hands);
      for(const side of [-1,1]){
        const z=side*11;
        const foot=[x+side*(14+18*stance),ground-3,z*1.36];
        const knee=[(hip[0]+foot[0])*.5+8,ground-24,z];
        segment([hip[0],hip[1]+1,z*.64],knee,12,10,trim);
        segment(knee,foot,9,9,steel);
        segment([foot[0]-4,ground-2,foot[2]],[foot[0]+8,ground-5,foot[2]],5,9,trim);
        const shoulder=[chest[0],chest[1]+2,z*1.13];
        const elbow=mix([x+9,ground-56,z*1.36],[x-5,ground-103,z*2.30],lift);
        const hand=mix([x+16,ground-64,z*1.02],[x+2,ground-123,z*1.55],lift);
        const extension=throwing*(1-recover);
        segment(shoulder,mix(elbow,[x+40-11*follow,ground-71+11*follow,z*1.4],extension),8,9,steel);
        segment(mix(elbow,[x+40-11*follow,ground-71+11*follow,z*1.4],extension),
          mix(hand,[x+61-15*follow,ground-71+18*follow,z*(.58+.52*follow)],extension),7,8,hands);
      }
    }
    function target(frame){
      const x=frame.targetX, y=frame.targetGround;
      const warm=[.60,.39,.31],shade=[.27,.42,.49];
      segment([x,y-51,0],[x-4,y-79,0], 20,23,warm);
      segment([x-4,y-79,0],[x-5,y-98,0],16,17,hands);
      for(const side of [-1,1]){
        const z=side*11;
        const hip=[x,y-50,z*.64],knee=[x+side*10,y-25,z],foot=[x+side*15,y-2,z*1.13];
        const shoulder=[x-4,y-78,z],elbow=[x-14,y-66,z*1.13],hand=[x-24,y-62,z*.85];
        segment(hip,knee,12,11,trim);segment(knee,foot,10,10,shade);
        segment(shoulder,elbow,9,10,warm);segment(elbow,hand,8,8,hands);
      }
    }
    stage.draw=(time,view)=>{
      const scene=anime?view.scene:legacyScene;
      const frame=anime?DragonSpiritAnimeArena.sampleFrame(time,scene):{
        clock:time,scene,impactAge:time-2.5,ball:DragonSpirit.sample(time,scene.casterX,scene.targetX,scene.ground),
      };
      const {ball}=frame;
      Object.assign(stage,camera(view),frame);
      gl.disable(gl.CULL_FACE);gl.useProgram(program);
      gl.uniformMatrix4fv(u.vp,false,stage.matrix);gl.uniform3fv(u.eye,stage.eye);
      gl.uniform3f(u.orb,ball.x,ball.y,0);gl.uniform1f(u.age,frame.impactAge);
      gl.uniform1f(u.power,ball.glow*(.46+.55*ball.r/87));
      gl.uniform1i(u.floorMesh,1);gl.uniform3f(u.base,.190,.199,.221);
      gl.bindVertexArray(deck.vao);gl.drawArrays(gl.TRIANGLES,0,deck.count);
      gl.uniform1i(u.floorMesh,0);gl.bindVertexArray(body.vao);caster(time,scene);
      if(anime)target(frame);
    };
    return stage;
  }

  function createStudy(anime){
    let renderer,ready;
    const effect=anime?DragonSpiritAnimeArena:DragonSpirit;
    return {
      width,height,timeline:effect.timeline,
      angles(name){
        const [yaw,pitch]=cameras[name]??cameras.reference;
        return {yaw,pitch};
      },
      get duration(){return effect.duration;},
      get phases(){return anime?effect.phases:effect.impactPhases;},
      get ready(){
        return ready??=Promise.resolve().then(()=>{
          const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
          const setup=(gl,program)=>createStage(gl,program,anime);
          renderer=DragonBeamVolume.createStudy(canvas,setup,effect.buildStudyEffects,true);
          if(!renderer)throw Error('独立 3D 试验场需要 WebGL 2');
          const frame=renderer.draw(3.19,{x:0,y:0},{camera:'reference',scene:effect.layout});
          const warm=document.createElement('canvas').getContext('2d');
          warm.drawImage(frame,0,0,1,1);warm.getImageData(0,0,1,1);
        });
      },
      draw(context,time,scene,view){
        const frame=renderer?.draw(time,{x:scene.casterX,y:0},{...view,scene,
          sceneKey:[scene.casterX,scene.targetX,scene.ground,scene.scenario].join('/')});
        if(frame)context.drawImage(frame,0,0,context.canvas.width,context.canvas.height);
      },
    };
  }
  window.DragonSpiritStudy=createStudy(false);
  window.DragonSpiritAnimeStudy=createStudy(true);
})();
