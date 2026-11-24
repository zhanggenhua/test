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
    uniform float groundY;
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
      #ifdef STUDIO
      float rupture=ease(.013,.114);
      q.y*=1.-.52*rupture;
      q.xz*=1.+rupture*(.22+.19*sin(5.*atan(n.z,n.x)+n.y*5.));
      q.y-=.16*rupture;
      #endif
      q.xz*=1.+.047*exp(-pow((age-.15)/.11,2.));
      q.y*=1.-.16*exp(-pow((age-.15)/.11,2.))-.51*land;
      return vec3(0.,1.-.08*open-.62*land,0.)+s*q;
    }
    vec3 shellPoint(vec3 n){
      float open=ease(.06,.52),land=ease(.82,1.29);
      float a=atan(n.z,n.x);
      #ifdef STUDIO
      float h=.5+.5*n.y;
      float delay=.025+.043*(.5+.5*sin(a*3.+.8));
      float growth=1.-exp(-max(0.,age-delay)*8.8);
      float spread=ease(.24,.72);
      // Map the original mesh to the upper half of a dome whose
      // equator follows the stage floor, even during the incoming squash.
      float rim=sqrt(max(0.,1.-h*h));
      float edge=.043*sin(3.*a-5.*h+age*1.7)+.038*cos(5.*a+7.*h-age*2.1);
      float lobe=.052*pow(.5+.5*sin(2.*a-age*.65),3.);
      float reach=.82+1.28*growth+.18*spread+.18*land;
      float radius=rim*reach*(1.+edge+lobe);
      float lift=mix(.37,1.03,growth)*reach*(1.-.69*land);
      float height=groundY+.008+h*lift*(1.+rim*edge*.83);
      return vec3(cos(a)*radius,height,sin(a)*radius);
      #else
      float deform=.010*sin(3.*a+5.*n.y+age*4.)+.007*cos(7.*a-n.y*8.-age*5.);
      float r=1.005+.675*open+.13*land+deform*open;
      vec3 p=n*r;
      p.y*=1.-.10*open-.45*land;
      p.y+=1.-.17*open-.57*land;
      // The underside becomes a real cap in the plane of the stage.
      // The rear-facing triangles fill the gap between the core and lip.
      if(layer==0)p.y=max(.010,p.y);
      return p;
      #endif
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
      #ifdef STUDIO
      if(world.y<-.008&&layer!=0&&layer!=3)discard;
      #else
      if(world.y<-.008)discard;
      #endif
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
      #ifdef STUDIO
      if(layer==0||layer==3){
        float h=.5+.5*n.y,side=cos(a-.68+age*.64);
        float ripple=.055*sin(3.*a+age*1.8)+.042*(broad-.5);
        float skew=.038*sin(3.*a+.5)+.022*cos(5.*a-.4);
        float sweep=smoothstep(.020+.077*h+skew,.13+.11*h+skew,age);
        float collapse=smoothstep(.63,1.44,age);
        float peak=exp(-pow((age-.25)/.21,2.));
        float strike=smoothstep(.079,.157,age)*(1.-smoothstep(.28,.54,age));
        float torn=smoothstep(.10,.50,grain+.26*cos(a*3.1-h*14.+age));
        float split=cos(3.*a-2.*h-age*.68)+.47*cos(7.*a+h*6.2+age);
        float splitGate=smoothstep(-.81,-.12,split+.32*(grain-.5));
        float web=1.-smoothstep(.24,.77,collapse*1.22+.24*torn);
        web*=mix(.46,1.,splitGate);
        float shoulder=.81+.096*sin(a+age*1.1)+ripple;
        float crest=exp(-pow((h-shoulder)/(.032+.02*grain),2.));
        float darkBody=smoothstep(.03,.26,h)*(1.-smoothstep(shoulder-.05,shoulder+.04,h));
        float broadEdge=exp(-pow((h-shoulder+.061)/(.073+.029*grain),2.));
        float turbulent=.28+.72*smoothstep(.22,.7,grain*.69+.31*broad);
        float bandA=.14+.102*sin(a+.63-age*.55)+ripple;
        float elbow=smoothstep(.092,.34,age);
        float bandB=.51+.113*elbow+.19*sin(a+1.2-age*.71)+ripple*.44;
        float tracking=.39+.61*smoothstep(-.82,.69,cos(a+age*.85+.35));
        float nearA=exp(-pow((h-bandA)/(.091+.037*grain),2.));
        float nearB=1.-smoothstep(.055+.017*grain,.130+.042*strike,abs(h-bandB));
        nearB*=tracking;
        float lip=exp(-pow((h-bandB-.083)/(.023+.014*grain),2.))*tracking;
        float filament=exp(-abscomb(h*11.5+.37*sin(a+age*.92)+.22*grain)*17.);
        float outline=exp(-pow((h-bandA-.065)/.035,2.));
        vec3 soot=mix(vec3(.019,.032,.054),vec3(.076,.103,.152),.27+.50*broad);
        vec3 ash=mix(vec3(.048,.071,.111),vec3(.19,.235,.32),filament*.71+broad*.26);
        vec3 edge=mix(vec3(.15,.34,.71),vec3(.39,.66,1.18),grain);
        float cut=smoothstep(-.86,-.16,side+.20*(grain-.5));
        // The high rear arc stays behind the glow. The near skirt crosses
        // the bottom of the core and leaves the cap open toward the camera.
        float orientation=dot(az(a),normalize(eye.xz+vec2(.0001,0.)));
        float rear=1.-smoothstep(-.20,.13,orientation);
        if(layer==0){
          float alpha=sweep*web*max(.89*darkBody,.90*crest)*rear;
          if(alpha<.012)discard;
          vec3 tint=soot+ash*filament*.61+edge*(crest*.94+broadEdge*.44)*(.97+2.78*peak)*turbulent;
          tint+=vec3(.23,.38,.58)*strike*exp(-pow((h-.52-ripple)/.17,2.));
          put(tint,alpha);
        }else{
          float nearMask=max(nearA*.98,nearB*cut*.96);
          float upperLip=crest*(.10+.38*cut)*smoothstep(.47,.70,broad+.19*side)*(1.-collapse);
          float shear=smoothstep(-.65,.48,cos(2.*a+h*3.+age*1.4)+.44*broad);
          float nearProfile=max(nearMask*(.32+.68*shear),upperLip);
          nearProfile=max(nearProfile,(.83*nearB+.12*lip)*strike);
          float alpha=sweep*web*nearProfile*(1.-rear);
          float slab=1.-smoothstep(.049+.015*grain,.096+.014*broad,abs(h-bandB));
          float hitMask=strike*slab*smoothstep(-.10,.36,orientation);
          alpha=max(alpha*.88,hitMask*.986);
          if(alpha<.017)discard;
          vec3 near=ash*(.85+.60*grain)+edge*(.68*outline+.88*upperLip)*(1.+peak*.85);
          vec3 pressure=vec3(.52,.58,.63)*(.69+.31*grain)+vec3(.26,.40,.59)*lip;
          near=mix(near,pressure,clamp(max(hitMask,strike*nearB)+.34*lip*strike,0.,1.));
          put(near,alpha);
        }
        return;
      }
      #else
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

      #endif

      // The compressed incoming ball hands its light to the gas inside it.
      #ifdef STUDIO
      float handoff=smoothstep(.008,.033,age)*(1.-smoothstep(.038,.124,age));
      #else
      float handoff=smoothstep(.027,.14,age)*(1.-smoothstep(.095,.38,age));
      #endif
      if(handoff<.005)discard;
      float fres=pow(1.-abs(dot(v,n)),2.1);
      float inlet=noise3(n*3.3+vec3(.2,age*2.,.4));
      float flare=smoothstep(.35,.91,1.-length(n-vec3(.14,.25,.89))*.79);
      vec3 initial=mix(vec3(.43,.86,.97),vec3(.66,.95,1.04),.59*inlet+.38*fres);
      initial+=vec3(.36,.40,.39)*flare*(.58+.42*inlet);
      #ifdef STUDIO
      float crackLife=smoothstep(.018,.100,age);
      float crackField=abs(sin(3.*a+lat*6.1+(inlet-.5)*3.4));
      float aperture=.015+crackLife*(.35+.22*inlet);
      float rim=exp(-abs(crackField-aperture)*13.)*crackLife;
      float solid=smoothstep(aperture-.027,aperture+.083,crackField);
      put(initial+vec3(1.49,1.67,1.89)*rim,handoff*mix(.19,1.,solid));
      #else
      put(initial,handoff);
      #endif
    }`;

  const volumeVertex = `#version 300 es
    layout(location=0) in vec3 position;
    uniform mat4 vp;
    uniform float age;
    out vec3 proxy;
    #ifdef STUDIO
    float extentAt(float age){return 2.06+.70*smoothstep(.72,1.42,age);}
    #else
    float extentAt(float age){return 1.48;}
    #endif
    void main(){
      proxy=vec3(0.,.98,0.)+position*extentAt(age);
      gl_Position=vp*vec4(proxy,1.);
    }`;

  const volumeFragment = `#version 300 es
    precision highp float;
    uniform mat4 vp;
    uniform vec3 eye;
    uniform float age;
    uniform bool clipOpaque;
    uniform float groundY;
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
    #ifdef STUDIO
    float extentAt(float age){return 2.06+.70*smoothstep(.72,1.42,age);}

    vec4 groundVortex(vec3 p){
      vec2 plane=(p.xz-vec2(.04,-.02))*vec2(.98,1.06);
      float r=length(plane)*.73,a=atan(plane.y,plane.x);
      if(r>2.14||p.y>.95)return vec4(0.);
      float swing=a-age*1.75-3.7*r;
      vec3 flow=vec3(cos(swing)*r,p.y*2.3,sin(swing)*r);
      float vapor=noise3(flow*5.8+vec3(.2,age*.71,.45));
      float billow=noise3(flow*11.2+vec3(-.04,-age*.98,.78));
      float fleck=noise3(flow*18.1+vec3(.3,-age*1.38,.71));
      float roll=noise3(vec3(plane*8.6,p.y*7.1+.31*age));
      float curl=noise3(vec3(plane*4.1,p.y*3.3-age*.68));
      float margin=r+.42*(vapor-.50)+.29*(billow-.45)+.18*(roll-.40)+.073*sin(7.*a+age*.8);
      float outflow=1.-smoothstep(1.27,1.78,margin);
      float heat=abs(fract((a-3.93*r-age*1.61)*.477465+.32*vapor+.18*billow+.12*curl+.5)-.5);
      float shoulder=exp(-heat*5.9),streak=exp(-heat*(10.+16.*fleck));
      float upper=.16+.35*vapor+.27*smoothstep(.69,1.44,r);
      float height=exp(-p.y*p.y/(upper*upper));
      float core=1.-smoothstep(.99,1.52,r+.21*vapor);
      float tuft=smoothstep(.28,.71,curl*.37+roll*.41+billow*.22);
      float smoke=(.19+.96*smoothstep(.22,.76,vapor*.37+billow*.22+.41*tuft))*height;
      float soot=(.93+3.06*smoothstep(.65,1.40,r))*smoke;
      float gas=(soot+3.03*height*core*streak)*outflow*smoothstep(0.,.061,p.y);
      float taper=smoothstep(.24,.86,fleck+.30*vapor+.18*(roll-.5));
      float pulse=.28+.72*smoothstep(.21,.83,noise3(flow*8.8+vec3(age*5.,.2,1.)));
      float splinter=exp(-abs(fract(heat*3.+.36*billow+age*.48+.5)-.5)*19.)*shoulder;
      vec3 light=vec3(.010,.017,.027)*(1.+vapor);
      light+=vec3(.13,.27,.68)*core*shoulder*(.68+.65*vapor);
      light+=vec3(.92,1.33,2.29)*core*height*streak*(.62+1.53*taper*pulse);
      float eddy=smoothstep(.47,.80,billow*.62+curl*.38);
      light+=vec3(.34,.65,1.52)*splinter*core*eddy*pulse;
      light+=vec3(.032,.053,.081)*tuft*smoothstep(.82,1.42,r)*smoothstep(.05,.39,p.y);
      return vec4(light,gas*(1.-smoothstep(1.71,2.19,age)));
    }

    vec4 pressureDust(vec3 p,float age){
      float r=length(p.xz),a=atan(p.z,p.x);
      float speed=1.-exp(-max(0.,age-.05)*5.2);
      float drift=noise3(p*6.+vec3(0.,age*2.4,0.));
      float front=(.61+1.92*speed)*(.91+.11*sin(3.*a+.9)+.055*sin(7.*a-age*4.));
      float thickness=.11+.20*speed;
      float wave=exp(-pow((r-front+.085*(drift-.5))/thickness,2.));
      float spread=exp(-p.y*p.y/(.022+.12*speed*drift));
      float pulse=smoothstep(.065,.17,age)*(1.-smoothstep(.25,.62,age));
      float bands=smoothstep(.19,.72,drift+.20*cos(6.*a-r*4.+age*4.));
      float density=1.84*wave*spread*pulse*(.33+.67*bands)*smoothstep(0.,.046,p.y);
      return vec4(mix(vec3(.19,.33,.42),vec3(.47,.69,.94),bands),density);
    }
    #else
    float extentAt(float age){return 1.48;}
    #endif

    // One sample lies inside the burst. Radial flow and extinction use
    // the same field on both sides of the rotating energy.
    vec4 medium(vec3 p,float life,float collapse){
      #ifdef STUDIO
      vec3 above=p-vec3(.024,groundY,-.034);
      vec3 q=above;
      float drive=1.-exp(-age*11.4);
      q.xz/=mix(.58,1.58,drive)-.39*collapse;
      q.y/=mix(.57,1.48,drive)-1.19*collapse;
      #else
      vec3 q=p-vec3(.07,1.13-.79*collapse,-.04);
      q.yz=mat2(.95,-.31,.31,.95)*q.yz;
      q.xz/=1.-.32*collapse;
      q.y/=.98-.46*collapse;
      #endif
      float r=length(q.xz),a=atan(q.z,q.x);
      float twist=a+q.y*1.05-age*3.8;
      vec3 drift=vec3(cos(twist)*r,q.y,sin(twist)*r);
      float mass=noise3(drift*3.7+vec3(.05,age*.77,.61));
      float fiber=noise3(vec3(drift.xz*8.5,q.y*26.-age*4.));
      float shape=length(vec2(r*.92,q.y));
      float envelope=1.-smoothstep(.70,.99,shape+.16*(mass-.48));
      #ifdef STUDIO
      float baseFade=smoothstep(0.,.062,above.y);
      envelope*=1.-smoothstep(.97,1.06,q.y);
      float folding=smoothstep(.33,.81,collapse);
      vec4 groundGas=folding>.001?groundVortex(above):vec4(0.);
      groundGas.a*=folding;
      if(age<.62)groundGas=pressureDust(above,age);
      if(envelope*baseFade<.002&&(age>=.34||length(above-vec3(.16,.48,-.04))>1.37))return groundGas;
      #else
      float baseFade=smoothstep(.0,.15,p.y);
      if(envelope*baseFade<.002)return vec4(0.);
      #endif

      float contraction=clamp(q.y+.30,0.,1.4);
      #ifdef STUDIO
      // The emissive wave is an upper dome. Its widest cross section
      // meets the floor instead of hovering at the center of a sphere.
      float domeY=clamp(q.y,0.,1.);
      float radius=.93*sqrt(1.-domeY*domeY)+.075*(mass-.5);
      float layer=exp(-pow((r-radius)/(.153-.022*contraction),2.));
      #else
      float radius=.76-.19*contraction+.12*(mass-.5);
      float layer=exp(-pow((r-radius)/(.119-.028*contraction),2.));
      #endif
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
      #ifdef STUDIO
      emission*=.48+.25*pulse;
      float push=1.-exp(-max(0.,age-.009)*11.2);
      float basalEdge=exp(-pow((length(above.xz)-1.48*push)/(.11+.05*push),2.));
      float basalSheet=exp(-pow((above.y-.07)/(.067+.04*mass),2.));
      float basalFlash=1.-smoothstep(.33,.88,age);
      float front=basalSheet*basalEdge*basalFlash;
      density+=2.25*front*life*baseFade;
      emission+=vec3(.48,1.47,2.12)*front*(.48+.52*wisps);
      float fissure=smoothstep(-.55,.53,sin(3.*a+q.y*4.6-age*4.1)+.58*(2.*mass-1.));
      density*=.48+.52*fissure;
      float helicalPhase=(q.y+.16*r)*6.1+a/6.2831853-age*1.04+.15*mass;
      float sheet=exp(-abs(fract(helicalPhase+.5)-.5)*13.);
      emission+=vec3(.73,1.07,1.52)*sheet*layer*(.48+.52*surge);
      float unwound=(q.y+.12*r)*9.1+a/6.2831853-age*1.23+.14*mass;
      float threads=exp(-abs(fract(unwound+.5)-.5)*(16.+10.*fiber));
      float whiteArc=smoothstep(-.62,.88,cos(twist+.60+q.y*1.15));
      float wake=(.16+.84*smoothstep(.10,.77,fiber))*layer;
      emission+=vec3(.92,1.30,1.84)*threads*wake*(.35+.65*whiteArc);
      emission+=vec3(.37,.56,.91)*filament*layer;
      float settle=smoothstep(.59,.94,collapse);
      emission=mix(emission,emission*vec3(.34,.47,.81),settle);
      float shockTiming=smoothstep(.072,.166,age)*(1.-smoothstep(.193,.340,age));
      vec3 focus=vec3((above.x-.16)*.93,above.y-.48,above.z+.04);
      float shockShape=1.-smoothstep(.48+shockTiming*.27,.93+shockTiming*.22,length(focus)+.18*(mass-.5));
      float ignition=6.9*shockTiming*shockShape*baseFade*(.62+.38*mass);
      vec3 flash=vec3(2.37,2.83,3.14)*(.76+.24*fiber);
      float upperGas=density*(1.-folding),sigma=upperGas+groundGas.a+ignition;
      vec3 energy=emission*upperGas+groundGas.rgb*groundGas.a+flash*ignition;
      return vec4(energy/max(.00001,sigma),sigma);
      #else
      return vec4(emission,density);
      #endif
    }

    void main(){
      vec3 ray=normalize(proxy-eye),delta=eye-vec3(0.,.98,0.);
      float extent=extentAt(age);
      float b=dot(delta,ray),h=b*b-dot(delta,delta)+extent*extent;
      if(h<=0.)discard;
      vec2 span=vec2(max(0.,-b-sqrt(h)),-b+sqrt(h));
      #ifdef STUDIO
      float floorOffset=groundY-eye.y;
      #else
      float floorOffset=-eye.y;
      #endif
      if(ray.y<-.0001)span.y=min(span.y,floorOffset/ray.y);
      if(ray.y>.0001)span.x=max(span.x,floorOffset/ray.y);
      if(clipOpaque){
        float scene=texelFetch(opaqueDepth,ivec2(gl_FragCoord.xy),0).r;
        if(scene<.999999){
          vec4 origin=vp*vec4(eye,1.),direction=vp*vec4(ray,0.);
          float z=scene*2.-1.;
          span.y=min(span.y,(z*origin.w-origin.z)/(direction.z-z*direction.w));
        }
      }
      if(span.y<=span.x)discard;
      #ifdef STUDIO
      float life=smoothstep(.048,.17,age)*(1.-smoothstep(1.04,2.06,age));
      float collapse=smoothstep(.87,1.80,age);
      #else
      float life=smoothstep(.058,.32,age)*(1.-smoothstep(.83,1.34,age));
      float collapse=smoothstep(.79,1.37,age);
      #endif
      #ifdef STUDIO
      const int samples=69;
      #else
      const int samples=52;
      #endif
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

  // Broken strips expand out of the impact, while the bright filaments
  // wind around the turbulent gas at distinct heights and radii.
  function burstStrips(gl,geom){
    const vertex = `#version 300 es
      precision highp float;
      uniform mat4 vp;
      uniform vec3 eye;
      uniform float age,groundY;
      out vec3 world;
      out vec4 strip;
      flat out vec3 style;
      const int segments=92;
      const float tau=6.2831853;
      float seed(float n){return fract(sin(n*39.137+2.91)*14437.37);}
      vec3 path(float t,float id,float elapsed,float outer){
        float group=(id+.5)/29.;
        float grow=1.-exp(-max(0.,elapsed)*10.6);
        float rise=1.-exp(-max(0.,elapsed)*7.8);
        float fall=smoothstep(.69,1.26,age);
        float a0=tau*seed(id*2.7+8.);
        float spin=age*(3.35+.53*seed(id+4.))+age*age*.62;
        float turn=a0+spin+t*mix(2.4,7.5,seed(id+73.));
        float level=.049+group*.91;
        float rounded=sqrt(1.-level*level);
        float reach=1.47*rounded*mix(.66,1.02,grow);
        float rag=.037*sin(7.*turn+id*.7)+.020*cos(13.*turn-id);
        float taper=1.-.59*fall;
        float y=.026+1.50*level*(.62+.38*rise)*taper
          + min(level,.23)*(.53*(t-.5)+.30*sin(turn*2.2+id*.67));
        if(outer>.5){
          float n=id-29.;
          float fan=1.-exp(-max(0.,elapsed)*(6.2+seed(n+77.)*4.));
          turn=a0+age*(.6+1.25*seed(n+57.))+(t-.4)*(.74+1.35*seed(n+6.));
          reach=(.70+fan*(1.20+.46*seed(n+7.)))*(.83+.25*t);
          rag*=2.3;
          y=.13+(fan*(.32+.64*seed(n+3.)))*sin(t*2.35+.36)*(1.-.77*fall);
          if(n>=4.){
            float aim=a0+.105*sin(t*4.7+n)+.091*t*t;
            turn=aim+age*.44;
            reach=.36+.32*fan+t*(.18+fan*(1.65+.59*seed(n+94.)));
            y=.12+fan*(.36+.89*seed(n+19.))*pow(t,.83)*(1.-.68*fall);
            rag*=.63;
          }
        }
        return vec3(cos(turn)*(reach+rag)+.039*sin(age*3.+group*3.),groundY+y,sin(turn)*(reach+rag));
      }
      void main(){
        const vec2 corner[6]=vec2[6](vec2(0,-1),vec2(1,-1),vec2(1,1),vec2(0,-1),vec2(1,1),vec2(0,1));
        vec2 c=corner[gl_VertexID%6];
        float t=(float(gl_VertexID/6)+c.x)/float(segments);
        float id=float(gl_InstanceID),outer=step(29.,id);
        float jet=step(33.,id);
        float birth=mix(.055+.16*seed(id+19.),.031+.28*seed(id+27.),outer);
        birth=mix(birth,.051+.103*seed(id+47.),jet);
        float elapsed=age-birth;
        float exitAt=mix(.77+.30*seed(id+83.),.18+.35*seed(id+83.),outer);
        exitAt=mix(exitAt,.16+.19*seed(id+71.),jet);
        float life=smoothstep(0.,mix(.10,.042,outer),elapsed)*(1.-smoothstep(exitAt,exitAt+mix(.33,.23,outer),elapsed));
        vec3 p=path(t,id,elapsed,outer);
        vec3 tangent=path(t+.002,id,elapsed,outer)-path(t-.002,id,elapsed,outer);
        vec3 ribbonNormal=normalize(cross(eye-p,tangent));
        float taper=smoothstep(0.,.13,t)*(1.-smoothstep(.74,1.,t));
        float width=mix(.008+seed(id+71.)*.018,.021+seed(id+31.)*.047,outer);
        width*=taper*(.7+.3*sin(t*13.+id));
        world=p+c.y*width*ribbonNormal;
        float nearSide=.50+.50*dot(normalize(eye-vec3(0.,1.,0.)),normalize(vec3(p.x,.2,p.z)));
        strip=vec4(t,c.y,life*taper,nearSide);
        style=vec3(id,outer,seed(id+13.));
        gl_Position=vp*vec4(world,1.);
      }`;
    const fragment = `#version 300 es
      precision highp float;
      uniform float age,groundY;
      in vec3 world;
      in vec4 strip;
      flat in vec3 style;
      out vec4 color;
      void main(){
        if(world.y<groundY||strip.z<.008)discard;
        float t=strip.x,edge=abs(strip.y),id=style.x,outer=style.y;
        float skip=smoothstep(-.42,.09,sin(t*19.+id*2.9)+.51*sin(t*41.-id*2.+age*9.));
        float bristle=.72+.28*sin(t*109.+id*2.13+age*17.);
        float profile=exp(-edge*edge*3.7)*(1.-smoothstep(.73,1.,edge));
        float pulse=.50+.50*sin(t*11.+id*.94-age*7.6);
        float intensity=(.44+.56*strip.w)*(.48+style.z*.56)*(.51+.49*pulse);
        float opacity=strip.z*profile*bristle*mix(.58+.42*skip,.10+.90*skip,outer);
        vec3 dye=mix(vec3(.12,.53,1.12),vec3(3.07,3.70,4.12),(.43+.57*pulse)*(1.-.55*edge));
        float snap=step(33.,id)*(1.-smoothstep(.22,.47,age));
        color=vec4(dye*intensity*opacity*(1.+.92*snap),opacity*.24);
      }`;
    const material=geom.program(vertex,fragment),vao=gl.createVertexArray();
    const groundY=gl.getUniformLocation(material,'groundY');
    return (age,floorHeight)=>{
      if(age<.035||age>1.4)return;
      geom.uniforms(material,age);
      gl.uniform1f(groundY,floorHeight);
      gl.disable(gl.CULL_FACE);
      gl.blendFuncSeparate(gl.ONE,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(vao);
      gl.drawArraysInstanced(gl.TRIANGLES,0,92*6,39);
      gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.CULL_FACE);
    };
  }

  window.SpiritVolumeBuild=(gl,geom,studio=false)=>{
    const variant=source=>studio?source.replace('#version 300 es\n','#version 300 es\n#define STUDIO\n'):source;
    const material=geom.program(variant(vertex),variant(fragment));
    const layer=gl.getUniformLocation(material,'layer'),groundY=gl.getUniformLocation(material,'groundY');
    const volume=geom.program(variant(volumeVertex),variant(volumeFragment));
    const renderStrips=studio?burstStrips(gl,geom):null;
    const clipOpaque=gl.getUniformLocation(volume,'clipOpaque');
    const volumeFloor=gl.getUniformLocation(volume,'groundY');
    const opaqueDepth=gl.getUniformLocation(volume,'opaqueDepth');
    return function render(age,depth,floorHeight=0){
      if(age<=.001||age>=(studio?2.19:1.63))return;
      geom.uniforms(material,age);
      if(studio)gl.uniform1f(groundY,floorHeight);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.CULL_FACE);gl.frontFace(gl.CCW);
      if(age>.91&&age<1.63){
        gl.cullFace(gl.BACK);gl.depthMask(false);
        gl.uniform1i(layer,4);geom.draw(geom.sphere);
      }
      gl.depthMask(false);gl.cullFace(gl.FRONT);
      if(studio)gl.disable(gl.CULL_FACE);
      if(age<(studio?1.57:1.46)){gl.uniform1i(layer,0);geom.draw(geom.sphere);}
      gl.cullFace(gl.BACK);gl.enable(gl.CULL_FACE);
      if(age<.38){gl.uniform1i(layer,1);geom.draw(geom.sphere);}
      if(age>.058&&age<(studio?2.19:1.34)){
        // The proxy only bounds screen coverage. Truncate the ray at the
        // copied opaque depth, so visible energy in front of a sprite survives.
        gl.disable(gl.DEPTH_TEST);
        geom.uniforms(volume,age);
        if(studio)gl.uniform1f(volumeFloor,floorHeight);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D,depth??null);
        gl.uniform1i(opaqueDepth,0);
        gl.uniform1i(clipOpaque,Boolean(depth));
        geom.draw(geom.sphere);
        gl.enable(gl.DEPTH_TEST);
      }
      renderStrips?.(age,floorHeight);
      geom.uniforms(material,age);
      gl.depthMask(!studio);
      if(studio)gl.disable(gl.CULL_FACE);
      if(age<(studio?1.57:1.46)){gl.uniform1i(layer,3);geom.draw(geom.sphere);}
      gl.depthMask(true);
      gl.bindVertexArray(null);
    };
  };
})();
