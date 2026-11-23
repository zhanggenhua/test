/* A perspective WebGL2 scene rendered into a transparent layer of the 2D arena. */
(() => {
  'use strict';
  const width=704,height=480,cx=326,cy=210,pixelsPerUnit=108,end=1.67;
  const tileWidth=480,tileHeight=327;
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const atlas=new Image();
  function requestAtlas(){if(!atlas.hasAttribute('src')&&window.DragonImpactAtlas)atlas.src=window.DragonImpactAtlas;}
  canvas.addEventListener('webglcontextlost',requestAtlas);
  const eyes=[.30,3.80,13.4],target=[0,1,0];
  const unit=a=>{const l=Math.hypot(...a);return a.map(x=>x/l);};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const z=unit(eyes.map((v,i)=>v-target[i])),x=unit(cross([0,1,0],z)),y=cross(z,x);
  const distance=Math.hypot(...eyes.map((v,i)=>v-target[i]));
  const focal=2*distance*pixelsPerUnit/height;
  const view=[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eyes),-dot(y,eyes),-dot(z,eyes),1];
  const projection=[focal*height/width,0,0,0,0,focal,0,0,1-2*cx/width,2*cy/height-1,-1.02532,-1,0,0,-.50632,0];
  const vp=new Float32Array(16);
  for(let col=0;col<4;col++)for(let row=0;row<4;row++){
    for(let k=0;k<4;k++)vp[4*col+row]+=projection[4*k+row]*view[4*col+k];
  }
  let gl,renderVolume,renderDebris,post,scene,loaded=false,last=-1;
  const uniformsByProgram=new Map();
  function program(vs,fs){
    const prog=gl.createProgram();
    for(const [type,source] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){
      const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);
      if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));
      gl.attachShader(prog,sh);gl.deleteShader(sh);
    }
    gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));
    return prog;
  }
  function uniforms(prog,time){
    let u=uniformsByProgram.get(prog);
    if(!u){u=['vp','age','eye'].map(name=>gl.getUniformLocation(prog,name));uniformsByProgram.set(prog,u);}
    gl.useProgram(prog);gl.uniformMatrix4fv(u[0],false,vp);gl.uniform1f(u[1],time);gl.uniform3fv(u[2],eyes);
  }
  function sphereMesh(){
    const verts=[],indices=[],cols=100,rows=72;
    for(let i=0;i<=rows;i++){
      const t=i*Math.PI/rows;
      for(let j=0;j<=cols;j++){
        const a=j*Math.PI*2/cols;
        const n=[Math.sin(t)*Math.cos(a),Math.cos(t),Math.sin(t)*Math.sin(a)];
        verts.push(...n,...n,j/cols,i/rows);
        if(i<rows&&j<cols){const k=i*(cols+1)+j;indices.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}
      }
    }
    const vao=gl.createVertexArray();gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);
    for(const [loc,size,offset] of [[0,3,0],[1,3,12],[2,2,24]]){
      gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,32,offset);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
    return {vao,count:indices.length,type:gl.UNSIGNED_SHORT};
  }
  function draw(mesh){gl.bindVertexArray(mesh.vao);gl.drawElements(gl.TRIANGLES,mesh.count,mesh.type??gl.UNSIGNED_SHORT,0);}
  function framebuffer(w,h,hdr,depth){
    const fb=gl.createFramebuffer(),tex=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texImage2D(gl.TEXTURE_2D,0,hdr?gl.RGBA16F:gl.RGBA8,w,h,0,gl.RGBA,hdr?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
    if(depth){
      const rb=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,rb);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,w,h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,rb);
    }
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('3D 特效帧缓冲初始化失败');
    return {fb,tex,w,h};
  }
  function composer(hdr){
    const vert='#version 300 es\nout vec2 uv;void main(){uv=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(uv*2.-1.,0,1);}';
    const head='#version 300 es\nprecision highp float;in vec2 uv;out vec4 col;uniform sampler2D src;';
    const bright=program(vert,head+'void main(){vec3 c=texture(src,uv).rgb;float l=dot(c,vec3(.24,.66,.10));col=vec4(c*smoothstep(.56,1.18,l),1.);}');
    const blur=program(vert,head+`uniform vec2 axis;void main(){
      vec3 s=texture(src,uv).rgb*.227027;
      s+=(texture(src,uv+axis*1.384615).rgb+texture(src,uv-axis*1.384615).rgb)*.316216;
      s+=(texture(src,uv+axis*3.230769).rgb+texture(src,uv-axis*3.230769).rgb)*.070270;
      col=vec4(s,1.);}`);
    const combine=program(vert,head+`uniform sampler2D bloom;void main(){
      vec4 base=texture(src,uv);vec3 blur=texture(bloom,uv).rgb;
      vec3 halo=blur*.56;float bleed=1.-exp(-max(halo.r,max(halo.g,halo.b))*1.4);
      float alpha=base.a+(1.-base.a)*bleed;
      vec3 linear=base.rgb+halo;vec3 light=linear/(1.+.32*max(vec3(0),linear-.83));
      col=vec4(min(light,vec3(alpha)),alpha);}`);
    const a=framebuffer(width/4,height/4,hdr,false),b=framebuffer(width/4,height/4,hdr,false);
    const vao=gl.createVertexArray();
    const loc=gl.getUniformLocation(blur,'axis');gl.useProgram(combine);gl.uniform1i(gl.getUniformLocation(combine,'bloom'),1);
    function pass(prog,to,texture,dx=0,dy=0){
      gl.bindFramebuffer(gl.FRAMEBUFFER,to?.fb??null);gl.viewport(0,0,to?.w??width,to?.h??height);
      gl.useProgram(prog);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      if(prog===blur)gl.uniform2f(loc,dx,dy);
      gl.drawArrays(gl.TRIANGLES,0,3);
    }
    return ()=>{
      gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.bindVertexArray(vao);
      pass(bright,a,scene.tex);pass(blur,b,a.tex,1.6/a.w,0);pass(blur,a,b.tex,0,1.6/a.h);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,a.tex);
      pass(combine,null,scene.tex);
    };
  }
  function setup(){
    gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:true});
    if(!gl)return;
    const hdr=!!gl.getExtension('EXT_color_buffer_float');
    const geom={program,uniforms,draw,sphere:sphereMesh(),eye:eyes};
    scene=framebuffer(width,height,hdr,true);post=composer(hdr);
    renderVolume=window.SpiritVolumeBuild(gl,geom);renderDebris=window.SpiritEjectaBuild(gl,geom);
    loaded=true;
  }
  function paint(t){
    if(!loaded||gl.isContextLost())return null;
    const id=Math.round(t*60);if(id===last)return canvas;last=id;t=id/60;
    gl.bindFramebuffer(gl.FRAMEBUFFER,scene.fb);gl.viewport(0,0,width,height);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);gl.colorMask(true,true,true,true);gl.disable(gl.BLEND);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    renderDebris(t,'stones');renderDebris(t,'floor');renderDebris(t,'back');renderVolume(t);renderDebris(t,'front');
    post();return canvas;
  }
  // Init, draw and read back during loading. A GL link alone defers driver
  // compilation on several backends until the first visible draw.
  const ready=new URLSearchParams(location.search).get('fx')==='kame'?Promise.resolve():Promise.resolve().then(async()=>{
    setup();
    if(loaded){
      paint(.61);
      const pixel=new Uint8Array(4);gl.readPixels(cx,height-cy,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
      const warm=document.createElement('canvas');warm.width=16;warm.height=12;
      warm.getContext('2d').drawImage(canvas,0,0,16,12);last=-1;
    }else requestAtlas();
    if(atlas.hasAttribute('src'))await atlas.decode();
  });
  function drawStage(ctx,t,tx,ground,ball){
    if(t<0||t>=end)return;
    const bx=ball?.x??tx-75,by=ball?.y??ground-100,r=ball?.r??100;
    const sx=(ball?.rx??r)/pixelsPerUnit,sy=(ball?.ry??r)/pixelsPerUnit;
    const baseDrop=projectY(0,0,0)-cy;
    const settle=Math.min(1,Math.max(0,(t-.14)/.41));const ease=settle*settle*(3-2*settle);
    // The foot contact is at the near edge of the pressure footprint. Its
    // projected ground centre lies just behind the fighters on this stage.
    const ty=(by-cy*sy)+ease*(ground-19-(by+baseDrop*sy));
    const left=bx-cx*sx,layer=paint(t);
    if(layer)ctx.drawImage(layer,left,ty,width*sx,height*sy);
    else if(atlas.naturalWidth){
      const id=Math.min(Math.ceil(end*30)-1,Math.floor(t*30));
      ctx.drawImage(atlas,id%6*tileWidth,Math.floor(id/6)*tileHeight,tileWidth,tileHeight,left,ty,width*sx,height*sy);
    }
  }
  function projectY(wx,wy,wz){
    const yy=vp[1]*wx+vp[5]*wy+vp[9]*wz+vp[13],ww=vp[3]*wx+vp[7]*wy+vp[11]*wz+vp[15];
    return (1-yy/ww)*height/2;
  }
  window.DragonImpact={draw:drawStage,paint,ready,duration:end,tileWidth,tileHeight,get realtime(){return loaded&&!gl.isContextLost();}};
})();
