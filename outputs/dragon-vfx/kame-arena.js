/* A flat arena and its sprites share the original effect's depth and HDR passes. */
(() => {
  'use strict';

  const width=960,height=400,release=2.4,distance=660;
  const fxScale=[.34,.43,.46];
  const near=30,far=3700;
  const center=[width/2,height/2];
  const projection=new Float32Array([
    distance/center[0],0,0,0,
    0,-distance/center[1],0,0,
    0,0,(far+near)/(far-near),1,
    -distance,distance,(far+near)/(far-near)*distance-2*far*near/(far-near),distance,
  ]);

  const vertex=`#version 300 es
    precision highp float;
    uniform mat4 projection;
    uniform vec4 rect;
    uniform vec2 center;
    uniform float depth, distance, ground;
    uniform int layer;
    uniform bool mirrored;
    out vec2 uv;
    void main(){
      const vec2 quad[6]=vec2[6](vec2(0.,0.),vec2(1.,0.),vec2(0.,1.),
                                  vec2(0.,1.),vec2(1.,0.),vec2(1.,1.));
      vec2 corner=quad[gl_VertexID];
      uv=vec2(mirrored?1.-corner.x:corner.x,corner.y);
      if(layer==0){
        gl_Position=vec4(2.*corner.x-1.,1.-2.*corner.y,0.,1.);
      }else if(layer==1){
        vec2 point=mix(vec2(-4000.,-distance+60.),vec2(4000.,3000.),corner);
        gl_Position=projection*vec4(point.x,ground,point.y,1.);
      }else{
        vec2 pixel=rect.xy+corner*rect.zw;
        vec2 position=center+(pixel-center)*(1.+depth/distance);
        gl_Position=projection*vec4(position,depth,1.);
      }
    }`;
  const fragment=`#version 300 es
    precision highp float;
    precision highp int;
    uniform sampler2D art;
    uniform int layer;
    uniform float ambience;
    in vec2 uv;
    out vec4 color;
    void main(){
      if(layer==1){color=vec4(0.);return;}
      vec4 image=texture(art,uv);
      if(image.a<.055)discard;
      color=vec4(image.rgb*image.a*ambience,image.a);
    }`;

  const clamp=x=>Math.max(0,Math.min(1,x));
  function smooth(a,b,v){const x=clamp((v-a)/(b-a));return x*x*(3-2*x);}
  function pose(time){
    if(time<.13||time>=4.235)return 'idle';
    if(time<.27)return 'gather';
    if(time<2.313)return 'charge';
    if(time<2.397)return 'drive';
    return time<4.174?'fire':'recover';
  }
  function arena(gl,makeProgram,reach){
    const program=makeProgram(gl,vertex,fragment),quad=gl.createVertexArray();
    const names=['projection','rect','center','depth','distance','ground','layer','mirrored','art','ambience'];
    const u=Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(program,name)]));
    const textures=new WeakMap();
    const backdrop=document.createElement('canvas');
    backdrop.width=width;backdrop.height=height;
    const paint=backdrop.getContext('2d');
    let stageKey='';

    function bind(source,repaint=false){
      let tex=textures.get(source);
      gl.activeTexture(gl.TEXTURE0);
      if(!tex){
        tex=gl.createTexture();textures.set(source,tex);repaint=true;
        gl.bindTexture(gl.TEXTURE_2D,tex);
        for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);
        for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);
      }else gl.bindTexture(gl.TEXTURE_2D,tex);
      if(repaint)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
    }

    gl.useProgram(program);
    gl.uniformMatrix4fv(u.projection,false,projection);
    gl.uniform2fv(u.center,center);
    gl.uniform1f(u.distance,distance);
    gl.uniform1i(u.art,0);
    const stage={matrix:projection,eye:[...center,-distance],scale:fxScale,anchor:[0,0,0],groundAnchor:[0,0,0]};

    return Object.assign(stage,{draw(time,{scene}){
      const caster=pose(time),palm=scene.palm(caster,scene.casterX);
      const age=time-release;
      const contact=age>=0&&time<4.10&&reach(age)*fxScale[0]>=scene.targetX-palm.x-12;
      stage.anchor=[palm.x,palm.y,0];
      stage.groundAnchor=[scene.casterX,scene.ground-100*fxScale[1]-.9,0];

      gl.useProgram(program);gl.bindVertexArray(quad);
      gl.disable(gl.CULL_FACE);
      const key=[scene.casterX,scene.targetX,scene.ground].join('/');
      const repaint=stageKey!==key;
      if(repaint){
        scene.stage(paint);
        paint.fillStyle='rgba(32,34,49,.27)';
        for(const x of [scene.casterX,scene.targetX]){
          paint.beginPath();paint.ellipse(x,scene.ground+1,30,4.5,0,0,2*Math.PI);paint.fill();
        }
        stageKey=key;
      }
      bind(backdrop,repaint);
      const charge=smooth(.10,.55,time)*(1-smooth(4.00,4.23,time));
      const beam=smooth(2.36,2.47,time)*(1-smooth(4.00,4.19,time));
      gl.uniform1f(u.ambience,1-.14*charge-.10*beam);
      gl.uniform1i(u.layer,0);gl.uniform1i(u.mirrored,0);
      gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.drawArrays(gl.TRIANGLES,0,6);

      gl.enable(gl.DEPTH_TEST);gl.depthMask(true);
      gl.colorMask(false,false,false,false);
      gl.uniform1i(u.layer,1);gl.uniform1f(u.ground,scene.ground+1);
      gl.drawArrays(gl.TRIANGLES,0,6);
      gl.colorMask(true,true,true,true);

      gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.ONE,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform1i(u.layer,2);
      gl.uniform1f(u.ambience,1-.06*charge);
      function sprite(role,x,pose,depth){
        bind(scene.fighterFrame(role,pose));
        gl.uniform4f(u.rect,x-75.6,scene.ground-150.78,151.2,151.2);
        gl.uniform1f(u.depth,depth);
        gl.uniform1i(u.mirrored,+(role==='target'));
        gl.drawArrays(gl.TRIANGLES,0,6);
      }
      sprite('target',scene.targetX,contact?'hurt':'idle',18);
      sprite('caster',scene.casterX,caster,5);
    }});
  }

  let runner,ready;
  window.DragonBeamArena={
    get duration(){return DragonKame.duration;},
    get phases(){return DragonKame.phases;},
    get sourceMaterials(){return !!runner;},
    get ready(){
      return ready??=(async()=>{
        const source=await window.loadDragonSourceMeshes('side-meshes');
        if(!source){await DragonKame.ready;return;}
        const canvas=document.createElement('canvas');
        canvas.width=width;canvas.height=height;
        runner=DragonBeamVolume.createStudy(canvas,(gl,program)=>arena(gl,program,source.reach),source,true);
        if(!runner)throw Error('横版原材质预览需要 WebGL 2');
      })();
    },
    draw(ctx,time,scene){
      if(!runner){DragonKame.draw(ctx,time,scene);return;}
      const canvas=runner.draw(time,{x:scene.casterX,y:scene.ground},{scene});
      if(canvas)ctx.drawImage(canvas,0,0);
    },
  };
})();
