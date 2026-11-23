/* Original meshes and particle timing for the independent 3D beam study. */
(() => {
  'use strict';
  const shared = `#version 300 es
    precision highp float;
    precision highp int;
    uniform float age;
    uniform int layer;
    const float PI=3.14159265359, TAU=2.*PI;

    float hash(vec2 p){
      vec3 q=fract(vec3(p.xyx)*.1031);
      q+=dot(q,q.yzx+33.33);
      return fract((q.x+q.y)*q.z);
    }
    float noise(vec2 p){
      vec2 i=floor(p), f=fract(p);
      f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                 mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);
    }
    float pulse(float t,float a,float b,float c,float d){
      return smoothstep(a,b,t)*(1.-smoothstep(c,d,t));
    }
    float opening(){return mix(.22,1.,smoothstep(.008,.205,age));}
    float tip(){return min(1180.,166.+max(age,0.)*18000.);}
    float radius(float x,float a){
      float flare=mix(9.,53.,1.-exp(-max(x,0.)/105.));
      float folds=sin(3.*a+x*.019-age*7.)*.08+sin(7.*a-x*.028+age*9.)*.054;
      return flare*opening()*(1.+folds)*(1.-.98*smoothstep(tip()-72.,tip(),x));
    }
    vec2 wheel(float a){return vec2(sin(a),cos(a));}
    float seed(float i,float key){return hash(vec2(i,key));}
  `;
  const vertex = shared + `
    layout(location=0) in vec2 uv;
    uniform mat4 projection;
    uniform vec3 origin,eye;
    out vec2 st;
    out vec3 pos;
    out float envelope;
    flat out float id;
    void main(){
      st=uv;
      id=float(gl_InstanceID);
      envelope=1.;
      float u=uv.x,v=uv.y,a=v*TAU;
      vec3 p=vec3(0.);
      if(layer==0||layer==1){
        float x=tip()*u;
        float r=radius(x,a)*(layer==0?1.04:.85);
        p=vec3(x,vec2(-2.,0.)+r*wheel(a));
      }else if(layer==2){
        float x=mix(11.,tip(),u);
        float a=4.06-(x-62.)*.0084+1.30*(age-.36)+.25*sin(x*.011-age*8.)+id*2.57;
        float w=(1.2+8.9*exp(-pow((x-155.+age*18.)/59.,2.))+
                 3.7*pow(.5+.5*sin(x*.024-age*10.),5.))*opening()*mix(1.,.49,id);
        float edge=v*2.-1.;
        float r=radius(x,a)*1.05+4.+3.3*sin(x*.016-age*8.);
        vec2 radial=wheel(a), tangent=wheel(a+PI/2.);
        p=vec3(x+edge*w*.64,radial*(r-edge*w*.53)+tangent*(edge*w));
      }else if(layer==3){
        float serial=id<.5?0.:floor((age-.038)/.2)-(id-1.);
        float life=(age-.038-serial*.2)/(id<.5?1.07:.54);
        float t=clamp(life,0.,1.), latitude=v*1.19;
        float r=1.35*((id<.5?52.:30.)+(id<.5?62.:53.)*t);
        float lat=latitude+.05*sin(u*TAU*2.-t*8.+id);
        p=vec3(7.-r*sin(lat)*.75-37.*t,r*cos(lat)*wheel(u*TAU));
        envelope=step(0.,serial)*step(serial,7.)*pulse(life,0.,.11,.43,1.)
                 *(1.-smoothstep(1.49,1.69,age));
      }else if(layer==4){
        float offset=fract(id*.618034)*.178-.005;
        float born=floor((min(age,1.635)-offset)/.178)*.178+offset;
        if(id<5.&&age<.085)born=-.003;
        bool shed=id>=21.;
        if(shed)born=1.52+(id-21.)*.012;
        float elapsed=age-born,k=seed(id,22.+born);
        float life=shed?.25+.032*k:.135+.126*k, t=clamp(elapsed/life,0.,1.);
        float speed=mix(1450.,2480.,k), x=20.+35.*k+max(elapsed,0.)*speed;
        float extend=(118.+265.*k)*mix(.76,1.46,t);
        if(age<.064)extend+=76.*k;
        float bearing=id*2.399963+sin(u*3.4+k*8.)*(shed?.38:.17);
        float spread=(6.+40.*seed(id,56.))*(.32+.68*opening())*(.65+.49*u+.45*t);
        vec3 trail=vec3(x+u*extend,spread*wheel(bearing));
        float crossWidth=(shed?3.7+6.8*k:.5+3.8*k)*pow(max(0.,sin(PI*u)),.68)*(1.-t*.53);
        vec3 forward=normalize(eye-trail);
        vec3 across=normalize(cross(vec3(1.,.035,-.025),forward));
        p=trail+across*(v*2.-1.)*crossWidth;
        envelope=step(-.006,born)*pulse(elapsed,-.005,.009,life*.47,life)
                 *(1.-smoothstep(1.774,1.855,age));
      }else if(layer==5){
        float pre=smoothstep(-2.28,-.18,age);
        float flash=exp(-pow((age-.026)/.078,2.));
        float mouth=1.-smoothstep(1.43,1.665,age);
        float latitude=(u-.5)*PI;
        float r=(7.+pre*10.+21.*flash)*(1.+.13*sin(a*5.+latitude*8.+age*14.)+.065*cos(a*7.-latitude*9.));
        p=vec3(cos(latitude)*sin(a)*.8,sin(latitude),cos(latitude)*cos(a))*r;
        envelope=smoothstep(-2.22,-1.92,age)*mouth;
      }else if(layer==6){
        float cycle=fract((age+2.4)*(1.08+.54*seed(id,3.))+seed(id,11.));
        float angle=id*2.399963,incline=.64*sin(id*2.76);
        vec3 dir=normalize(vec3(cos(angle),incline,sin(angle)));
        float dist=(1.-cycle*cycle)*(120.+seed(id,3.)*120.);
        vec3 here=dir*(dist+(1.-u)*32.*sin(PI*cycle));
        vec3 across=normalize(cross(dir,normalize(eye-here)));
        p=here+across*(v*2.-1.)*(.3+2.3*seed(id,8.))*sin(PI*u);
        envelope=sin(PI*cycle)*pulse(age,-2.22,-1.86,-.42,-.095);
      }else if(layer==8){
        vec3 facing=normalize(eye),across=normalize(cross(vec3(0.,-1.,0.),facing));
        vec3 up=cross(facing,across);
        float flash=exp(-pow((age-.031)/.089,2.));
        float size=37.+37.*flash+14.*smoothstep(-1.9,-.12,age);
        p=(across*(2.*u-1.)+up*(2.*v-1.))*size;
        envelope=pulse(age,-2.26,-1.94,1.47,1.67);
      }else{
        float angle=TAU*(u*.65+id*.37)+(age+2.4)*1.8;
        float r=67.+17.*id+4.*sin(u*12.+age*8.);
        float taper=pulse(u,0.,.13,.68,1.);
        p=vec3(r*cos(angle),0.,r*sin(angle))+vec3(cos(angle),0.,sin(angle))*(v*2.-1.)*3.1*taper;
        envelope=taper*pulse(age,-2.26,-1.82,-.25,-.04);
      }
      pos=p;
      vec3 world=layer==7 ? vec3(p.x-50.,79.4,p.z) : p+origin;
      gl_Position=projection*vec4(world,1.);
    }
  `;
  const fragment = shared + `
    in vec2 st;
    in vec3 pos;
    in float envelope;
    flat in float id;
    uniform vec3 eye;
    out vec4 outColor;
    void main(){
      if(envelope<=.001)discard;
      vec3 light;
      float alpha=1.;
      float x=pos.x,u=st.x,v=st.y;
      if(layer==0||layer==1){
        if(age<.004||age>1.76||x<max(0.,age-1.58)*232.)discard;
        float a=v*TAU;
        float travel=x*.011-age*(layer==0?4.9:7.6);
        // Follow the skin around its seam with periodic latitude coordinates.
        vec2 skin=vec2(travel+.6*cos(a),3.9*sin(a)+2.1*cos(a));
        float large=noise(skin), detail=noise(skin*vec2(2.9,2.65)+vec2(4.,2.));
        float filament=noise(skin*vec2(5.4,5.1)+vec2(0.,-9.));
        float margin=pow(abs(sin(a)),2.);
        float flow=.74*large+.21*detail+.05*filament;
        float holes=smoothstep(1.38,1.74,age);
        float threshold, cut;
        if(layer==0){
          threshold=.608+.22*holes-.029*margin;
          cut=flow-threshold;
          light=mix(vec3(.007,.013,.026),vec3(.055,.09,.18),
                    smoothstep(.51,.75,flow)*.53+pow(margin,2.)*.28);
        }else{
          threshold=.267+.41*holes+.057*margin;
          cut=flow-threshold;
          float levels=flow+.10*sin(a*4.+x*.012-age*5.)-.055*margin;
          float middle=smoothstep(.35,.48,levels);
          float live=smoothstep(.51,.63,levels);
          float heat=smoothstep(.568,.656,levels)*(1.-.51*holes);
          light=mix(vec3(.060,.19,.42),vec3(.22,.53,1.12),middle);
          light=mix(light,vec3(.46,1.26,2.1),live);
          light=mix(light,vec3(1.8,2.2,2.77),heat);
          light+=vec3(.064,.21,.38)*(1.-smoothstep(4.,78.,x));
        }
        float aa=max(.013,fwidth(cut));
        alpha=smoothstep(-aa,aa,cut);
        if(alpha<.29)discard;
        alpha=mix(.87,1.,alpha);
      }else if(layer==2){
        if(age<0.||age>1.64)discard;
        float core=1.-abs(v*2.-1.);
        float scroll=noise(vec2(x*.025-age*12.,v*1.2));
        float lobe=exp(-pow((x-149.)/47.,2.));
        float flow=pow(.5+.5*sin(x*.031-age*12.+.9),3.);
        float heat=.11+.90*lobe+.67*flow;
        light=mix(vec3(1.2,.24,.012),vec3(3.7,1.34,.24),clamp(heat,0.,1.));
        light=mix(light,vec3(4.2,2.9,1.7),core*clamp(heat-.30,0.,.63));
        alpha=pulse(age,-.007,.020,1.34,1.64)*pulse(x,9.,36.,tip()-70.,tip());
        alpha*=smoothstep(.012,.45,core)*(smoothstep(.19,.50,scroll)+.1*lobe)*mix(1.,.68,id);
      }else if(layer==3){
        float a=u*TAU;
        float facing=abs(dot(normalize(pos-vec3(13.,0.,0.)),normalize(eye-pos)));
        float crest=.19+.057*sin(a*3.-age*8.+id)+.036*noise(vec2(a*7.,age*4.));
        float rim=exp(-pow((v-crest)/(.050+.010*id),2.));
        float ghost=exp(-pow((v-crest-.19)/.17,2.));
        float trim=.36+.64*smoothstep(-.64,.58,cos(a+2.9+id*.46)+.20*sin(a*5.));
        float sparks=noise(vec2(a*5.1+age*3.,v*2.3));
        light=mix(vec3(.095,.43,1.17),vec3(.53,1.43,2.55),rim);
        alpha=envelope*(rim+.29*ghost)*trim*(.70+.30*sparks)*mix(1.,.74,facing);
      }else if(layer==4){
        float streak=pulse(u,0.,.16,.61,1.);
        float profile=1.-abs(v*2.-1.);
        float split=noise(vec2(u*8.-age*12.,id));
        float sheet=step(20.5,id);
        float warm=(id==2.&&age<.09)?1.:0.;
        light=mix(mix(vec3(.19,.77,1.55),vec3(1.14,2.04,2.67),pow(profile,1.7)),
                  vec3(2.0,.63,.07),warm);
        light=mix(light,vec3(.26,.82,1.30)+vec3(.65,.85,.84)*profile,sheet);
        alpha=envelope*streak*smoothstep(.06,.63,profile)*(.45+.55*split);
      }else if(layer==5){
        vec3 normal=normalize(pos);
        float face=abs(dot(normal,normalize(eye-pos)));
        float flash=exp(-pow((age-.035)/.071,2.));
        float heat=smoothstep(.14,.91,face);
        light=mix(vec3(.12,.67,1.53),vec3(1.65,2.5,3.1),heat);
        light*=.83+1.05*flash+.13*sin(age*31.);
        alpha=envelope*smoothstep(.08,.55,face);
      }else if(layer==6){
        const vec3 cool=vec3(.48,1.23,1.89),warm=vec3(1.49,.63,.12);
        light=mix(cool*1.18,warm,step(.84,seed(id,19.))*.85);
        alpha=envelope*pow(max(0.,sin(PI*u)),.8)*smoothstep(.0,.78,1.-abs(v*2.-1.));
      }else if(layer==8){
        float radius=length(st*2.-1.);
        float flash=exp(-pow((age-.033)/.083,2.));
        float discharge=pulse(age,-.022,.16,1.36,1.65);
        light=vec3(.19,.56,1.40);
        alpha=envelope*(.63+1.33*flash+.50*discharge)*exp(-5.5*radius*radius)
             *(1.-smoothstep(.64,1.,radius));
      }else{
        light=vec3(.49,.75,1.);
        alpha=.48*envelope*smoothstep(.0,.44,1.-abs(v*2.-1.))*
                    smoothstep(.27,.59,noise(vec2(u*8.+age*3.,id)));
      }
      if(alpha<.008)discard;
      outColor=vec4(light*alpha,min(1.,alpha));
    }
  `;

  window.createDragonBeamStudyEffects = function(gl, makeProgram, makeSurface) {
    const program = makeProgram(gl, vertex, fragment);
    const uniforms = Object.fromEntries(['age','layer','projection','origin','eye'].map(
      name => [name,gl.getUniformLocation(program,name)]));
    const tube = makeSurface(gl,138,64);
    const ribbon = makeSurface(gl,120,8);
    const layers = [
      {name:'core',id:1,mesh:tube,depth:true,phase:[.004,1.76]},
      {name:'shadow',id:0,mesh:tube,depth:true,phase:[.008,1.76]},
      {name:'ground',id:7,mesh:ribbon,instances:2,phase:[-2.26,-.04]},
      {name:'intake',id:6,mesh:makeSurface(gl,12,2),instances:30,phase:[-2.22,-.095]},
      {name:'filaments',id:4,mesh:makeSurface(gl,40,5),instances:28,phase:[-.004,1.855]},
      {name:'amber',id:2,mesh:ribbon,instances:2,phase:[0,1.64]},
      {name:'waves',id:3,mesh:makeSurface(gl,96,36),instances:4,phase:[-.055,1.69]},
      {name:'muzzle',id:5,mesh:makeSurface(gl,24,40),phase:[-2.22,1.665]},
      {name:'muzzle',id:8,mesh:makeSurface(gl,1,1),phase:[-2.26,1.67]},
    ];

    return function render(age, stage, hidden) {
      gl.disable(gl.CULL_FACE);
      gl.useProgram(program);
      gl.uniform1f(uniforms.age,age);
      gl.uniformMatrix4fv(uniforms.projection,false,stage.matrix);
      gl.uniform3fv(uniforms.origin,stage.anchor);
      gl.uniform3fv(uniforms.eye,stage.eye.map((component, i) => component-stage.anchor[i]));
      for (const {name,id,mesh,depth,instances,phase} of layers) {
        if (name===hidden || age<phase[0] || age>phase[1]) continue;
        gl.uniform1i(uniforms.layer,id);
        gl.depthMask(!!depth);
        gl.blendFuncSeparate(gl.ONE,depth?gl.ONE_MINUS_SRC_ALPHA:gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
        gl.bindVertexArray(mesh.vao);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.faces.buffer);
        gl.drawElementsInstanced(gl.TRIANGLES,mesh.faces.count,gl.UNSIGNED_SHORT,0,instances??1);
      }
      gl.depthMask(true);
    };
  };
})();
