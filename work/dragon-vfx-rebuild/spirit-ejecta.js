/* Opaque flying stage chips, ground discharges and the lightning that crosses
   the Spirit Bomb's shell. All positions share the volume's 3D depth buffer. */
window.SpiritEjectaBuild=function(gl,g){
  'use strict';
  const tau=Math.PI*2;
  const hash=n=>{const v=Math.sin(n*21.871+5.32)*38914.29;return v-Math.floor(v);};
  const norm=v=>{const s=Math.hypot(...v);return v.map(k=>k/s);};
  const vector=(x,y)=>x.map((v,i)=>v-y[i]);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  function staticMesh(vertices,attributes){
    const vao=gl.createVertexArray();gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    const stride=attributes.reduce((s,v)=>s+v,0);let offset=0;
    attributes.forEach((size,slot)=>{gl.enableVertexAttribArray(slot);gl.vertexAttribPointer(slot,size,gl.FLOAT,false,stride*4,offset*4);offset+=size;});
    return {vao,count:vertices.length/stride};
  }
  const noise=`
    float hash(float n){return fract(sin(n*32.127+9.71)*17489.27);}
    float n1(float x,float id){float f=fract(x);return mix(hash(floor(x)+id),hash(floor(x)+id+1.),f*f*(3.-2.*f));}
  `;
  const chips=[];
  const poly=[[0,.98,.14],[.79,.23,.24],[.18,.08,.90],[-.64,.21,.42],[-.58,-.08,-.49],[.24,.02,-.79],[-.09,-.82,.03]];
  for(let i=0;i<178;i++){
    const az=tau*hash(Math.floor(i/6)+7)+hash(i)*.69;
    const born=.10+.53*hash(Math.floor(i/5)+8)+.08*hash(i+712);
    const lg=i%8===0;
    const size=lg?.052+.057*hash(i+79):.010+.030*hash(i+72);
    const points=poly.map((p,k)=>p.map((m,j)=>m*(.69+.52*hash(i*27+k*3+j))*(j===1?1.18:1)));
    for(let k=1;k<=5;k++){
      const next=k%5+1;
      for(const ids of [[0,k,next],[6,next,k]]){
        const [a,b,c]=ids.map(index=>points[index]),normal=norm(cross(vector(b,a),vector(c,a)));
        for(const p of [a,b,c])chips.push(...p,...normal,az,born,size,i);
      }
    }
  }
  const shardMesh=staticMesh(chips,[3,3,4]);
  const shaderHead='#version 300 es\nprecision highp float;uniform mat4 vp;uniform float age;uniform vec3 eye;\n';
  const chipShader=g.program(shaderHead+noise+`
    layout(location=0)in vec3 pos;layout(location=1)in vec3 normal;layout(location=2)in vec4 attr;
    uniform bool castShadow;
    uniform float groundFront;
    out vec3 rgb;out float fade;
    mat3 rot(vec3 axis,float a){float c=cos(a),s=sin(a),v=1.-c;vec3 k=axis;return mat3(
      c+k.x*k.x*v,k.y*k.x*v+k.z*s,k.z*k.x*v-k.y*s,
      k.x*k.y*v-k.z*s,c+k.y*k.y*v,k.z*k.y*v+k.x*s,
      k.x*k.z*v+k.y*s,k.y*k.z*v-k.x*s,c+k.z*k.z*v);}
    void main(){float id=attr.w,life=.50+.66*hash(id+92.),u=(age-attr.y)/life;
      if(u<=0.||u>=1.){gl_Position=vec4(3,3,3,1);fade=0.;rgb=vec3(0);return;}
      float az=attr.x,range=.84+hash(id+4.)*.91;
      float r=range+.84*u+.34*hash(id)*u;
      vec3 origin=vec3(r*cos(az)+.10,.028+(1.25+.83*hash(id+81.))*4.*u*(1.-u)*(.38+.62*hash(id+55.)),r*sin(az));
      mat3 spin=rot(normalize(vec3(.3+hash(id),.87,hash(id+347.)-.4)),id+u*(7.*hash(id+9.)-3.3));
      vec3 P=origin+spin*pos*attr.z,N=normalize(spin*normal);
      float facing=max(.0,dot(N,normalize(vec3(-.42,1.,.25))));float rim=max(.0,dot(N,normalize(vec3(-origin.x,.65,-origin.z))));
      float pale=smoothstep(.47,.74,hash(id+29.));
      vec3 rock=mix(vec3(.079,.099,.125),vec3(.42,.67,.73),pale);
      rgb=rock*(.58+.92*facing)+vec3(.18,.57,.78)*rim*(.32+.61*facing)*(.51+.59*pale);
      fade=smoothstep(0.,.09,u)*(1.-smoothstep(.76,1.,u));
      if(castShadow){
        fade*=.28*exp(-origin.y*1.1);
        P.xz+=vec2(.25,.08)*P.y;P.y=.013;rgb=vec3(.015,.065,.092);
        fade*=1.-smoothstep(groundFront-.09,groundFront,P.z);
      }
      gl_Position=vp*vec4(P,1.);}`,
    '#version 300 es\nprecision highp float;in vec3 rgb;in float fade;out vec4 O;void main(){if(fade<.035)discard;O=vec4(rgb*fade,fade);}'
  );
  const shadowUniform=gl.getUniformLocation(chipShader,'castShadow');
  const ring=[];
  for(let strip=0;strip<10;strip++)for(let i=0;i<118;i++){
    const a=i/118,b=(i+1)/118;
    for(const [f,s] of [[a,-1],[a,1],[b,1],[a,-1],[b,1],[b,-1]])ring.push(f,s,strip);
  }
  const ringMesh=staticMesh(ring,[3]);
  const floorMesh=staticMesh([-2.9,-2.9,-2.9,2.9,2.9,2.9,-2.9,-2.9,2.9,2.9,2.9,-2.9],[2]);
  const floorLight=g.program(shaderHead+`
    layout(location=0)in vec2 point;out vec2 uv;
    void main(){uv=point;gl_Position=vp*vec4(point.x,.011,point.y,1.);}`,
    '#version 300 es\nprecision highp float;uniform float age,groundFront;in vec2 uv;out vec4 O;'+noise+`
    void main(){
      float growth=smoothstep(.03,.57,age),tail=smoothstep(.72,1.42,age);
      float r=length(uv*vec2(.98,1.02)),a=atan(uv.y,uv.x);
      float winding=sin(a*3.-age*4.12)+.45*sin(a*7.+r*9.+age*3.);
      float fog=exp(-r*r/(.15+1.56*growth))*(.66+.34*sin(winding+r*7.-age*11.));
      float band=r*6.-growth*4.-age*3.+winding*.54;
      float caustic=exp(-7.*abs(sin(band)))*exp(-pow((r-(.26+1.12*growth-.35*tail))/.68,2.));
      float light=(.24*fog+.42*caustic)*smoothstep(.012,.38,age)*(1.-tail)*(1.-smoothstep(groundFront-.09,groundFront,uv.y));
      O=vec4(mix(vec3(.04,.52,.78),vec3(.38,.86,1.),caustic)*light,light);
    }`);
  const ringShader=g.program(shaderHead+noise+`
    layout(location=0)in vec3 vertex;out vec4 tint;out float groundZ;
    void main(){float id=vertex.z,extra=step(5.,id),born=.20+.034*mod(id,5.)+.34*extra;
      float u=(age-born)/(1.0-.12*extra),phase=clamp(u,0.,1.);
      float angle=vertex.x*(3.1+2.4*hash(id+13.))+id*2.43+phase*(.43+.4*hash(id+42.));
      float arc=n1(vertex.x*24.-phase*3.,id*28.)-.5;
      float r=(1.-exp(-phase*6.))*(1.65+.30*hash(id))+.17*extra+.07*cos(angle*11.+id)+.13*arc;
      float life=smoothstep(0.,.19,u)*(1.-smoothstep(.55,1.,u))*smoothstep(.03,.27,vertex.x)*(1.-smoothstep(.76,1.,vertex.x));
      float branch=n1(vertex.x*19.,id*9.)+.25*sin(vertex.x*19.-age*8.);
      float w=.003+.018*smoothstep(.25,.75,branch);
      r+=vertex.y*w;vec3 P=vec3(cos(angle)*r+.16,.021+.035*abs(arc)+.03*extra,r*sin(angle));
      vec3 color=mix(vec3(.12,.57,1.),vec3(.96,1.4,1.5),smoothstep(.46,.78,branch));
      tint=vec4(color,life*smoothstep(.17,.56,branch));groundZ=P.z;gl_Position=vp*vec4(P,1.);}`,
    '#version 300 es\nprecision highp float;uniform float groundFront;in vec4 tint;in float groundZ;out vec4 O;void main(){float a=tint.a*(1.-smoothstep(groundFront-.09,groundFront,groundZ));if(a<.01)discard;O=vec4(tint.rgb*a,a);}'
  );
  // Tubes, including their small end flares, occupy distinct near and far
  // positions. The far branches are drawn before the core and seen through its gaps.
  const arcs=[
    [-.36,.86,-.87,-.99,2.13,-.78,.17,.82], [.05,.79,.16,.31,2.58,.26,.25,1.01],
    [.20,.98,-.32,.73,2.53,-.62,.32,1.04], [.51,.76,.13,1.49,1.83,.14,.19,.92],
    [.43,.63,.23,1.80,1.25,.29,.22,.99], [-.53,.50,.44,-1.42,.33,.96,.13,.79],
    [.42,.76,-.26,1.30,1.41,-.69,.33,.81], [-.04,.71,-.9,-.43,2.14,-.84,.28,.82]
  ];
  function tubeSet(isFront){
    const vs=[],step=32,sides=8;
    for(let i=0;i<arcs.length;i++){
      const a=arcs[i];if((a[5]>=0)!==isFront)continue;
      for(let j=0;j<step;j++)for(let k=0;k<sides;k++){
        for(const [l,s] of [[j,k],[j+1,k],[j+1,k+1],[j,k],[j+1,k+1],[j,k+1]]){
          vs.push(l/step,tau*s/sides,i,...a);
        }
      }
    }return staticMesh(vs,[3,3,3,2]);
  }
  const tubeFront=tubeSet(true),tubeBack=tubeSet(false);
  const corona=[];
  for(let branch=0;branch<132;branch++)for(let k=0;k<25;k++){
    const u=k/25,v=(k+1)/25;
    for(const [s,side] of [[u,-1],[v,-1],[v,1],[u,-1],[v,1],[u,1]])corona.push(s,side,branch);
  }
  const coronaMesh=staticMesh(corona,[3]);
  const coronaShader=g.program(shaderHead+noise+`
    layout(location=0)in vec3 attr;out vec4 tint;
    vec3 path(float t,float id){
      float group=floor(id/3.),fork=mod(id,3.);
      float a=hash(group+2.)*6.283185+age*.53;
      float lat=mix(-.68,.53,hash(group+58.));
      float arc=mix(.14,.49,hash(group+27.)),bend=(hash(group+15.)-.50)*1.15;
      float s=t;
      if(fork>.5)s=mix(.24+.18*hash(id+9.),.67+.21*hash(id+31.),t);
      a+=s*arc;lat+=bend*s*arc;
      float jitter=(n1(s*21.,group*24.+72.)-.5)*.077+(n1(s*53.,group*11.+73.)-.5)*.038;
      lat+=jitter;
      if(fork>.5){lat+=t*mix(-.19,.20,hash(id+88.));a+=t*.08*sin(id);}
      float open=smoothstep(.055,.50,age),land=smoothstep(.80,1.29,age);
      float r=1.035+.70*open+.15*land;
      vec3 p=vec3(cos(a)*cos(lat),sin(lat),sin(a)*cos(lat))*r;
      p.y=p.y*(1.-.10*open-.45*land)+1.-.17*open-.57*land;
      return p;
    }
    void main(){
      float t=attr.x,id=attr.z,group=floor(id/3.);
      vec3 p=path(t,id),along=normalize(path(t+.004,id)-path(t-.004,id));
      vec3 side=normalize(cross(along,normalize(eye-p)));
      float film=float(2-gl_InstanceID);
      float width=mix(.003,.009,hash(group+18.))*(1.+film*1.30);
      p+=attr.y*side*width*(.28+.72*sin(t*3.141593));
      float pulse=.10+.9*smoothstep(-.6,.58,sin(age*(10.+3.*hash(group))+group+2.5*t));
      float life=smoothstep(.20,.43,age)*(1.-smoothstep(.83,1.27,age));
      float alpha=life*pulse*sin(t*3.141593)*exp(-film*1.08);
      tint=vec4(mix(vec3(.82,1.50,1.62),vec3(.035,.63,1.20),film*.5),alpha);
      gl_Position=vp*vec4(p,1.);
    }`,
    '#version 300 es\nprecision highp float;in vec4 tint;out vec4 O;void main(){if(tint.a<.01)discard;O=vec4(tint.rgb*tint.a,tint.a);}');
  const tubeShader=g.program(shaderHead+noise+`
    layout(location=0)in vec3 attr;layout(location=1)in vec3 origin;layout(location=2)in vec3 dst;layout(location=3)in vec2 times;
    out vec4 tint;
    vec3 path(vec3 a,vec3 b,float f,float id){
      float bow=sin(3.14159*f),j=n1(f*6.-age*2.,id*15.)-.5;
      return mix(a,b,f)+bow*vec3(.12*sin(f*5.+id+age*6.)+.045*j,.08*j,.12*cos(id+3.*f+age*4.));
    }
    void main(){float u=(age-times.x)/(times.y-times.x),q=clamp(u,0.,1.);
      float head=smoothstep(0.,.24,q),tail=smoothstep(.69,.99,q)*.85;
      float f=mix(tail,head,attr.x),id=attr.z;
      vec3 a=origin,b=dst;b.x+=.06*sin(age*8.+id);b.y+=.035*sin(age*12.+1.3*id);
      vec3 p=path(a,b,f,id),t=normalize(path(a,b,f+.003,id)-path(a,b,f-.003,id));
      vec3 side=normalize(cross(t,vec3(.12,.05,1.))),up=cross(t,side);
      float pulse=.84+.16*sin(age*17.+id);float bulb=exp(-pow((attr.x-.940)/.083,2.));
      float sheath=float(3-gl_InstanceID);
      float w=(.008+.013*sin(3.14159*attr.x)+.032*bulb)*(.89+.35*hash(id))*pulse*(1.+sheath*.84);
      w*=smoothstep(0.,.08,attr.x)*(1.-smoothstep(.97,1.,attr.x));
      p+=w*(side*cos(attr.y)+up*sin(attr.y));float light=.58+.45*max(0.,dot(normalize(eye-p),side*cos(attr.y)+up*sin(attr.y)));
      float visibility=smoothstep(0.,.095,u)*(1.-smoothstep(.73,1.,u));
      vec3 rgb=mix(vec3(.07,.53,1.32),vec3(1.55,2.0,2.15),light*.59+bulb*.22);
      rgb=mix(rgb,vec3(.035,.66,1.42),smoothstep(0.,2.,sheath));
      tint=vec4(rgb,visibility*exp(-sheath*1.26));
      gl_Position=vp*vec4(p,1.);}`,
    '#version 300 es\nprecision highp float;in vec4 tint;out vec4 O;void main(){if(tint.a<.01)discard;O=vec4(tint.rgb*tint.a,tint.a);}'
  );
  const bounds=new Map([chipShader,floorLight,ringShader].map(p=>[p,gl.getUniformLocation(p,'groundFront')]));
  function uniforms(program,time){
    g.uniforms(program,time);
    if(bounds.has(program))gl.uniform1f(bounds.get(program),g.groundFront??100);
  }
  return function(time,pass){
    if(time<=0||time>1.66)return;
    let prog,mesh;
    if(pass==='stones'){prog=chipShader;mesh=shardMesh;}
    else if(pass==='floor'){prog=ringShader;mesh=ringMesh;}
    else {prog=tubeShader;mesh=pass==='front'?tubeFront:tubeBack;}
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(pass==='stones');
    gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    if(pass==='floor'){
      uniforms(chipShader,time);gl.uniform1i(shadowUniform,1);
      gl.bindVertexArray(shardMesh.vao);gl.drawArrays(gl.TRIANGLES,0,shardMesh.count);
      uniforms(floorLight,time);gl.bindVertexArray(floorMesh.vao);gl.drawArrays(gl.TRIANGLES,0,floorMesh.count);
    }
    if(pass==='front'){g.uniforms(coronaShader,time);gl.bindVertexArray(coronaMesh.vao);gl.drawArraysInstanced(gl.TRIANGLES,0,coronaMesh.count,3);}
    uniforms(prog,time);if(prog===chipShader)gl.uniform1i(shadowUniform,0);gl.bindVertexArray(mesh.vao);
    if(prog===tubeShader)gl.drawArraysInstanced(gl.TRIANGLES,0,mesh.count,4);
    else gl.drawArrays(gl.TRIANGLES,0,mesh.count);
  };
};
