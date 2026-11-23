/* Renders locally supplied Unity particle mesh samples with WebGL materials. */
(() => {
  'use strict';

  const local = 'dragon-vfx/local/kame/';
  const vertex = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 position;
    layout(location=1) in vec3 surfaceNormal;
    layout(location=2) in vec4 uv;
    layout(location=3) in vec4 color;
    uniform mat4 projection;
    uniform vec3 anchor,meshScale;
    out vec3 point, normal;
    out vec4 texCoord, tint;
    void main(){
      texCoord=uv;
      tint=color;
      normal=surfaceNormal/meshScale;
      point=position*meshScale+anchor;
      gl_Position=projection*vec4(point,1.);
    }
  `;
  const fragment = `#version 300 es
    precision highp float;
    precision highp int;
    in vec3 point,normal;
    in vec4 texCoord,tint;
    uniform vec3 eye;
    uniform sampler2D mainMap,cutoutMap,noiseMap,stageDepth;
    uniform vec4 mainUV,maskUV,noiseUV,scroll;
    uniform vec4 baseTint,frontTint,backTint,rimTint;
    uniform float clock,emission,threshold,opacity,depthPower,rimCurve,rimStrength;
    uniform bool useCustom,useRim,softDepth,centerMask;
    uniform int blendMode;
    out vec4 result;

    vec2 scaled(vec2 uv,vec4 st){return uv*st.xy+st.zw;}

    float eyeDepth(float depth){
      const float near=30.,far=3700.;
      return near*far/(far-depth*(far-near));
    }

    void main(){
      vec2 uv=texCoord.xy;
      vec2 mainShift=scroll.xy*clock, noiseShift=scroll.zw*clock;
      vec2 texUV=blendMode==2?scaled(uv,mainUV)+mainShift:scaled(uv+mainShift,mainUV);
      vec2 warpUV=blendMode==2?scaled(uv,noiseUV)+noiseShift:scaled(uv+noiseShift,noiseUV);
      vec4 image=texture(mainMap,texUV);
      vec4 flow=texture(noiseMap,warpUV);
      vec3 mask=texture(cutoutMap,scaled(uv,maskUV)).rgb;

      if(blendMode==2){
        float lifetime=useCustom?texCoord.z:1.;
        if(mask.r*flow.r*lifetime<threshold)discard;
        vec3 n=normalize(normal),toEye=normalize(eye-point);
        float facing=dot(n,toEye);
        float rim=pow(1.-clamp(facing,0.,1.),rimCurve);
        vec3 front=useRim?mix(frontTint.rgb,rimTint.rgb*rimStrength,rim):frontTint.rgb;
        vec3 surface=facing>=0.?front:backTint.rgb;
        result=vec4(surface*image.rgb*tint.rgb*(emission*tint.a),1.);
        return;
      }

      vec4 alphaFactors=image*flow*tint*baseTint;
      vec3 color=alphaFactors.rgb*emission;
      if(centerMask)color*=mask*clamp(mask+texCoord.z-1.,0.,1.);
      float alpha=alphaFactors.a;
      if(softDepth){
        vec2 screen=gl_FragCoord.xy/vec2(textureSize(stageDepth,0));
        float difference=eyeDepth(texture(stageDepth,screen).r)-eyeDepth(gl_FragCoord.z);
        alpha*=clamp(difference/max(depthPower,.0001),0.,1.);
      }
      if(blendMode==1)alpha*=opacity;
      if(alpha<.0001)discard;
      result=vec4(color*alpha,alpha);
    }
  `;

  function decode(buffer, frameCount, layerCount) {
    const view=new DataView(buffer);
    let offset=0;
    function uint(){const value=view.getUint32(offset,true);offset+=4;return value;}
    if(uint()!==frameCount || uint()!==layerCount)throw Error('粒子网格与材质清单不匹配');
    const frames=[];
    for(let k=0;k<frameCount;k++){
      const time=view.getFloat32(offset,true);offset+=4;
      const layers=[];
      for(let layer=0;layer<layerCount;layer++){
        const vertices=uint(),indices=uint();
        const vertexData=new Uint8Array(buffer,offset,44*vertices);offset+=44*vertices;
        const indexData=new Uint32Array(buffer,offset,indices);offset+=4*indices;
        layers.push({vertexData,indexData});
      }
      frames.push({time,layers});
    }
    if(offset!==buffer.byteLength)throw Error('粒子网格长度不匹配');
    return frames;
  }

  const vec4 = p => [p.r,p.g,p.b,p.a];
  const transform = p => [p.scale.x,p.scale.y,p.offset.x,p.offset.y];
  const values = p => [p.x,p.y,p.z,p.w];

  async function load(kind='meshes') {
    const folder=local+kind+'/';
    if(!['127.0.0.1','localhost','[::1]'].includes(location.hostname))return null;
    const manifest = await fetch(folder+'material.json');
    if(manifest.status===404)return null;
    if(!manifest.ok)throw Error('原材质清单无法载入');
    const take=await manifest.json();
    const response=await fetch(folder+'frames.bin.gz');
    if(!response.ok)throw Error('Unity 粒子网格无法载入');
    const data = response.body.pipeThrough(new DecompressionStream('gzip'));
    const frames = decode(await new Response(data).arrayBuffer(),take.frames,take.layers.length);
    const maps=new Map();
    await Promise.all([...new Set(take.layers.flatMap(
      layer=>[layer.main.file,layer.mask.file,layer.noise.file]).filter(Boolean))].map(async file=>{
      const img = new Image();
      img.src=folder+encodeURIComponent(file);
      await img.decode();
      maps.set(file,img);
    }));
    const built=(gl,makeProgram) => createRenderer(gl,makeProgram,take,frames,maps);
    if(kind==='side-meshes'){
      const i=take.layers.findIndex(layer=>layer.name==='KameCore');
      if(i<0)throw Error('横版粒子采样缺少主束');
      const reach=frames.map(frame=>{
        const {vertexData}=frame.layers[i];
        const vertices=new DataView(vertexData.buffer,vertexData.byteOffset,vertexData.byteLength);
        let furthest=0;
        for(let offset=0;offset<vertices.byteLength;offset+=44){
          furthest=Math.max(furthest,vertices.getFloat32(offset,true));
        }
        return furthest;
      });
      built.reach=age=>reach[sampleIndex(take,sampleTime(take,age))];
    }
    return built;
  }

  // Align the first visible beam. After release, advance at Unity's sample rate.
  function sampleTime(take,age){
    return age<0?take.firstBeam*Math.max(0,1+age/2.4):take.firstBeam+age*take.sampleRate;
  }
  function sampleIndex(take,clock){
    return Math.min(Math.floor(clock+1e-6),take.frames-1);
  }
  function createRenderer(gl,makeProgram,take,frames,maps) {
    const program=makeProgram(gl,vertex,fragment);
    const uniformNames=['projection','anchor','meshScale','eye','mainMap','cutoutMap','noiseMap','stageDepth','mainUV','maskUV',
      'noiseUV','scroll','baseTint','frontTint','backTint','rimTint','clock','emission','threshold','opacity',
      'depthPower','rimCurve','rimStrength','useCustom','useRim','softDepth','centerMask','blendMode'];
    const u=Object.fromEntries(uniformNames.map(name=>[name,gl.getUniformLocation(program,name)]));
    const bindTexture=(i,texture)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,texture);};
    const textures=new Map();
    function texture(map){
      const key=map.file+'/'+map.wrap;
      if(textures.has(key))return textures.get(key);
      const target=gl.TEXTURE_2D, id=gl.createTexture();
      bindTexture(0,id);
      const img=maps.get(map.file);
      if(img){
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
        gl.texImage2D(target,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      }else{
        gl.texImage2D(target,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));
      }
      const mode=map.wrap===0?gl.REPEAT:map.wrap===2?gl.MIRRORED_REPEAT:gl.CLAMP_TO_EDGE;
      gl.texParameteri(target,gl.TEXTURE_WRAP_S,mode);
      gl.texParameteri(target,gl.TEXTURE_WRAP_T,mode);
      gl.texParameteri(target,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(target,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
      gl.generateMipmap(target);
      textures.set(key,id);
      return id;
    }
    const layers=take.layers.map(m=>{
      const mode=m.shader==='Blend_TwoSides'?2:m.shader==='Blend_CenterGlow'?1:0;
      const vao=gl.createVertexArray(),vertices=gl.createBuffer(),indices=gl.createBuffer();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER,vertices);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);
      for(const [location,size,offset] of [[0,3,0],[1,3,12],[2,4,24],[3,4,40]]){
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location,size,location===3?gl.UNSIGNED_BYTE:gl.FLOAT,location===3,44,offset);
      }
      return {...m,mode,vao,vertices,indices,maps:[m.main,m.mask,m.noise].map(texture)};
    });
    gl.useProgram(program);
    [u.mainMap,u.cutoutMap,u.noiseMap,u.stageDepth].forEach((location,i)=>gl.uniform1i(location,i));
    let previous=-1;
    return function render(age,stage,hidden,depth){
      const frameTime=sampleTime(take,age);
      const i=sampleIndex(take,frameTime);
      if(frames[i].time>=3.99)return;
      const frame=frames[i];
      if(i!==previous){
        frame.layers.forEach(({vertexData,indexData},j)=>{
          if(!indexData.length)return;
          const {vao,vertices,indices}=layers[j];
          gl.bindVertexArray(vao);
          gl.bindBuffer(gl.ARRAY_BUFFER,vertices);
          gl.bufferData(gl.ARRAY_BUFFER,vertexData,gl.STREAM_DRAW);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indexData,gl.STREAM_DRAW);
        });
        previous=i;
      }
      const ordering=layers.map((layer,j)=>({layer,j})).filter(({j,layer})=>
        frame.layers[j].indexData.length && hidden!==layer.name);
      ordering.sort((a,b)=>b.layer.sortBias-a.layer.sortBias);
      gl.disable(gl.CULL_FACE);
      gl.useProgram(program);
      gl.uniformMatrix4fv(u.projection,false,stage.matrix);
      gl.uniform3fv(u.eye,stage.eye);
      const scale=stage.scale??[.8,.8,.8];
      gl.uniform3fv(u.meshScale,scale);
      gl.uniform1f(u.clock,frame.time+Math.max(0,frameTime-i)/take.sampleRate);
      bindTexture(3,depth);
      for(const {layer,j} of ordering){
        gl.bindVertexArray(layer.vao);
        const shift=layer.name==='Kamehameha'
          ?stage.groundAnchor??[stage.anchor[0],-1.1,stage.anchor[2]]:stage.anchor;
        gl.uniform3fv(u.anchor,shift);
        gl.depthMask(layer.mode===2);
        gl.blendFuncSeparate(gl.ONE,layer.mode===0?gl.ONE:gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
        layer.maps.forEach((map,index)=>bindTexture(index,map));
        gl.uniform4fv(u.mainUV,transform(layer.main));
        gl.uniform4fv(u.maskUV,transform(layer.mask));
        gl.uniform4fv(u.noiseUV,transform(layer.noise));
        gl.uniform4fv(u.scroll,values(layer.speed));
        gl.uniform4fv(u.baseTint,vec4(layer.tint));
        gl.uniform4fv(u.frontTint,vec4(layer.front));
        gl.uniform4fv(u.backTint,vec4(layer.back));
        gl.uniform4fv(u.rimTint,vec4(layer.rimColor));
        gl.uniform1f(u.emission,layer.emission);
        gl.uniform1f(u.threshold,layer.cutoff);
        gl.uniform1f(u.opacity,layer.opacity);
        gl.uniform1f(u.depthPower,100*scale[2]*layer.depthPower);
        gl.uniform1f(u.rimCurve,layer.fresnel);
        gl.uniform1f(u.rimStrength,layer.fresnelEmission);
        gl.uniform1i(u.useCustom,+layer.custom);
        gl.uniform1i(u.useRim,+layer.rim);
        gl.uniform1i(u.softDepth,+(layer.depth>.5));
        gl.uniform1i(u.centerMask,+(layer.center>.5));
        gl.uniform1i(u.blendMode,layer.mode);
        gl.drawElements(gl.TRIANGLES,frame.layers[j].indexData.length,gl.UNSIGNED_INT,0);
      }
      gl.depthMask(true);
    };
  }

  window.loadDragonSourceMeshes=load;
})();
