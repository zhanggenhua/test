/* Indexed beam, spiral, mouth and wavefront meshes in stage units.
   Both preview cameras use this renderer. The gameplay view is yaw=0, pitch=0. */
(() => {
  'use strict';
  const width=960,height=400;
  const longitudinal=150,radial=64,span=565;
  const ribbonRows=260,ribbonSides=8;
  const sphereRows=32,sphereSides=64,ringRows=72,ringSides=10;
  const code=`#version 300 es
    precision highp float;
    precision highp int;
    uniform float age;
    uniform int part;
    float h(vec2 p){
      vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);
      return fract((q.x+q.y)*q.z);
    }
    float n(vec2 p){
      vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);
    }
    float flowNoise(vec2 p){return .57*n(p)+.29*n(p*2.03+13.)+.14*n(p*4.27-4.);}
    const float tau=6.28318530718;
    float release(){return smoothstep(-.046,.047,age);}
    float drain(){return smoothstep(1.615,1.802,age);}
    float tip(){return 228.+14500.*max(0.,age);}
    float tail(){return max(0.,(age-1.747)*10400.);}
    float outerRadius(float x){
      float body=mix(9.,47.,1.-exp(-max(0.,x)/78.));
      float opening=mix(.168,1.,smoothstep(-.014,.117,age))*(1.-.17*drain());
      float end=1.-smoothstep(tip()-125.,tip()+14.,x);
      return body*opening*mix(.028,1.,end);
    }
    float center(float x){return 2.6*sin(x*.0076-age*5.8)+3.1*(n(vec2(x*.005,age*.53))-.5);}
    float skin(float x,vec2 circle){
      float along=x*.024-age*8.4;
      float ridges=sin(along+3.*circle.x+.46*sin(along*1.5-3.*circle.y));
      float notch=flowNoise(vec2(along*.86,2.6*circle.x+1.1*circle.y));
      return 1.+.11*ridges+.23*(notch-.5)+.054*sin(along*2.1+circle.y*9.);
    }
    float ringLife(float id){return fract(max(0.,age-.027)*1.36+id/3.);}
    float winding(float x){return -1.73+x*.0102+.44*(1.-exp(-x/82.))-6.1*(age-.367);}
  `;
  const vertices=code+`
    layout(location=0) in vec2 parameter;
    uniform vec2 origin,angle;
    uniform bool wire;
    out vec3 localPosition;
    out vec3 localNormal;
    out vec2 uv;
    flat out float instance;
    vec3 camera(vec3 p){
      float yaw=angle.x,pitch=angle.y;
      p.xz=mat2(cos(yaw),-sin(yaw),sin(yaw),cos(yaw))*p.xz;
      p.yz=mat2(cos(pitch),-sin(pitch),sin(pitch),cos(pitch))*p.yz;
      // Keep the palm anchored while framing the end of the rotated mesh.
      float extent=abs(sin(yaw)*sin(pitch));
      p.xy/=1.+max(0.,extent-.155)*3.6;
      return p;
    }
    void main(){
      uv=parameter;instance=float(gl_InstanceID);
      float a=parameter.y*tau;
      vec3 p,N;
      if(part==0||part==1){
        float end=min(${span}.,tip());
        float x=mix(min(tail(),end),end,parameter.x);
        float radius=outerRadius(x);
        if(part==1){
          float helix=winding(x);
          float cord=(2.3+1.2*sin(.019*x-age*6.)+.55*sin(.075*x-age*8.))*smoothstep(4.,38.,x);
          float offset=radius*skin(x,vec2(sin(helix),cos(helix)))+2.40;
          float r=offset+cord*cos(a);
          N=vec3(sin(a),cos(a)*sin(helix),cos(a)*cos(helix));
          p=vec3(x+cord*sin(a),center(x)+r*sin(helix),r*cos(helix));
        }else{
          vec2 circle=vec2(sin(a),cos(a));
          float r=radius*skin(x,circle);
          float closeNose=max(0.,1.-parameter.x)*195.;
          r*=smoothstep(0.,19.,closeNose);
          N=vec3(smoothstep(.95,1.,parameter.x),circle);
          p=vec3(x,center(x)+circle.x*r,circle.y*r);
        }
      }else if(part==2){
        float latitude=(parameter.x-.5)*3.14159265;
        N=vec3(cos(latitude)*sin(a),sin(latitude),cos(latitude)*cos(a));
        float flash=exp(-pow((age-.035)/.082,2.));
        float radius=11.+18.*flash+2.2*sin(age*17.);
        radius*=1.+.10*sin(a*4.-age*12.+latitude*5.)+.07*sin(a*7.+latitude*8.+age*9.);
        p=radius*N*vec3(.85,1.04,1.);
      }else{
        float life=ringLife(instance);
        float az=parameter.x*tau, r=17.+43.*life;
        float x=-2.-life*24.+(6.+8.*life)*cos(az)+4.*sin(az)*sin(az);
        float wobble=1.+.027*sin(az*3.-age*8.+instance)+.014*cos(az*7.+age*4.);
        float cord=(1.08+1.72*(1.-life))*(.62+.38*sin(az*3.+instance));
        float radius=r*wobble+cord*cos(a);
        N=vec3(sin(a),cos(a)*sin(az),cos(a)*cos(az));
        p=vec3(x+cord*sin(a),radius*sin(az),radius*cos(az));
      }
      localPosition=p;localNormal=N;
      vec3 v=camera(p);
      vec2 q=v.xy+origin;
      gl_Position=vec4(q.x/480.-1.,1.-q.y/200.,-v.z/800.-(wire?.0008:0.),1.);
    }`;
  const fragments=code+`
    uniform vec2 angle;
    uniform bool wire;
    in vec3 localPosition;
    in vec3 localNormal;
    in vec2 uv;
    flat in float instance;
    out vec4 outColor;
    void main(){
      float p=localPosition.x;
      float fading=smoothstep(1.63,1.794,age),visibility=release()*(1.-fading);
      vec3 direction=vec3(sin(angle.x)*cos(angle.y),sin(angle.y),cos(angle.x)*cos(angle.y));
      float facing=max(0.,dot(normalize(localNormal),direction));
      vec3 color;
      float alpha;
      if(part==0){
        if(age<-.0004||tail()>=tip())discard;
        float a=uv.y*tau,lane=sin(a);
        vec2 surface=vec2(p*.015-age*6.4,lane*2.65+.84*cos(a));
        float fog=flowNoise(surface),fold=n(surface*vec2(3.7,2.6)+vec2(11.,-2.)),torn=n(surface*vec2(7.2,5.1));
        float heat=sin(p*.018-age*8.7+lane*5.2+.53*cos(a)+2.1*(fold-.5));
        float steam=sin(p*.011-age*6.8+lane*10.5+fog*4.2);
        float centerline=.13*sin(p*.011-age*4.1+.3)+.16*heat;
        float edge=abs(lane-centerline);
        float hot=1.-smoothstep(.17+.13*heat,.48+.13*heat,edge);
        float flowing=smoothstep(.39,.66,fog+.14*steam+.087*heat);
        float crumple=smoothstep(.65,.85,fold+.16*heat)*(1.-hot);
        float stratified=smoothstep(.22,.73,flowing+.21*hot-.48*crumple);
        vec3 blue=mix(vec3(.018,.035,.074),vec3(.16,.46,.82),stratified);
        blue=mix(blue,vec3(.32,.77,1.10),smoothstep(.43,.75,flowing+.15*heat+.21*hot));
        float white=hot*smoothstep(.30,.74,fog+.31*flowing);
        white=max(white,.55*hot*(1.-smoothstep(.0,.33,edge)));
        float paper=smoothstep(.33,.75,torn)*.10;
        color=mix(blue,vec3(.94,1.27,1.36),smoothstep(.19,.90,white));
        color+=vec3(.047,.13,.20)*paper+vec3(.035,.12,.19)*(1.-facing)*stratified;
        float hole=smoothstep(.45,.75,fold+.08*heat)*(1.-hot);
        alpha=visibility*(1.-hole*.15);
        alpha*=1.-smoothstep(fog-.10,fog+.11,drain())*smoothstep(1.61,1.73,age);
      }else if(part==1){
        if(age<-.0004||tail()>=tip())discard;
        float intensity=.61+.43*sin(.023*p-age*9.4)+.20*n(vec2(p*.06-age*11.,uv.y*4.));
        float scorch=smoothstep(.09,.94,intensity);
        color=mix(vec3(.65,.125,.018),vec3(1.54,.63,.15),scorch);
        color+=vec3(.91,.51,.22)*smoothstep(.87,1.14,intensity);
        alpha=visibility*smoothstep(9.,37.,p)*(1.-smoothstep(.91,1.,uv.x))*(1.-smoothstep(1.39,1.633,age));
      }else if(part==2){
        float first=exp(-pow((age-.019)/.086,2.))*smoothstep(-.051,-.012,age);
        float facets=n(vec2(uv.x*4.+age*3.1,uv.y*10.-age*4.3));
        float flame=smoothstep(.28,.74,facets+.092*sin(uv.y*32.-age*19.));
        float hot=smoothstep(.18,.91,facing);
        color=mix(vec3(.12,.51,.86),vec3(.83,1.31,1.49),hot*(.59+.41*flame));
        alpha=max(visibility,first)*smoothstep(0.,.47,facing+.15);
      }else{
        float life=ringLife(instance),az=uv.x*tau;
        float birth=smoothstep(.007+instance*.012,.092+instance*.026,age);
        float torn=.27+.73*smoothstep(-.53,.42,cos(az+2.7+.42*instance)+.34*sin(az*5.+instance));
        color=mix(vec3(.11,.44,.94),vec3(.64,1.22,1.52),.48+.42*sin(az+instance*.7));
        alpha=birth*(1.-smoothstep(.73,1.,life))*torn*(1.-fading)*(.35+.65*facing);
      }
      if(alpha<.016)discard;
      color*=.75+.25*facing;
      if(wire){color=part==1?vec3(1.,.66,.29):vec3(.57,1.,.81);alpha=.71;}
      outColor=vec4(color*alpha,alpha);
    }`;
  const screen='#version 300 es\nvoid main(){vec2 q=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(2.*q-1.,0.,1.);}';
  const down=`#version 300 es
    precision highp float;
    uniform sampler2D src;
    uniform vec2 size,texel;
    uniform bool first;
    out vec4 color;
    vec3 sampleAt(vec2 uv){
      vec3 c=texture(src,uv).rgb;
      return first?c*smoothstep(.41,1.18,max(c.r,max(c.g,c.b))):c;
    }
    void main(){
      vec2 uv=gl_FragCoord.xy/size,d=texel*1.67;
      vec3 v=sampleAt(uv)*.22;
      v+=(sampleAt(uv+d)+sampleAt(uv-d)+sampleAt(uv+vec2(d.x,-d.y))+sampleAt(uv+vec2(-d.x,d.y)))*.13;
      v+=(sampleAt(uv+vec2(d.x*2.,0.))+sampleAt(uv-vec2(d.x*2.,0.))+sampleAt(uv+vec2(0.,d.y*2.))+sampleAt(uv-vec2(0.,d.y*2.)))*.065;
      color=vec4(v,1.);
    }`;
  const compose=`#version 300 es
    precision highp float;
    uniform sampler2D mainLayer,nearGlow,farGlow;
    uniform bool wire;
    out vec4 color;
    void main(){
      vec2 uv=gl_FragCoord.xy/vec2(960.,400.);
      vec4 surface=texture(mainLayer,uv);
      vec3 bloom=wire?vec3(0.):(.56*texture(nearGlow,uv).rgb+.73*texture(farGlow,uv).rgb);
      float glow=1.-exp(-max(bloom.r,max(bloom.g,bloom.b))*1.28);
      float alpha=surface.a+(1.-surface.a)*glow;
      float peak=max(surface.r,max(surface.g,surface.b))/max(.001,surface.a);
      vec3 light=surface.rgb/(1.+.38*max(0.,peak-.83))+bloom*(1.-surface.a*.51);
      color=vec4(clamp(light,vec3(0.),vec3(alpha)),alpha);
    }`;

  function makeProgram(gl,v,f){
    const pg=gl.createProgram();
    for(const [kind,source] of [[gl.VERTEX_SHADER,v],[gl.FRAGMENT_SHADER,f]]){
      const shader=gl.createShader(kind);
      gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
      gl.attachShader(pg,shader);gl.deleteShader(shader);
    }
    gl.linkProgram(pg);
    if(!gl.getProgramParameter(pg,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(pg));
    return pg;
  }

  function makeSurface(gl,rows,columns){
    const data=[],faces=[],edges=[],stride=columns+1;
    for(let row=0;row<=rows;row++){
      for(let col=0;col<=columns;col++){
        data.push(row/rows,col/columns);
        if(row<rows&&col<columns){
          const i=row*stride+col,j=i+stride;
          faces.push(i,j,i+1,j,j+1,i+1);
          if(row%5===0)edges.push(i,i+1);
          if(col%4===0)edges.push(i,j);
        }
      }
    }
    const vao=gl.createVertexArray();gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    function elements(indices){
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
      return {buffer,count:indices.length};
    }
    return {vao,faces:elements(faces),edges:elements(edges)};
  }

  let renderer;
  function init(){
    const canvas=document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:true});
    if(!gl)return null;
    const model=makeProgram(gl,vertices,fragments),blur=makeProgram(gl,screen,down),output=makeProgram(gl,screen,compose);
    const uniforms=(pg,names)=>Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(pg,name)]));
    const m=uniforms(model,['age','part','origin','angle','wire']);
    const b=uniforms(blur,['src','size','texel','first']);
    const o=uniforms(output,['mainLayer','nearGlow','farGlow','wire']);
    const surfaces=[
      makeSurface(gl,longitudinal,radial),makeSurface(gl,ribbonRows,ribbonSides),
      makeSurface(gl,sphereRows,sphereSides),makeSurface(gl,ringRows,ringSides),
    ];
    const blank=gl.createVertexArray(),hdr=!!gl.getExtension('EXT_color_buffer_float');
    function target(w,h,depth=false){
      const fb=gl.createFramebuffer(),tex=gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D,tex);
      for(const param of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,param,gl.LINEAR);
      for(const param of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,param,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,hdr?gl.RGBA16F:gl.RGBA8,w,h,0,gl.RGBA,hdr?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);
      gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
      if(depth){
        const buffer=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,buffer);
        gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,w,h);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,buffer);
      }
      if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('束身帧缓冲无法初始化');
      return {fb,tex,w,h};
    }
    const scene=target(width,height,true),pyramid=[target(480,200),target(240,100),target(80,Math.round(height/12))];
    gl.useProgram(blur);gl.uniform1i(b.src,0);
    gl.useProgram(output);gl.uniform1i(o.mainLayer,0);gl.uniform1i(o.nearGlow,1);gl.uniform1i(o.farGlow,2);
    function sample(i,t){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,t.tex);}
    function bind(t){gl.bindFramebuffer(gl.FRAMEBUFFER,t?.fb??null);gl.viewport(0,0,t?.w??width,t?.h??height);}
    function draws(edges){
      gl.uniform1i(m.wire,+edges);
      surfaces.forEach(({vao,faces,edges:lines},part)=>{
        const indices=edges?lines:faces;
        gl.uniform1i(m.part,part);gl.bindVertexArray(vao);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices.buffer);
        gl.depthMask(part!==3&&!edges);
        if(part===3)gl.drawElementsInstanced(edges?gl.LINES:gl.TRIANGLES,indices.count,gl.UNSIGNED_SHORT,0,3);
        else gl.drawElements(edges?gl.LINES:gl.TRIANGLES,indices.count,gl.UNSIGNED_SHORT,0);
      });
    }
    let previous;
    return {canvas,get active(){return !gl.isContextLost();},draw(time,origin,view={}){
      if(gl.isContextLost())return null;
      const yaw=view.yaw??0,pitch=view.pitch??0,wire=!!view.wire;
      const signature=[time,origin.x,origin.y,yaw,pitch,wire].join('/');
      if(previous===signature)return canvas;
      previous=signature;
      bind(scene);gl.clearColor(0,0,0,0);gl.depthMask(true);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(model);
      gl.uniform1f(m.age,time-2.4);gl.uniform2f(m.origin,origin.x,origin.y);
      gl.uniform2f(m.angle,yaw*Math.PI/180,pitch*Math.PI/180);
      draws(false);if(wire)draws(true);
      gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.bindVertexArray(blank);
      if(!wire){
        gl.useProgram(blur);let input=scene;
        for(const dst of pyramid){
          bind(dst);sample(0,input);gl.uniform2f(b.size,dst.w,dst.h);gl.uniform2f(b.texel,1/input.w,1/input.h);
          gl.uniform1i(b.first,+(input===scene));gl.drawArrays(gl.TRIANGLES,0,3);
          input=dst;
        }
      }
      bind(null);gl.useProgram(output);gl.uniform1i(o.wire,+wire);
      sample(0,scene);sample(1,pyramid[0]);sample(2,pyramid[2]);gl.drawArrays(gl.TRIANGLES,0,3);
      return canvas;
    }};
  }

  function instance(){
    if(renderer!==undefined)return renderer;
    try{renderer=init();}
    catch(error){console.error('龟波气功三维渲染初始化失败',error);renderer=null;}
    return renderer;
  }
  window.DragonBeamVolume={
    draw(time,palm,view){return instance()?.draw(time,palm,view)??null;},
    get available(){return instance()?.active??false;},
    warm(){
      const scene=instance();
      if(!scene)return;
      const light=scene.draw(2.767,{x:446,y:255});
      const scratch=document.createElement('canvas');
      scratch.width=scratch.height=2;
      const ctx=scratch.getContext('2d');
      ctx.drawImage(light,0,0,2,2);ctx.getImageData(0,0,1,1);
    },
  };
})();
