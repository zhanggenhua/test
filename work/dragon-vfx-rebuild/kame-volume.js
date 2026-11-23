/* Indexed beam, spiral, mouth and wavefront meshes in stage units.
   Both previews use the same off-axis perspective lens. The gameplay view is yaw=0, pitch=0. */
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
    uniform bool studio;
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
    float tip(){return (studio?248.:228.)+14500.*max(0.,age);}
    float tail(){return studio?260.*smoothstep(1.65,1.84,age):max(0.,(age-1.747)*10400.);}
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
    float warmPulse(float x){return pow(.5+.5*sin(.025*x-age*5.+.8),5.);}
  `;
  const vertices=code+`
    layout(location=0) in vec2 parameter;
    uniform vec2 origin,angle;
    uniform float cameraDistance,lensFit;
    uniform mat4 worldView;
    uniform vec3 emitter;
    uniform bool wire;
    out vec3 localPosition;
    out vec3 localNormal;
    out vec2 uv;
    out float trailGlow;
    flat out float instance;
    vec3 camera(vec3 p){
      float yaw=angle.x,pitch=angle.y;
      p.xz=mat2(cos(yaw),-sin(yaw),sin(yaw),cos(yaw))*p.xz;
      p.yz=mat2(cos(pitch),-sin(pitch),sin(pitch),cos(pitch))*p.yz;
      return p;
    }
    void main(){
      uv=parameter;instance=float(gl_InstanceID);trailGlow=1.;
      float a=parameter.y*tau;
      vec3 p,N;
      if(part==0||part==1){
        float end=min(studio?950.:${span}.,tip());
        float x=mix(min(tail(),end),end,parameter.x);
        float radius=outerRadius(x);
        if(part==1){
          float helix=winding(x);
          float cord=(1.3+5.2*warmPulse(x)+.58*sin(.075*x-age*8.))*smoothstep(4.,38.,x);
          if(studio)cord*=1.+.4*warmPulse(x);
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
        if(studio&&age<-.05)radius=mix(3.,11.,smoothstep(-2.11,-.08,age));
        radius*=1.+.10*sin(a*4.-age*12.+latitude*5.)+.07*sin(a*7.+latitude*8.+age*9.);
        p=radius*N*vec3(.85,1.04,1.);
      }else if(part==3){
        float life=ringLife(instance);
        float az=parameter.x*tau, r=17.+43.*life;
        if(studio)r*=1.64;
        float x=-2.-life*29.+(8.+12.*life)*cos(az)+5.*sin(az)*sin(az);
        float wobble=1.+.027*sin(az*3.-age*8.+instance)+.014*cos(az*7.+age*4.);
        float cord=(1.32+1.82*(1.-life))*(.74+.26*sin(az*3.+instance));
        if(studio)cord*=1.32;
        float radius=r*wobble+cord*cos(a);
        N=vec3(sin(a),cos(a)*sin(az),cos(a)*cos(az));
        p=vec3(x+cord*sin(a),radius*sin(az),radius*cos(az));
      }else if(part==4||part==5){
        float u=parameter.x,id=instance,key=h(vec2(id,22.)),phase=id*2.399963;
        float x,range,thickness;
        if(part==4){
          float advance=max(0.,age)*4400.;
          x=mix(13.+key*26.,(155.+116.*key)+advance,u);
          range=(.8+u)*(6.+15.*key);
          thickness=sin(u*3.141593)*(1.25+key*2.5)*(1.-.58*u);
          trailGlow=1.-smoothstep(.030,.103,age);
        }else{
          float shed=smoothstep(1.59,1.75,age),scatter=max(0.,age-1.62);
          float front=31.+key*275.+scatter*(710.+key*540.);
          x=front+u*(97.+280.*key);
          range=outerRadius(x)*(.23+.82*key)+4.*shed;
          thickness=sin(u*3.141593)*(1.6+4.5*key)*(1.-.40*shed);
          trailGlow=smoothstep(1.61,1.67,age)*(1.-smoothstep(1.779,1.817,age));
        }
        phase+=.25*sin(u*7.1+id)+.19*sin(x*.017-age*7.);
        vec2 crossSection=range*vec2(sin(phase),cos(phase));
        N=vec3(0.,sin(a),cos(a));
        p=vec3(x,crossSection+N.yz*thickness);
      }else if(part==6){
        float id=instance,cycle=fract((age+2.4)*1.72+h(vec2(id,11.)));
        float phase=id*2.399963+.42*cycle,incline=.70*sin(id*2.76);
        vec3 direction=normalize(vec3(cos(phase),incline,sin(phase)));
        vec3 n0=normalize(cross(direction,vec3(0,1,0))),n1=cross(direction,n0);
        float distance=(1.-cycle*cycle)*(104.+h(vec2(id,3.))*103.);
        N=n0*sin(a)+n1*cos(a);
        p=direction*(distance+(1.-parameter.x)*18.*sin(3.141593*cycle))+
          N*(.65+1.1*cycle)*sin(parameter.x*3.141593);
        trailGlow=sin(3.141593*cycle);
      }else{
        float t=parameter.x,id=instance;
        float phase=tau*(t*.72+id*.37)+(age+2.4)*2.7;
        float r=67.+id*15.+4.*sin(t*9.+age*5.);
        float taper=smoothstep(.0,.13,t)*(1.-smoothstep(.69,1.,t));
        r+=cos(a)*(2.5+1.4*sin(phase*3.))*taper;
        N=vec3(cos(phase),sin(a),sin(phase));
        p=vec3(-51.+r*cos(phase),77.+1.3*sin(a)*taper,r*sin(phase));
        trailGlow=taper*(.27+.73*h(vec2(floor(t*10.+age*4.),id)));
      }
      localPosition=p;localNormal=N;
      if(studio){
        vec3 world=part==7?p:p+emitter;
        gl_Position=worldView*vec4(world,1.);
        if(wire)gl_Position.z-=.00018*gl_Position.w;
        return;
      }
      vec3 v=camera(p);
      // The beam originates on the convergence ray. At world z=0, the palm
      // and the stage plane retain their existing pixel coordinates.
      float depth=cameraDistance-v.z;
      vec2 principal=vec2(origin.x/480.-1.,1.-origin.y/200.);
      vec2 focal=vec2(1./480.,-1./200.)*cameraDistance*lensFit;
      const float near=70.,far=2300.;
      float clipZ=((far+near)*depth-2.*far*near)/(far-near);
      gl_Position=vec4(principal*depth+focal*v.xy,clipZ-(wire?.00018*depth:0.),depth);
    }`;
  const fragments=code+`
    uniform vec3 eye;
    uniform bool wire;
    in vec3 localPosition;
    in vec3 localNormal;
    in vec2 uv;
    in float trailGlow;
    flat in float instance;
    out vec4 outColor;
    void main(){
      float p=localPosition.x;
      float fading=smoothstep(1.63,1.794,age),visibility=release()*(1.-fading);
      vec3 normal=normalize(localNormal);
      vec3 direction=normalize(eye-localPosition);
      float facing=clamp(dot(normal,direction),0.,1.);
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
        float hot=1.-smoothstep(.145+.12*heat,.43+.12*heat,edge);
        float flowing=smoothstep(.39,.66,fog+.14*steam+.087*heat);
        float crumple=smoothstep(.65,.85,fold+.16*heat)*(1.-hot);
        float stratified=smoothstep(.22,.73,flowing+.21*hot-.48*crumple);
        vec3 blue=mix(vec3(.018,.035,.074),vec3(.18,.45,.83),stratified);
        blue=mix(blue,vec3(.37,.75,1.09),smoothstep(.43,.75,flowing+.16*heat+.19*hot));
        float white=hot*smoothstep(.30,.74,fog+.31*flowing);
        white=max(white,.55*hot*(1.-smoothstep(.0,.33,edge)));
        float paper=smoothstep(.33,.75,torn)*.10;
        color=mix(blue,vec3(.94,1.27,1.36),smoothstep(.19,.90,white));
        float rim=(1.-facing)*(1.-facing);
        color+=vec3(.047,.13,.20)*paper+vec3(.040,.135,.23)*rim*stratified;
        float sheen=pow(max(0.,dot(normalize(vec3(-.23,.65,.72)+direction),normal)),9.);
        color+=vec3(.084,.23,.34)*sheen*smoothstep(.25,.74,fold);
        if(studio)color=mix(color,color*vec3(.93,.88,1.09),1.-.59*white);
        float hole=smoothstep(.45,.75,fold+.08*heat)*(1.-hot);
        alpha=visibility*(1.-hole*.15);
        if(studio)alpha*=smoothstep(.006,.051,age)*(1.-smoothstep(1.665,1.758,age));
        alpha*=1.-smoothstep(fog-.10,fog+.11,drain())*smoothstep(1.61,1.73,age);
      }else if(part==1){
        if(age<-.0004||tail()>=tip())discard;
        float intensity=.44+.68*warmPulse(p)+.25*n(vec2(p*.06-age*11.,uv.y*4.));
        float scorch=smoothstep(.09,.94,intensity);
        color=mix(vec3(.65,.125,.018),vec3(1.54,.63,.15),scorch);
        color+=vec3(.94,.59,.26)*smoothstep(.87,1.15,intensity);
        alpha=visibility*smoothstep(9.,37.,p)*(1.-smoothstep(.91,1.,uv.x))*(1.-smoothstep(1.39,1.633,age));
      }else if(part==2){
        float first=exp(-pow((age-.019)/.086,2.))*smoothstep(-.051,-.012,age);
        float facets=n(vec2(uv.x*4.+age*3.1,uv.y*10.-age*4.3));
        float flame=smoothstep(.28,.74,facets+.092*sin(uv.y*32.-age*19.));
        float hot=smoothstep(.18,.91,facing);
        color=mix(vec3(.12,.51,.86),vec3(.83,1.31,1.49),hot*(.59+.41*flame));
        alpha=max(visibility,first)*smoothstep(0.,.47,facing+.15);
        if(studio){
          if(age<-.051)alpha=smoothstep(-2.22,-1.91,age)*(.78+.16*sin(age*44.));
          else alpha*=1.-smoothstep(1.58,1.703,age);
        }
      }else if(part==3){
        float life=ringLife(instance),az=uv.x*tau;
        float birth=smoothstep(.007+instance*.012,.092+instance*.026,age);
        float torn=.27+.73*smoothstep(-.53,.42,cos(az+2.7+.42*instance)+.34*sin(az*5.+instance));
        float leading=smoothstep(-.31,.74,cos(az+2.73+.12*instance));
        color=mix(vec3(.10,.52,1.19),vec3(.94,1.64,2.03),leading*(.66+.34*facing));
        alpha=birth*(1.-smoothstep(.72,1.,life))*torn*(1.-fading)*(.55+.45*facing);
        if(studio)alpha*=1.-smoothstep(1.50,1.693,age);
      }else{
        if(part==4&&age<0.)discard;
        float grains=.53+.47*smoothstep(.13,.48,n(vec2(uv.x*19.-age*18.,instance*2.17)));
        bool amber=part==4&&instance==1.;
        color=amber?vec3(1.56,.71,.19):mix(vec3(.18,.64,1.32),vec3(.93,1.57,1.78),grains);
        alpha=trailGlow*grains;
        if(part==6)alpha*=smoothstep(-2.23,-1.9,age)*(1.-smoothstep(-.35,-.08,age));
        if(part==7){
          color=vec3(.71,.87,.93);
          alpha*=.55*smoothstep(-2.21,-1.93,age)*(1.-smoothstep(-.28,-.012,age));
        }
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
    uniform vec2 outputSize;
    uniform bool wire,studio;
    out vec4 color;
    void main(){
      vec2 uv=gl_FragCoord.xy/outputSize;
      vec4 surface=texture(mainLayer,uv);
      vec3 bloom=wire?vec3(0.):(.56*texture(nearGlow,uv).rgb+.73*texture(farGlow,uv).rgb);
      if(studio)bloom*=1.36;
      float glow=1.-exp(-max(bloom.r,max(bloom.g,bloom.b))*1.28);
      float alpha=surface.a+(1.-surface.a)*glow;
      float peak=max(surface.r,max(surface.g,surface.b))/max(.001,surface.a);
      vec3 light=surface.rgb/(1.+.38*max(0.,peak-.83))+bloom*(1.-surface.a*.45);
      color=vec4(clamp(light,vec3(0.),vec3(alpha)),alpha);
    }`;

  const sourceBloom=`#version 300 es
    precision highp float;
    precision highp int;
    uniform int pass;
    uniform sampler2D source, detail;
    uniform vec2 destinationSize;
    uniform float scale;
    out vec4 result;
    vec3 median(vec3 a,vec3 b,vec3 c){return clamp(a,min(b,c),max(b,c));}
    float brightest(vec3 c){return max(c.r,max(c.g,c.b));}
    vec3 linearize(vec3 c){
      return max(c,0.)*(.012522878+c*(.682171111+.305306011*c));
    }
    vec3 tent(vec2 uv,vec2 texel){
      vec3 blur=vec3(0.);
      for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
        vec2 d=vec2(float(x),float(y));
        blur+=texture(source,uv+d*texel).rgb*float((2-abs(x))*(2-abs(y)));
      }
      return blur/16.;
    }
    void main(){
      vec2 uv=gl_FragCoord.xy/destinationSize;
      vec2 texel=1./vec2(textureSize(source,0));
      vec3 color;
      if(pass==0){
        vec2 p=uv-.5*texel;
        vec2 dx=vec2(texel.x,0.),dy=vec2(0.,texel.y);
        vec3 lateral=median(texture(source,p).rgb,texture(source,p+dx).rgb,texture(source,p-dx).rgb);
        vec3 light=linearize(median(lateral,texture(source,p+dy).rgb,texture(source,p-dy).rgb));
        const float threshold=1.24,knee=threshold*.5;
        float level=brightest(light);
        float bend=clamp(level-threshold+knee,0.,2.*knee);
        color=light*max(bend*bend/(4.*knee),level-threshold)/max(level,.0001);
      }else if(pass<3){
        color=vec3(0.);
        float total=0.;
        for(int y=-1;y<=1;y+=2)for(int x=-1;x<=1;x+=2){
          vec3 light=texture(source,uv+texel*vec2(float(x),float(y))).rgb;
          float weight=pass==1?1./(1.+brightest(light)):1.;
          color+=light*weight;
          total+=weight;
        }
        color/=total;
      }else{
        vec3 glow=tent(uv,texel*scale);
        vec3 base=texture(detail,uv).rgb;
        color=pass==3?base+glow:pow(clamp(linearize(base)+.5*glow,0.,1.),vec3(1./2.4))*1.055-.055;
      }
      result=vec4(max(color,0.),1.);
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
  function init(canvas=document.createElement('canvas'),floorFactory,effectsFactory,sourceMaterials=false){
    const studio=!!floorFactory;
    if(!studio){canvas.width=width;canvas.height=height;}
    const w=canvas.width,h=canvas.height;
    const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:true});
    if(!gl)return null;
    const model=effectsFactory?null:makeProgram(gl,vertices,fragments);
    const blur=makeProgram(gl,screen,down),output=makeProgram(gl,screen,compose);
    const uniforms=(pg,names)=>Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(pg,name)]));
    const m=model&&uniforms(model,['age','part','origin','angle','cameraDistance','lensFit','eye','worldView','emitter','studio','wire']);
    const b=uniforms(blur,['src','size','texel','first']);
    const o=uniforms(output,['mainLayer','nearGlow','farGlow','outputSize','wire','studio']);
    const surfaces=model?[
      makeSurface(gl,longitudinal,radial),makeSurface(gl,ribbonRows,ribbonSides),
      makeSurface(gl,sphereRows,sphereSides),makeSurface(gl,ringRows,ringSides),
    ]:[];
    if(studio&&!effectsFactory)surfaces.push(makeSurface(gl,96,8),makeSurface(gl,124,8),makeSurface(gl,14,8),makeSurface(gl,58,8));
    const floor=floorFactory?.(gl,makeProgram);
    const studyEffects=effectsFactory?.(gl,makeProgram,makeSurface);
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
    const scene=target(w,h,true),pyramid=[2,4,12].map(size=>target(Math.round(w/size),Math.round(h/size)));
    let opaqueDepth;
    if(sourceMaterials){
      const fb=gl.createFramebuffer(),tex=gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,w,h,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
      for(const param of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,param,gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER,fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,tex,0);
      gl.drawBuffers([gl.NONE]);
      gl.readBuffer(gl.NONE);
      if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('场景深度帧缓冲无法初始化');
      opaqueDepth={fb,tex};
    }
    gl.useProgram(blur);gl.uniform1i(b.src,0);
    gl.useProgram(output);gl.uniform1i(o.mainLayer,0);gl.uniform1i(o.nearGlow,1);gl.uniform1i(o.farGlow,2);gl.uniform2f(o.outputSize,w,h);gl.uniform1i(o.studio,+studio);
    function sample(i,t){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,t.tex);}
    function bind(t){gl.bindFramebuffer(gl.FRAMEBUFFER,t?.fb??null);gl.viewport(0,0,t?.w??w,t?.h??h);}
    const renderSourceBloom = sourceMaterials ? prepareSourceBloom() : null;
    function prepareSourceBloom(){
      const program=makeProgram(gl,screen,sourceBloom);
      const u=uniforms(program,['source','detail','pass','destinationSize','scale']);
      let bw=Math.floor(w/2),bh=Math.floor(h/2);
      const precision=Math.log2(bh)-4;
      const levels=Math.max(1,Math.floor(precision));
      const scale=.5+precision-Math.floor(precision);
      const prefilter=target(bw,bh),downsample=[],upsample=[];
      for(let i=0;i<levels;i++){
        bw=Math.max(1,Math.floor(bw/2));bh=Math.max(1,Math.floor(bh/2));
        downsample.push(target(bw,bh));
        if(i<levels-1)upsample.push(target(bw,bh));
      }
      gl.useProgram(program);
      gl.uniform1i(u.source,0);gl.uniform1i(u.detail,1);gl.uniform1f(u.scale,scale);
      function pass(mode,input,destination,detail){
        bind(destination);sample(0,input);
        if(detail)sample(1,detail);
        gl.uniform1i(u.pass,mode);
        gl.uniform2f(u.destinationSize,destination?.w??w,destination?.h??h);
        gl.drawArrays(gl.TRIANGLES,0,3);
      }
      return ()=>{
        gl.useProgram(program);
        pass(0,scene,prefilter);
        let input=prefilter;
        downsample.forEach((dst,i)=>{pass(i===0?1:2,input,dst);input=dst;});
        for(let i=upsample.length-1;i>=0;i--){
          pass(3,input,upsample[i],downsample[i]);
          input=upsample[i];
        }
        pass(4,input,null,scene);
      };
    }
    function draws(edges){
      gl.uniform1i(m.wire,+edges);
      surfaces.forEach(({vao,faces,edges:lines},part)=>{
        const indices=edges?lines:faces;
        gl.uniform1i(m.part,part);gl.bindVertexArray(vao);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices.buffer);
        gl.depthMask(part<3&&!edges);
        if(studio&&!edges&&part===0){
          gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
        }else gl.disable(gl.CULL_FACE);
        const instances=part<3?1:[3,7,11,22,2][part-3];
        if(instances>1)gl.drawElementsInstanced(edges?gl.LINES:gl.TRIANGLES,indices.count,gl.UNSIGNED_SHORT,0,instances);
        else gl.drawElements(edges?gl.LINES:gl.TRIANGLES,indices.count,gl.UNSIGNED_SHORT,0);
      });
    }
    let previous;
    return {canvas,get active(){return !gl.isContextLost();},draw(time,origin,view={}){
      if(gl.isContextLost())return null;
      const yaw=view.yaw??0,pitch=view.pitch??0,wire=!!view.wire;
      const signature=[time,origin.x,origin.y,yaw,pitch,wire,view.camera??'',view.hiddenLayer??''].join('/');
      if(previous===signature)return canvas;
      previous=signature;
      bind(scene);
      if(studio)gl.clearColor(.125,.144,.178,1.);else gl.clearColor(0,0,0,0);
      gl.depthMask(true);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
      if(studio){gl.disable(gl.BLEND);floor.draw(time,view);}
      if(opaqueDepth){
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER,scene.fb);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,opaqueDepth.fb);
        gl.blitFramebuffer(0,0,w,h,0,0,w,h,gl.DEPTH_BUFFER_BIT,gl.NEAREST);
        gl.bindFramebuffer(gl.FRAMEBUFFER,scene.fb);
      }
      gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      if(studyEffects){
        studyEffects(time-2.4,floor,view.hiddenLayer,opaqueDepth?.tex);
      }else{
        gl.useProgram(model);
        gl.uniform1i(m.studio,+studio);
        gl.uniform1f(m.age,time-2.4);gl.uniform2f(m.origin,origin.x,origin.y);
        if(studio){
          gl.uniformMatrix4fv(m.worldView,false,floor.matrix);
          gl.uniform3fv(m.emitter,floor.anchor);
          gl.uniform3fv(m.eye,floor.eye.map((value,i)=>value-floor.anchor[i]));
        }else{
          const azimuth=yaw*Math.PI/180,elevation=pitch*Math.PI/180;
          const depth=Math.sin(azimuth)*Math.cos(elevation);
          const distance=590+315*Math.max(0,-depth);
          const steepness=Math.abs(Math.sin(azimuth)*Math.sin(elevation));
          const fit=1/(1+Math.max(0,steepness-.16)*3.3+1.7*Math.max(0,-depth));
          gl.uniform2f(m.angle,azimuth,elevation);
          gl.uniform1f(m.cameraDistance,distance);gl.uniform1f(m.lensFit,fit);
          gl.uniform3f(m.eye,-distance*depth,-distance*Math.sin(elevation),distance*Math.cos(azimuth)*Math.cos(elevation));
        }
        draws(false);if(wire)draws(true);
      }
      gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.bindVertexArray(blank);
      if(renderSourceBloom){renderSourceBloom();return canvas;}
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
    createStudy(canvas,floorFactory,effectsFactory,sourceMaterials){return init(canvas,floorFactory,effectsFactory,sourceMaterials);},
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
