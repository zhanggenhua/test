(() => {
  'use strict';
  const subtract=(a,b)=>a.map((v,i)=>v-b[i]);
  const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit=a=>{const length=Math.hypot(...a);return a.map(v=>v/length);};
  const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  const smooth=(a,b,t)=>{const v=Math.min(1,Math.max(0,(t-a)/(b-a)));return v*v*(3-2*v);};

  function perspective(eye,look,fov,shift){
    const z=unit(subtract(eye,look)),x=unit(cross([0,-1,0],z)),y=cross(z,x);
    const view=[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];
    const near=30,far=3700,f=1/Math.tan(fov*Math.PI/360);
    const project=[f/(852/480),0,0,0,0,f,0,0,-shift[0],-shift[1],-(far+near)/(far-near),-1,0,0,-2*far*near/(far-near),0];
    const matrix=new Float32Array(16);
    for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(let i=0;i<4;i++)matrix[a*4+b]+=project[i*4+b]*view[a*4+i];
    return matrix;
  }

  const vert=`#version 300 es
    precision highp float;
    layout(location=0) in vec3 vertex;
    layout(location=1) in vec3 normal;
    uniform mat4 view;
    uniform vec3 jointA,jointB;
    uniform float width;
    uniform bool slab;
    out vec3 place,N;
    void main(){
      if(slab){place=vertex;N=normal;}
      else{
        vec3 axis=normalize(jointB-jointA),side=normalize(cross(axis,vec3(0.,0.,1.))),front=cross(side,axis);
        place=mix(jointA,jointB,vertex.y)+width*(side*vertex.x+front*vertex.z);
        N=mat3(side,axis,front)*normal;
      }
      gl_Position=view*vec4(place,1.);
    }`;
  const frag=`#version 300 es
    precision highp float;
    uniform vec3 base,emitter;
    uniform float age;
    uniform bool slab;
    in vec3 place,N;
    out vec4 color;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*18764.686);}
    void main(){
      vec3 n=normalize(N);
      float key=max(0.,dot(n,normalize(vec3(.30,-.82,-.48))));
      float charge=smoothstep(-2.21,-1.72,age)*(1.-smoothstep(1.63,1.84,age));
      float flash=exp(-pow((age-.042)/.078,2.));
      vec3 lightDelta=place-emitter;
      float source=(.26+.75*flash)*charge*exp(-dot(lightDelta,lightDelta)/18200.);
      float axisDist=length(place.yz);
      float spill=(1.-smoothstep(1.63,1.79,age))*smoothstep(0.,.1,age)
            *exp(-axisDist*axisDist/15600.)*exp(-max(0.,place.x)/980.)*smoothstep(-30.,20.,place.x);
      vec3 c=base*(.57+.48*key);
      if(slab){
        vec2 tile=place.xz/93.,f=fract(tile);
        vec2 edge=min(f,1.-f);
        vec2 w=fwidth(tile);
        float lines=min(smoothstep(0.,w.x*.84+.003,edge.x),smoothstep(0.,w.y*.84+.003,edge.y));
        float grit=hash(floor(place.xz*1.31));
        c*=mix(.58,.94+.18*hash(floor(tile)),lines)*(.93+.12*grit);
        vec2 d=(place.xz-vec2(-61.,6.))/vec2(57.,37.);
        c*=1.-.57*exp(-dot(d,d));
      }
      c+=vec3(.11,.235,.39)*(source+.52*spill)*(.54+.46*key);
      color=vec4(c,1.);
    }`;
  const plank=[[-900,80,-1050],[-900,80,745],[1730,80,745],[1730,80,-1050]];
  function studio(gl,program){
    const pg=program(gl,vert,frag);
    const u=Object.fromEntries(['view','base','age','jointA','jointB','width','slab','emitter'].map(n=>[n,gl.getUniformLocation(pg,n)]));
    function mesh(points){
      const vao=gl.createVertexArray();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.STATIC_DRAW);
      for(const [i,offset] of [[0,0],[1,12]]){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,24,offset);}
      return {vao,count:points.length/6};
    }
    const floor=mesh([0,1,2,2,3,0].flatMap(i=>[...plank[i],0,-1,0]));
    const cube=[
      [-.5,0,-.5],[.5,0,-.5],[.5,1,-.5],[-.5,1,-.5],
      [-.5,0,.5],[.5,0,.5],[.5,1,.5],[-.5,1,.5],
    ];
    const faces=[
      [[0,1,2,3],[0,0,-1]],[[5,4,7,6],[0,0,1]],[[4,0,3,7],[-1,0,0]],
      [[1,5,6,2],[1,0,0]],[[4,5,1,0],[0,-1,0]],[[3,2,6,7],[0,1,0]],
    ];
    const block=mesh(faces.flatMap(([surface,n])=>[0,1,2,2,3,0].flatMap(i=>[...cube[surface[i]],...n])));
    const base=[.24,.32,.35],joint=[.34,.43,.46],pad=[.14,.22,.27];
    const cameraAngles={
      reference:{eye:[565,-179,-540],look:[196,-50,0],fov:38,shift:[.040,.175]},
      side:{eye:[268,-27,-980],look:[268,5,0],fov:38},
      demo:{eye:[586.48,-279.00,-542.08],look:[-7.23,264.17,51.63],fov:60},
    };
    const out={matrix:null,eye:null,anchor:null,draw(time,view){
      const cam=cameraAngles[view.camera]||cameraAngles.reference;
      out.eye=cam.eye;
      out.matrix=perspective(cam.eye,cam.look,cam.fov,cam.shift??[0,0]);
      const push=smooth(2.27,2.40,time)*(1.-smooth(4.13,4.26,time));
      out.anchor=lerp([-57,13,0],[-2,0,0],push);
      gl.useProgram(pg);gl.uniformMatrix4fv(u.view,false,out.matrix);gl.uniform1f(u.age,time-2.4);
      gl.uniform3fv(u.emitter,out.anchor);
      gl.uniform1i(u.slab,1);gl.uniform3fv(u.base,[.205,.228,.266]);
      gl.bindVertexArray(floor.vao);gl.drawArrays(gl.TRIANGLES,0,floor.count);
      gl.uniform1i(u.slab,0);gl.bindVertexArray(block.vao);
      function segment(a,b,w,c){
        gl.uniform3fv(u.jointA,a);gl.uniform3fv(u.jointB,b);gl.uniform1f(u.width,w);gl.uniform3fv(u.base,c);
        gl.drawArrays(gl.TRIANGLES,0,block.count);
      }
      const waist=lerp([-57,30,0],[-53,31,0],push);
      const head=lerp([-67,-19,0],[-48,-16,0],push);
      segment([-100,78,9],[-77,50,8],12,pad);segment([-77,50,8],waist,13,base);
      segment(waist,[-35,54,-8],14,base);segment([-35,54,-8],[-29,78,-9],11,pad);
      segment(waist,lerp([-60,-12,0],[-46,-12,0],push),21,base);
      segment(head,[head[0],head[1]-16,head[2]],15,joint);
      for(const z of [-9,9]){
        const shoulder=lerp([-62,-7,z],[-47,-7,z],push);
        const elbow=lerp([-44,13,z],[-24,6,z],push);
        const hand=[out.anchor[0],out.anchor[1],z*(.8-.38*push)];
        segment(shoulder,elbow,8,base);segment(elbow,hand,7,joint);
      }
    }};
    return out;
  }

  let renderer, sourceMaterials=false;
  const duration=128/30;
  window.DragonBeamStudy={
    duration,
    phases:[
      {t:0,name:'准备'},{t:.633,name:'汇入掌心'},{t:2.233,name:'前送'},{t:2.4,name:'第一股离手'},
      {t:2.433,name:'展开'},{t:2.767,name:'缠束与冲圈'},{t:3.167,name:'持续'},{t:4.133,name:'残束'},{t:4.2,name:'退场'},
    ],
    get sourceMaterials(){return sourceMaterials;},
    get ready(){
      return Promise.resolve().then(async()=>{
        if(renderer!==undefined)return;
        const canvas=document.createElement('canvas');canvas.width=1278;canvas.height=720;
        const wantsSource=!new URLSearchParams(location.search).has('procedural-study');
        const createSource=wantsSource?await window.loadDragonSourceMeshes():null;
        sourceMaterials=!!createSource;
        renderer=window.DragonBeamVolume.createStudy(canvas,studio,createSource??window.createDragonBeamStudyEffects,sourceMaterials);
        if(!renderer)throw Error('3D 试验场需要 WebGL 2');
        const warm=renderer.draw(2.767,{x:0,y:0},{camera:'reference'});
        const read=document.createElement('canvas');read.width=read.height=2;
        const c=read.getContext('2d');c.drawImage(warm,0,0,2,2);c.getImageData(0,0,1,1);
      });
    },
    draw(c,time,_scene,view){
      const rendered=renderer?.draw(time,{x:0,y:0},view);
      if(rendered){c.imageSmoothingQuality='high';c.drawImage(rendered,0,0,c.canvas.width,c.canvas.height);}
    },
  };
})();
