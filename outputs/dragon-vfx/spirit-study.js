(() => {
  'use strict';
  const width=960,height=540,ground=318;
  const scene={casterX:350,targetX:680,ground};
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
      float hit=smoothstep(0.,.18,age)*(1.-smoothstep(.72,1.86,age));
      float flash=smoothstep(.08,.16,age)*(1.-smoothstep(.24,.39,age));
      float r=length(offset.xz);
      vec3 scatter=vec3(0.);
      if(floorMesh){
        bounce+=hit*(.17+.46*exp(-pow((r-109.-27.*age)/69.,2.)))*exp(-r*r/38000.);
        float push=1.-exp(-max(0.,age-.014)*6.8);
        float phase=smoothstep(.014,.085,age)*(1.-smoothstep(.27,.61,age));
        float angle=atan(offset.z,offset.x);
        float split=.88+.21*sin(3.*angle+age*6.)+.16*sin(5.*angle-age*7.);
        float radius=(242.+21.*cos(3.*angle-age*3.2)+11.*sin(angle*7.))*push;
        float ridge=exp(-pow((r-radius)/(14.+33.*push),2.));
        float wash=.64*exp(-r*r/35800.)+ridge*split*.87;
        bounce+=phase*.77*wash;
        float radial=pow(.5+.5*sin(angle*7.2+sin(angle*4.)*.85),4.);
        float splitRay=radial*exp(-pow((r-radius+41.)/(45.+15.*push),2.));
        scatter=vec3(.44,.56,.69)*phase*(.24*wash+.30*splitRay);
      }
      float distanceFade=mix(.62,1.,exp(-length(eye-world)*.00042));
      vec3 light=albedo*key*distanceFade+bounce*vec3(.082,.26,.52)+scatter;
      light+=flash*vec3(.24,.40,.59)*(.31+.69*facing)*exp(-distance2/41000.);
      color=vec4(light,1.);
    }`;

  function createStage(gl,makeProgram,sample){
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
    function caster(t){
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
    stage.draw=(time,view)=>{
      const ball=sample(time,scene.casterX,scene.targetX,scene.ground);
      Object.assign(stage,camera(view),{clock:time,scene,ball});
      gl.disable(gl.CULL_FACE);gl.useProgram(program);
      gl.uniformMatrix4fv(u.vp,false,stage.matrix);gl.uniform3fv(u.eye,stage.eye);
      gl.uniform3f(u.orb,ball.x,ball.y,0);gl.uniform1f(u.age,time-2.5);
      gl.uniform1f(u.power,ball.glow*(.46+.55*ball.r/87));
      gl.uniform1i(u.floorMesh,1);gl.uniform3f(u.base,.190,.199,.221);
      gl.bindVertexArray(deck.vao);gl.drawArrays(gl.TRIANGLES,0,deck.count);
      gl.uniform1i(u.floorMesh,0);gl.bindVertexArray(body.vao);caster(time);
    };
    return stage;
  }

  let renderer,ready;
  window.DragonSpiritStudy={
    width,height,
    angles(name){
      const [yaw,pitch]=cameras[name]??cameras.reference;
      return {yaw,pitch};
    },
    get duration(){return DragonSpirit.duration;},
    get phases(){
      const phases=[...DragonSpirit.phases,{t:2.701,name:'撞地爆闪'},{t:4.1,name:'贴地旋涡'}];
      return phases.sort((a,b)=>a.t-b.t);
    },
    get ready(){
      return ready??=Promise.resolve().then(()=>{
        const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
        const setup=(gl,program)=>createStage(gl,program,DragonSpirit.sample);
        renderer=DragonBeamVolume.createStudy(canvas,setup,DragonSpirit.buildStudyEffects,true);
        if(!renderer)throw Error('独立 3D 试验场需要 WebGL 2');
        const frame=renderer.draw(3.19,{x:0,y:0},{camera:'reference'});
        const warm=document.createElement('canvas').getContext('2d');
        warm.drawImage(frame,0,0,1,1);warm.getImageData(0,0,1,1);
      });
    },
    draw(context,time,_scene,view){
      const frame=renderer?.draw(time,{x:0,y:0},view);
      if(frame)context.drawImage(frame,0,0,context.canvas.width,context.canvas.height);
    },
  };
})();
