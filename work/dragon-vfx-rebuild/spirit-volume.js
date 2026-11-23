/* Impact shell meshes and an emissive density field, in incoming-ball units. */
(() => {
  'use strict';

  const vertex = `#version 300 es
    precision highp float;
    precision highp int;
    layout(location=0) in vec3 position;
    uniform mat4 vp;
    uniform float age;
    uniform int layer;
    out vec3 world;
    out vec3 surface;

    float ease(float a,float b){return smoothstep(a,b,age);}
    vec3 corePoint(vec3 n){
      float open=ease(.035,.46),land=ease(.85,1.31);
      float ripple=sin(4.*atan(n.z,n.x)+age*5.+n.y*9.)*.009*open;
      float s=1.+.077*open-.33*land+ripple;
      vec3 q=n;
      // The north pole actually folds into the core. A side or elevated
      // camera therefore sees the far lip and can see only part of the pit.
      q.y-=open*.75*pow(max(0.,n.y),6.0);
      float tilt=.49*open;
      q.yz=mat2(cos(tilt),sin(tilt),-sin(tilt),cos(tilt))*q.yz;
      q.xz*=1.+.047*exp(-pow((age-.15)/.11,2.));
      q.y*=1.-.16*exp(-pow((age-.15)/.11,2.))-.51*land;
      return vec3(0.,1.-.08*open-.62*land,0.)+s*q;
    }
    vec3 shellPoint(vec3 n){
      float open=ease(.06,.52),land=ease(.82,1.29);
      float a=atan(n.z,n.x);
      float deform=.010*sin(3.*a+5.*n.y+age*4.)+.007*cos(7.*a-n.y*8.-age*5.);
      float r=1.005+.675*open+.13*land+deform*open;
      vec3 p=n*r;
      p.y*=1.-.10*open-.45*land;
      p.y+=1.-.17*open-.57*land;
      // The underside becomes a real cap in the plane of the stage.
      // The rear-facing triangles fill the gap between the core and lip.
      if(layer==0)p.y=max(.010,p.y);
      return p;
    }
    void main(){
      surface=normalize(position);
      if(layer==4){
        float t=ease(.89,1.31);
        float r=(.84+.70*t)*(1.-.18*ease(1.38,1.62));
        vec2 ground=surface.xz*r;
        float phase=atan(ground.y,ground.x)*2.-length(ground)*6.+age*4.;
        float crest=.045*sin(phase)*surface.y;
        world=vec3(ground.x,.035+(1.-surface.z)*.104+surface.y*(.26-.15*t)+crest,ground.y);
      }else world=layer==1?corePoint(surface):shellPoint(surface);
      gl_Position=vp*vec4(world,1.);
    }`;

  const fragment = `#version 300 es
    precision highp float;
    precision highp int;
    uniform float age;
    uniform vec3 eye;
    uniform int layer;
    in vec3 world;
    in vec3 surface;
    out vec4 color;
    const float PI=3.14159265,TAU=6.2831853;
    float hash3(vec3 p){
      p=fract(p*.1031);p+=dot(p,p.yzx+33.33);
      return fract((p.x+p.y)*p.z);
    }
    float noise3(vec3 p){
      vec3 c=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(mix(hash3(c),hash3(c+vec3(1,0,0)),f.x),
                     mix(hash3(c+vec3(0,1,0)),hash3(c+vec3(1,1,0)),f.x),f.y),
                 mix(mix(hash3(c+vec3(0,0,1)),hash3(c+vec3(1,0,1)),f.x),
                     mix(hash3(c+vec3(0,1,1)),hash3(c+1.),f.x),f.y),f.z);
    }
    float abscomb(float turns){return abs(fract(turns+.5)-.5);}
    vec2 az(float a){return vec2(cos(a),sin(a));}
    void put(vec3 rgb,float a){color=vec4(rgb*a,a);}
    void main(){
      vec3 n=normalize(surface),v=normalize(eye-world);
      float a=atan(n.z,n.x),lat=asin(clamp(n.y,-1.,1.));
      float turn=age*3.1,open=smoothstep(.055,.44,age);
      float breakup=smoothstep(.75,1.27,age);
      if(world.y<-.008)discard;
      if(layer==4){
        if(n.y<0.)discard;
        float radius=length(n.xz),spin=a-age*3.9;
        vec3 coord=vec3(az(spin+radius*4.6)*radius*6.8,radius*4.9+age*.54);
        float coarse=noise3(coord),grain=noise3(coord*3.9);
        float vapor=.59*coarse+.41*grain;
        float twist=spin*2./TAU-radius*2.05+.17*coarse+.047*grain+.034*sin(3.*spin+radius*7.);
        float arc=abscomb(twist),fine=abscomb(twist*3.+.24*grain-.12*cos(spin*4.));
        float shoulder=exp(-arc*(5.+4.*grain));
        float white=exp(-arc*20.)*(.34+.66*smoothstep(.25,.74,vapor));
        float lace=exp(-fine*13.)*shoulder*grain;
        float lip=1.-smoothstep(.67+.15*coarse,.91+.09*grain,radius);
        float birth=smoothstep(.91,1.16,age),decline=smoothstep(1.28,1.63,age);
        float remain=smoothstep(decline-.13,decline+.13,.21+.62*vapor+.18*shoulder);
        float alpha=(.23+.54*vapor+.42*shoulder)*lip*birth*remain;
        if(alpha<.018)discard;
        vec3 s=mix(vec3(.013,.046,.060),vec3(.12,.35,.42),smoothstep(.28,.80,vapor));
        float spray=pow(max(0.,1.-2.*abscomb(twist*5.1+.73*grain)),3.)*grain*shoulder;
        s+=vec3(.14,.40,.49)*shoulder+vec3(.90,1.37,1.49)*white+vec3(.43,.76,.84)*lace+vec3(.24,.49,.52)*spray;
        put(s,alpha);return;
      }
      float rotating=a-turn-.78*lat;
      vec3 dir=vec3(az(rotating),n.y);
      float grain=noise3(vec3(dir.xy*7.,n.y*16.+.22*age));
      float broad=noise3(vec3(dir.xy*2.7,3.3*n.y-.41*age));
      float widthNoise=.14*sin(3.*rotating+lat*6.)+.09*sin(5.*rotating-lat*11.);
      float bank=lat*1.74+a/TAU-.44*age+widthNoise+.135*(broad-.5);
      float curl=abscomb(bank);
      if(layer==0||layer==3){
        if(age>=1.30)discard;
        // A pressure wave grows upward from the contact patch, along the
        // sphere. Most of the camera-facing shell is open at the peak.
        float sweep=smoothstep(.047+.085*(n.y+1.),.128+.085*(n.y+1.),age);
        if(sweep<.014)discard;
        float bandLat=n.y+.10*sin(a*2.+age*2.2)+.085*cos(a-age*1.7);
        float lowBand=abs(bandLat+.31+.047*sin(a*3.-age*3.));
        float rim=abs(dot(n,v));
        float hair=abscomb(n.y*7.2+.52*sin(a+age*1.7)+.16*sin(5.*a-age*2.4)+.31*broad);
        float streak=exp(-hair*16.)*(.17+.83*smoothstep(.33,.69,grain));
        vec3 normal=normalize(n+.071*(grain-.5)*vec3(sin(a*11.),cos(lat*20.),cos(a*9.)));
        vec3 refl=reflect(-v,normal);
        float panel=pow(max(0.,dot(refl,normalize(vec3(-.58,.66,.48)))),9.);
        float reflectedLine=exp(-abs(refl.y-.47-.15*sin(3.*a-age*2.)-.19*(broad-.5))*18.)
                            *smoothstep(-.58,.49,refl.x+.45*broad);
        float shine=pow(1.-rim,11.)*(.28+.72*smoothstep(.24,.70,grain));
        float surge=exp(-pow((age-.29)/.117,2.));
        float micro=noise3(vec3(az(a)*37.,n.y*63.-age*1.92));
        float speck=smoothstep(.71,.88,micro)*smoothstep(.50,.72,grain);
        float fault=abscomb(2.25*lat+a/TAU+.16*sin(a*2.+lat*6.-age*4.)-.52*age);
        float jag=.09*grain+.065*broad;
        // The shell separates along the visible flow. The lowest intact
        // strip lasts longer and then curls down to the ground.
        float fracture=1.-smoothstep(.77,1.245,age);
        float survival=max(fracture+.14*(.52-rim),1.-smoothstep(.038,.15,lowBand));
        float fragments=1.-smoothstep(survival*.80-.012,survival*.80+.047,fault+jag);
        if(breakup>.001)sweep*=fragments;
        if(age>1.035&&smoothstep(1.035,1.30,age)>.46*broad+.36*(1.-rim)+.25*(1.-smoothstep(.0,.13,lowBand)))discard;
        vec3 navy=mix(vec3(.025,.052,.069),vec3(.068,.116,.145),broad);
        if(layer==0){
          float innerRim=pow(1.-rim,3.7);
          vec3 shell=navy+vec3(.041,.083,.12)*streak+vec3(.08,.21,.29)*innerRim;
          shell+=vec3(.18,.34,.40)*panel+vec3(.19,.41,.53)*reflectedLine;
          shell+=vec3(.85,1.55,1.80)*shine+vec3(1.21,1.66,1.82)*speck*(.25+.75*innerRim);
          shell+=vec3(1.13,1.55,1.70)*surge*innerRim;
          float abrasion=pow(grain,5.)*streak;
          shell+=vec3(.18,.38,.48)*abrasion;
          float curlBank=abscomb(.82*lat+.44*sin(a+.4)+.20*broad-.14*age);
          float curlWake=1.-smoothstep(.16,.35,curlBank);
          float gap=.27+.73*max(curlWake,streak*.7);
          put(shell,sweep*(.61+.28*rim)*gap);return;
        }
        float opening=.26+.16*(broad-.5)+.073*sin(rotating*2.+lat*5.);
        float rimCoverage=1.-smoothstep(opening-.075,opening+.046,rim);
        float lipBreak=smoothstep(-.45,.48,cos(3.*a+lat*4.5-age*1.25)+.29*(broad-.5));
        rimCoverage*=.46+.54*lipBreak;
        float bandWidth=.095+.033*cos(a-age*2.);
        float belt=1.-smoothstep(bandWidth-.023,bandWidth+.012,lowBand);
        float bridge=1.-smoothstep(.030,.052,abs(bandLat+.46));
        // A broken diagonal lip crosses only the lower left of the core.
        float brushHeight=-.11-.27*n.x+.065*sin(a*3.+age*2.3);
        float overlapDist=abs(n.y-brushHeight);
        float overlap=(1.-smoothstep(.037,.092,overlapDist))*(1.-smoothstep(-.27,.19,n.x+.06*sin(age*4.)));
        float mask=max(rimCoverage,max(overlap,max(belt*.98,bridge*.64)));
        if(mask<.024)discard;
        float edge=exp(-abs(lowBand-bandWidth*.68)*46.);
        float shard=rimCoverage*pow(1.-rim,4.2);
        vec3 shell=navy*(.78+.60*streak)+vec3(.21,.23,.29)*edge*belt;
        shell+=vec3(.12,.38,.50)*shard+vec3(.020,.055,.070)*bridge;
        shell+=vec3(.35,.48,.52)*panel+vec3(.22,.47,.56)*reflectedLine;
        shell+=vec3(.31,.49,.52)*overlap*exp(-abs(n.y-brushHeight-.034)*22.);
        shell+=vec3(.73,1.40,1.55)*shine+vec3(1.10,1.62,1.70)*speck*(.31+.65*rimCoverage);
        shell+=vec3(.64,.85,1.)*surge*(.34*overlap+.15*belt+1.08*shard);
        shell+=vec3(.08,.35,.45)*pow(1.-smoothstep(.0,.14,abs(fault-.28*fracture)),3.)*breakup;
        put(shell,mask*sweep*(.72+.23*belt));return;
      }

      // The compressed incoming ball hands its light to the gas inside it.
      float handoff=smoothstep(.027,.14,age)*(1.-smoothstep(.095,.38,age));
      if(handoff<.005)discard;
      float fres=pow(1.-abs(dot(v,n)),2.1);
      float inlet=noise3(n*3.3+vec3(.2,age*2.,.4));
      float flare=smoothstep(.35,.91,1.-length(n-vec3(.14,.25,.89))*.79);
      vec3 initial=mix(vec3(.43,.86,.97),vec3(.66,.95,1.04),.59*inlet+.38*fres);
      initial+=vec3(.36,.40,.39)*flare*(.58+.42*inlet);
      put(initial,handoff);
    }`;

  const volumeVertex = `#version 300 es
    layout(location=0) in vec3 position;
    uniform mat4 vp;
    out vec3 proxy;
    void main(){
      proxy=vec3(0.,.98,0.)+position*1.48;
      gl_Position=vp*vec4(proxy,1.);
    }`;

  const volumeFragment = `#version 300 es
    precision highp float;
    uniform mat4 vp;
    uniform vec3 eye;
    uniform float age;
    uniform bool clipOpaque;
    uniform highp sampler2D opaqueDepth;
    in vec3 proxy;
    out vec4 color;

    float hash3(vec3 p){
      p=fract(p*.1031);p+=dot(p,p.yzx+33.33);
      return fract((p.x+p.y)*p.z);
    }
    float noise3(vec3 p){
      vec3 c=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(mix(hash3(c),hash3(c+vec3(1,0,0)),f.x),
                     mix(hash3(c+vec3(0,1,0)),hash3(c+vec3(1,1,0)),f.x),f.y),
                 mix(mix(hash3(c+vec3(0,0,1)),hash3(c+vec3(1,0,1)),f.x),
                     mix(hash3(c+vec3(0,1,1)),hash3(c+1.),f.x),f.y),f.z);
    }
    // One sample lies inside the burst. Radial flow and extinction use
    // the same field on both sides of the rotating energy.
    vec4 medium(vec3 p,float life,float collapse){
      vec3 q=p-vec3(.07,1.13-.79*collapse,-.04);
      q.yz=mat2(.95,-.31,.31,.95)*q.yz;
      q.xz/=1.-.32*collapse;
      q.y/=.98-.46*collapse;
      float r=length(q.xz),a=atan(q.z,q.x);
      float twist=a+q.y*1.05-age*3.8;
      vec3 drift=vec3(cos(twist)*r,q.y,sin(twist)*r);
      float mass=noise3(drift*3.7+vec3(.05,age*.77,.61));
      float fiber=noise3(vec3(drift.xz*8.5,q.y*26.-age*4.));
      float shape=length(vec2(r*.92,q.y));
      float envelope=1.-smoothstep(.70,.99,shape+.16*(mass-.48));
      float baseFade=smoothstep(.0,.15,p.y);
      if(envelope*baseFade<.002)return vec4(0.);

      float contraction=clamp(q.y+.30,0.,1.4);
      float radius=.76-.19*contraction+.12*(mass-.5);
      float layer=exp(-pow((r-radius)/(.119-.028*contraction),2.));
      float spine=exp(-3.6*shape*shape)*(1.-.89*smoothstep(.05,.52,q.y));
      float axis=(q.y+.20*r+.07*sin(a+.7))*5.5+a/6.2831853-age*.93;
      float warp=.14*sin(2.*twist+5.7*q.y)+.22*(mass-.5)+.052*(fiber-.5);
      float spiral=abs(fract(axis+warp+.5)-.5);
      float band=1.-smoothstep(.044+.07*fiber,.19+.059*fiber,spiral);
      float filament=exp(-abs(fract((axis+warp)*2.+.35*fiber+.5)-.5)*11.);
      float surge=.21+.79*smoothstep(-.47,.81,cos(twist+.58-q.y*1.4));
      float wisps=smoothstep(.26,.72,mass*.70+fiber*.30);
      vec3 hotspot=(q-vec3(.37,.32,.47))*vec3(1.24,1.40,1.13);
      float knot=exp(-4.8*dot(hotspot,hotspot));
      float pulse=exp(-pow((age-.29)/.115,2.));
      float hotArc=layer*smoothstep(-.63,.70,cos(twist-.2-q.y*.9));
      float hotBands=hotArc*band*(.64+.36*wisps)+.43*pulse*layer*band;

      float density=(.15+.54*wisps+1.72*layer*(.29+.71*band)+.55*spine+.32*knot)*baseFade*envelope*life;
      vec3 emission=vec3(.046,.23,.40)*(.68+wisps);
      emission+=vec3(.51,.83,1.07)*layer*surge*(.47+.65*filament);
      emission+=vec3(2.20,2.77,3.31)*layer*band*(.43+.57*surge);
      emission+=vec3(3.05,3.47,3.84)*hotBands+vec3(1.22,1.46,1.63)*knot;
      return vec4(emission,density);
    }

    void main(){
      vec3 ray=normalize(proxy-eye),delta=eye-vec3(0.,.98,0.);
      float b=dot(delta,ray),h=b*b-dot(delta,delta)+1.48*1.48;
      if(h<=0.)discard;
      vec2 span=vec2(max(0.,-b-sqrt(h)),-b+sqrt(h));
      if(ray.y<-.0001)span.y=min(span.y,-eye.y/ray.y);
      if(ray.y>.0001)span.x=max(span.x,-eye.y/ray.y);
      if(clipOpaque){
        float scene=texelFetch(opaqueDepth,ivec2(gl_FragCoord.xy),0).r;
        if(scene<.999999){
          vec4 origin=vp*vec4(eye,1.),direction=vp*vec4(ray,0.);
          float z=scene*2.-1.;
          span.y=min(span.y,(z*origin.w-origin.z)/(direction.z-z*direction.w));
        }
      }
      if(span.y<=span.x)discard;
      float life=smoothstep(.058,.32,age)*(1.-smoothstep(.83,1.34,age));
      float collapse=smoothstep(.79,1.37,age);
      const int samples=52;
      float stride=(span.y-span.x)/float(samples);
      vec3 accumulated=vec3(0.);
      float transmission=1.;
      for(int i=0;i<samples;i++){
        float t=span.x+(float(i)+.5)*stride;
        vec4 gas=medium(eye+ray*t,life,collapse);
        float alpha=1.-exp(-gas.a*stride);
        accumulated+=transmission*gas.rgb*alpha;
        transmission*=1.-alpha;
        if(transmission<.025)break;
      }
      color=vec4(accumulated,1.-transmission);
    }`;

  window.SpiritVolumeBuild=(gl,geom)=>{
    const material=geom.program(vertex,fragment);
    const layer=gl.getUniformLocation(material,'layer');
    const volume=geom.program(volumeVertex,volumeFragment);
    const clipOpaque=gl.getUniformLocation(volume,'clipOpaque');
    const opaqueDepth=gl.getUniformLocation(volume,'opaqueDepth');
    return function render(age,depth){
      if(age<=.001||age>=1.63)return;
      geom.uniforms(material,age);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.CULL_FACE);gl.frontFace(gl.CCW);
      if(age>.91){
        gl.cullFace(gl.BACK);gl.depthMask(false);
        gl.uniform1i(layer,4);geom.draw(geom.sphere);
        if(age>=1.46){gl.depthMask(true);gl.bindVertexArray(null);return;}
      }
      gl.depthMask(false);gl.cullFace(gl.FRONT);
      gl.uniform1i(layer,0);geom.draw(geom.sphere);
      gl.cullFace(gl.BACK);
      if(age<.38){gl.uniform1i(layer,1);geom.draw(geom.sphere);}
      if(age>.058&&age<1.34){
        // The proxy only bounds screen coverage. Truncate the ray at the
        // copied opaque depth, so visible energy in front of a sprite survives.
        gl.disable(gl.DEPTH_TEST);
        geom.uniforms(volume,age);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D,depth??null);
        gl.uniform1i(opaqueDepth,0);
        gl.uniform1i(clipOpaque,Boolean(depth));
        geom.draw(geom.sphere);
        gl.enable(gl.DEPTH_TEST);
        geom.uniforms(material,age);
      }
      gl.depthMask(true);
      gl.uniform1i(layer,3);geom.draw(geom.sphere);
      gl.bindVertexArray(null);
    };
  };
})();
