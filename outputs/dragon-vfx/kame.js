/* Full-arena Kamehameha. The clock starts at frame 126 of Hovl's demonstration. */
(() => {
  'use strict';
  const W=960,H=400,TAU=2*Math.PI,start=2.4,end=128/30;
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=(a,b,t)=>{const k=clamp((t-a)/(b-a));return k*k*(3-2*k);};
  const lerp=(a,b,u)=>a+(b-a)*u;
  const hash=(i,k)=>{const x=Math.sin(i*27.741+k*78.137)*32475.41;return x-Math.floor(x);};
  function poly(c,coords,color){
    c.fillStyle=color;c.beginPath();c.moveTo(coords[0],coords[1]);
    for(let i=2;i<coords.length;i+=2)c.lineTo(coords[i],coords[i+1]);c.closePath();c.fill();
  }
  function halo(c,x,y,r,stops,scaleY=1){
    if(r<=0)return;
    c.save();c.translate(x,y);c.scale(1,scaleY);
    const g=c.createRadialGradient(0,0,0,0,0,r);
    for(const [p,v] of stops)g.addColorStop(p,v);
    c.fillStyle=g;c.fillRect(-r,-r,2*r,2*r);c.restore();
  }
  const beamFrag=`#version 300 es
    precision highp float;
    uniform float T;uniform vec2 origin;out vec4 result;
    float h(vec2 p){vec3 v=fract(vec3(p.xyx)*.1031);v+=dot(v,v.yzx+33.33);return fract((v.x+v.y)*v.z);}
    float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
    float sand(vec2 p){return .57*n(p)+.29*n(p*2.03+13.)+.14*n(p*4.27-4.);}
    // Local tongue with a rounded upstream shoulder and a long asymmetric
    // release. A tongue travels on one side of the section, not across it.
    float packet(float z,float distance,float period,float bank,float bend,float thickness,float key){
      float index=floor(distance/period),phase=fract(distance/period);
      float seed=h(vec2(index,key)),span=.67+.18*seed;
      float t=phase/span;if(t>=1.)return 0.;
      float shoulder=smoothstep(0.,.092,t);
      float profile=thickness*shoulder*pow(1.-t,.68)*(.84+.31*sin(3.14159*t));
      float track=bank+bend*(t*t-.34*t)+.050*sin(t*9.7+seed*5.)+.045*(seed-.5);
      float jitter=.014*n(vec2(t*17.,z*4.+key));
      return shoulder*(1.-smoothstep(-.007,.019,abs(z-track)-profile+jitter));
    }
    // A split lamella travels across the rear face. Two independently
    // tapering leaves grow from its heel, with a gap between the tips.
    float leafPair(float z,float distance,float pitch,float lane,float shift,float thickness,float key){
      float cell=floor(distance/pitch),t=fract(distance/pitch);
      float seed=h(vec2(cell,key));
      t=(t-.022)/(.56+.26*seed);
      if(t<=0.||t>=1.)return 0.;
      float shoulder=smoothstep(.005,.14,t),fade=1.-smoothstep(.32,1.,t);
      float path=lane+shift*(t*(1.-t)*2.36-.17*t)+.028*sin(seed*6.+t*10.1);
      float rough=.022*(n(vec2(t*20.+3.1*seed,z*8.+key))-.5);
      float a=abs(z-path+rough)-thickness*shoulder*fade;
      float gap=smoothstep(.16,.65,t);
      float b=abs(z-(path-.047-.19*gap)+rough)
             -thickness*.45*smoothstep(.045,.18,t)*(1.-smoothstep(.29,.82,t));
      return 1.-smoothstep(-.014,.020,min(a,b));
    }
    // Composite straight color into a premultiplied local accumulator.
    void over(inout vec4 dst,vec3 rgb,float alpha){float a=clamp(alpha,0.,1.);dst=vec4(rgb*a+dst.rgb*(1.-a),a+dst.a*(1.-a));}
    void main(){
      vec2 p=vec2(gl_FragCoord.x,400.-gl_FragCoord.y)-origin;
      float u=T-2.40,off=4.20-T;
      if(u<-.051||off<0.){result=vec4(0);return;}
      float x=p.x,outward=max(0.,x);
      // The hands and the upper body of the opponent define the aim. Beyond
      // the fighter the beam opens toward the camera and the lower right.
      float axis=.081*outward+.000148*outward*outward;
      float y=p.y-axis;
      float release=smoothstep(-.046,.047,u),field=smoothstep(-.014,.117,u);
      float drain=smoothstep(4.015,4.202,T),emit=release*(1.-smoothstep(4.030,4.18,T));
      float tip=246.+max(0.,u)*14500.,head=(1.-smoothstep(tip-16.,tip+9.,x))*step(-.0004,u);
      float wid=9.+21.5*(1.-exp(-outward/62.))+.083*outward+.000218*outward*outward;
      if(x < -156. || (abs(p.y)>130. && abs(y)>wid*1.65+40.)){result=vec4(0);return;}
      float stream=x*.0081-u*3.1;
      float eddy=n(vec2(stream*.64,2.1+.53*u));
      float center=2.6*sin(x*.0076-u*5.8)+4.2*(eddy-.5);
      float front=(.176+.824*field)*(1.-.17*drain);
      float nose=mix(.025,1.,smoothstep(-1.,164.,tip-x));
      float halfW=wid*front*nose*(.964+.08*eddy+.025*sin(stream*2.2));
      float z=(y-center)/max(2.,halfW),az=abs(z);
      float shellNoise=sand(vec2(stream*1.41,z*2.6+.9*sin(stream*.81)));
      float reach=smoothstep(-8.,10.,x)*head*release;
      float splitU=(x-u*293.+49.)/237.,cell=floor(splitU),su=fract(splitU);
      float rake=smoothstep(.07,.27,su)*(1.-smoothstep(.36,.88,su));
      float barb=smoothstep(.51,.65,su)*(1.-smoothstep(.70,.89,su));
      float outerSplit=.026+(.15+.16*h(vec2(cell,83.)))*rake+.071*barb;
      float boundary=1.+.22*(shellNoise-.5)+.037*sin(stream*3.1+z*3.)
                      -outerSplit*(1.-smoothstep(-.38,-.06,z));
      float inside=(1.-smoothstep(boundary-.018,boundary+.024,az))*reach;
      // A bank of pale material overlaps a volume with an unbroken luminous
      // centre. Larger facets live on the two banks; texture only tears their
      // edges, and never sets the colour of the entire cross-section.
      float depthZ=sqrt(max(0.,1.-min(1.,z*z)));
      float topFlow=(x-u*224.)/351.,bottomFlow=(x-u*271.+97.)/427.;
      float tf=fract(topFlow),bf=fract(bottomFlow);
      float topTongue=smoothstep(.015,.184,tf)*(1.-smoothstep(.393,.961,tf));
      float bottomTongue=smoothstep(.025,.118,bf)*(1.-smoothstep(.302,.931,bf));
      // The profile of a racing lobe is rough along the flow. Its interior
      // stays coherent even as a few cooler lobes overlap the hot bank.
      float ripA=n(vec2((x-u*327.)*.037,z*5.5+.31*u))-.5;
      float ripB=n(vec2((x-u*284.)*.069,z*9.6-.43*u))-.5;
      float edgeN=.052*(2.*shellNoise-1.)+.079*ripA+.035*ripB;
      float spine=.10+.22*sin(x*.0057-u*3.28+.32);
      float topBank=-1.29+1.0*topTongue+.11*sin(stream*2.42)+edgeN*2.1;
      float bottomBank=1.31-.89*bottomTongue+.09*sin(stream*2.21+.8)-edgeN;
      float upperLight=.58+.42*smoothstep(.13,.72,rake);
      float blue=smoothstep(-1.06,-.72,z)*(1.-smoothstep(.81,.984,z))*upperLight;
      vec3 material=mix(vec3(.008,.016,.037),vec3(.05,.13,.27),depthZ*.65);
      material=mix(material,mix(vec3(.19,.39,.68),vec3(.34,.68,1.),depthZ),blue);
      float darkTop=(1.-smoothstep(topBank-.014,topBank+.016,z))*(1.-smoothstep(.92,1.05,az));
      float darkBottom=smoothstep(bottomBank,bottomBank+.024,z);
      material=mix(material,vec3(.010,.020,.047),max(darkTop,darkBottom));
      float coreTop=spine-.37+.134*sin(stream*1.42)+.116*sin(stream*2.49+.82)*topTongue-.14*bottomTongue+.122*(shellNoise-.5)+.135*ripA+.048*ripB;
      float coreBottom=spine+.34+.14*sin(stream*.82+.31)-.16*bottomTongue+.08*sin(stream*2.71+.38)-.107*ripA+.064*ripB;
      float jacket=smoothstep(coreTop-.18,coreTop-.070,z)*(1.-smoothstep(coreBottom+.055,coreBottom+.19,z));
      float ice=smoothstep(coreTop-.032,coreTop+.031,z)*(1.-smoothstep(coreBottom-.031,coreBottom+.039,z));
      float white=smoothstep(coreTop+.044,coreTop+.155,z)*(1.-smoothstep(coreBottom-.092,coreBottom-.023,z));
      material=mix(material,vec3(.27,.72,1.),jacket);
      material=mix(material,vec3(.63,.96,1.),ice);
      material=mix(material,vec3(.977,1.,1.),white);
      // Small tongues stay attached at one end of a bank. The pointed ends
      // leave dark gaps through which the rear face remains visible.
      float topPacket=smoothstep(.0,.12,tf)*(1.-smoothstep(.29,.87,tf));
      float lowPacket=smoothstep(.025,.15,bf)*(1.-smoothstep(.25,.86,bf));
      float peel=coreTop-.25+.26*topPacket+.064*sin(stream*2.08);
      float lowPeel=coreBottom+.29-.24*lowPacket-.069*sin(stream*1.87+.3);
      float topSliver=(1.-smoothstep(.005,.028,abs(z-peel)-(.13+.068*max(0.,sin(stream*1.1)))*topPacket))*smoothstep(0.,.10,topPacket);
      float lowSliver=(1.-smoothstep(.008,.034,abs(z-lowPeel)-(.12+.053*bottomTongue)*lowPacket))*smoothstep(0.,.12,lowPacket);
      material=mix(material,vec3(.35,.67,1.),lowSliver);
      material=mix(material,vec3(.65,.918,1.),topSliver);
      float gapCenter=coreBottom+.06*sin(stream*.96);
      float darkW=.055*bottomTongue*(.6+.4*cos(stream*.71));
      float groove=(1.-smoothstep(.008,.019,abs(z-gapCenter)-darkW))*smoothstep(.12,.52,bottomTongue);
      material=mix(material,vec3(.043,.11,.24),groove*.96);
      float rearIce=packet(z,x-u*269.+82.,323.,-.57+.07*sin(stream*.9),.15,.22,17.);
      float lowIce=packet(z,x-u*328.+139.,383.,.65+.05*sin(stream*.77),-.25,.17,23.);
      material=mix(material,vec3(.32,.60,.91),max(rearIce,lowIce));
      float crestTip=packet(z,x-u*269.+82.,323.,-.54+.07*sin(stream*.9),.15,.085,17.);
      material=mix(material,vec3(.63,.94,1.),crestTip);
      float foldCut=packet(z,x-u*283.-18.,289.,coreTop+.09,-.17,.102,38.);
      float foldFront=packet(z,x-u*315.+151.,398.,coreBottom+.056,.23,.18,63.);
      material=mix(material,vec3(.085,.22,.40),foldCut*.96);
      material=mix(material,vec3(.51,.85,1.),foldFront);
      // A large recirculating pocket briefly pinches the upper half of
      // the core. A narrow white bridge survives on its lower side.
      float biteU=fract((x-u*286.-9.)/381.);
      float bite=smoothstep(.092,.242,biteU)*(1.-smoothstep(.30,.585,biteU));
      float tipOfBite=coreTop-.36+.84*bite+.12*ripA;
      float pocket=smoothstep(-.94,-.57,z)*(1.-smoothstep(tipOfBite-.01,tipOfBite+.03,z))*smoothstep(.18,.60,bite);
      material=mix(material,mix(vec3(.026,.053,.095),vec3(.075,.16,.29),.5+.5*ripA),pocket);
      // The largest backward-facing blue plates visibly split the dark
      // bank. Across their short lit heel, their longer forks expose blue,
      // dark and white in that order. The next bank moves at another speed.
      float outerPlate=leafPair(z,-x+u*255.+265.,299.,-.72+.13*ripA,.42,.23,31.);
      float outerCrest=leafPair(z,-x+u*255.+265.,299.,-.68+.12*ripA,.395,.093,31.);
      float rimSplinter=packet(z,x-u*293.-26.,237.,-.79+.12*rake+.065*ripA,.27,.083,72.);
      material=mix(material,vec3(.23,.41,.67),outerPlate);
      material=mix(material,vec3(.52,.78,.98),outerCrest);
      material=mix(material,vec3(.62,.87,1.),rimSplinter*(.38+.62*barb));
      float coreFold=leafPair(z,-x+u*347.+161.,379.,coreTop-.035+.045*ripB,.34,.117,4.);
      float foldLip=leafPair(z,-x+u*347.+161.,379.,coreTop+.014+.042*ripB,.34,.050,4.);
      material=mix(material,vec3(.13,.29,.51),coreFold*.88);
      material=mix(material,vec3(.47,.78,1.),foldLip);
      float brook=leafPair(z,-x+u*302.+32.,493.,coreBottom+.09,.21,.186,8.);
      material=mix(material,vec3(.70,.95,1.),brook);
      float neck=exp(-outward/52.);material=mix(material,vec3(.75,.97,1.),neck*.62);
      float face=.31+.35*jacket+.26*white,sheets=jacket;
      float rip=n(vec2(stream*1.51,z*10.5+.5*sin(stream*1.42)));
      float strips=1.-smoothstep(rip-.065,rip+.065,drain*(.80+.10*(1.-az)));
      float detached=smoothstep((T-4.147)*10400.-16.,(T-4.147)*10400.+3.,x);
      float shell=inside*strips*detached;
      vec4 acc=vec4(0);
      float haze=exp(-max(az-.82,0.)*3.45)*reach*(.25+.21*ice)*(1.-drain);
      over(acc,vec3(.17,.44,.96),haze);
      over(acc,material,shell);
      float edge=exp(-abs(az-boundary)*62.)*smoothstep(.46,.69,shellNoise)*.83;
      over(acc,mix(vec3(.24,.57,1.),vec3(.86,.97,1.),sheets),edge*reach*strips*detached);
      // A single hot fold rolls across the face. Its aft half is hidden
      // by the blue material; only small torn seams catch light at the far lip.
      float clock=u-.367;
      float ang=-1.73+x*.00865+.44*(1.-exp(-outward/82.))+.0000028*outward*outward
                -6.1*clock+.19*sin(clock*7.2+x*.004);
      float depth=cos(ang),orbit=sin(ang);
      float crest=exp(-pow((orbit+.39)/.58,2.));
      float exposure=smoothstep(-.065,.52,depth);
      float coil=(halfW*(.98+.035*sin(stream*.67))+2.5*front)*orbit;
      float cut=smoothstep(.435,.584,face)*(1.-smoothstep(.18,.83,depth));
      float profile=(.36+(2.50+.148*halfW)*(.10+1.78*crest))
                     *(.18+.82*exposure)*(.86+.24*eddy);
      float ribbonDist=abs(y-center-coil);
      float energy=smoothstep(-4.,22.,x)*head*release*smoothstep(.03,.57,nose)*(1.-smoothstep(3.78,4.024,T));
      float show=exposure*(1.-.96*cut)*energy;
      over(acc,vec3(1.,.22,.025),exp(-ribbonDist/(4.5*profile+1.4))*crest*show*.57);
      over(acc,vec3(1.,.25,.045),exp(-ribbonDist/(2.67*profile+.45))*(.44+.37*crest)*show);
      over(acc,mix(vec3(1.,.42,.048),vec3(1.,.86,.39),1.-smoothstep(0.,profile,ribbonDist)),
           (1.-smoothstep(profile*.42,profile*1.18+.24,ribbonDist))*show);
      over(acc,vec3(1.,.98,.79),exp(-ribbonDist/(.33*profile+.1))*crest*show);
      float hotSpot=exp(-pow((orbit+.49)/.185,2.))*smoothstep(.46,.78,depth);
      over(acc,vec3(1.,.91,.69),exp(-ribbonDist/(1.42*profile+.1))*hotSpot*show);
      over(acc,vec3(1.,.99,.94),exp(-ribbonDist/(1.04*profile+.1))*hotSpot*show);
      float rimY=center-halfW*(.91+.072*sin(stream*.63)+.064*(eddy-.5)-.91*outerSplit);
      float remaining=smoothstep(.38,.64,sand(vec2(stream*2.15-.54*u,5.7+u*2.0)))
                     *(1.-smoothstep(.465,.589,face));
      float aft=smoothstep(-.12,.53,-depth)*remaining*energy;
      float rimDist=abs(y-rimY),rimW=(.57+.049*halfW)*(.19+.81*remaining);
      over(acc,vec3(1.,.30,.04),exp(-rimDist/(3.1*rimW+.33))*aft*.64);
      over(acc,vec3(1.,.73,.22),(1.-smoothstep(rimW*.3,rimW*1.32+.15,rimDist))*aft);
      // Broken tilted wavefronts travel behind the palms, rather than along
      // the beam. Their crests are much wider than the mouth of the stream.
      for(int j=0;j<3;j++){
        float id=float(j),life=fract(max(0.,u-.027)*1.36+id/3.);
        float born=smoothstep(.008+id*.012,.096+id*.026,u);
        float radius=22.+75.*life,dx=x+5.+life*41.;
        vec2 e=vec2((dx+(.145+.105*life)*p.y)/(.49+.058*life),p.y);
        float phi=atan(e.y,e.x),wob=1.+.022*sin(phi*3.-u*6.+id)+.010*sin(phi*6.+id*.8);
        float sd=length(e)-radius*wob,distance=abs(sd);
        float brush=smoothstep(-.38,.67,cos(phi+3.09+.13*sin(u*4.+id)));
        float chip=.74+.26*n(vec2(phi*2.6+id*.82,u*3.21));
        float opacity=born*(1.-smoothstep(4.00,4.174,T))*(.19+.81*brush)*chip;
        float bank=exp(-max(-sd,0.)/(4.+7.*brush))*(1.-smoothstep(0.,3.55,sd));
        over(acc,vec3(.067,.37,1.),exp(-distance/10.)*.85*opacity);
        over(acc,vec3(.20,.70,1.),bank*.80*opacity);
        over(acc,vec3(.85,.985,1.),exp(-distance/(1.9+3.18*brush))*min(1.,1.68*opacity));
        float glint=exp(-pow((phi+2.36+.15*id)/.24,2.));
        over(acc,vec3(.995,1.,1.),exp(-distance/(3.+3.*glint))*glint*opacity);
        float crest=exp(-pow((phi+2.1+.09*id)/.128,2.));
        over(acc,vec3(.31,.77,1.),crest*exp(-max(0.,sd)/12.)*exp(-max(0.,-sd)/7.)*born*.76*emit);
      }
      float punch=exp(-pow((u-.043)/.099,2.));
      vec2 sp=vec2(p.x,(p.y+.18*p.x)*(.77+.16*punch));
      float root=length(sp),phi=atan(sp.y,sp.x);
      float swirl=sand(vec2(phi*1.55-u*3.,root*.096-u*7.1));
      float spokes=pow(max(0.,sin(7.*phi+.061*root-u*11.+swirl*4.)),6.)*exp(-root/31.);
      float crown=exp(-abs(root-(15.+6.*sin(3.*phi-u*10.)+4.*sin(5.*phi+u*9.)))/3.2);
      over(acc,vec3(.14,.52,1.),exp(-root/20.)*min(1.,1.77*emit));
      over(acc,vec3(.49,.91,1.),min(1.,spokes*1.52+crown*.73)*emit);
      float r=18.0+16.*punch+2.4*sin(u*16.)*field+5.9*(swirl-.5);
      over(acc,vec3(.24,.58,1.),exp(-root/(21.+15.*punch))*.96*emit);
      over(acc,vec3(.54,.92,1.),exp(-root/(14.+8.*punch))*.97*emit);
      float middle=1.-smoothstep(r*.60,r*1.18,root);
      float aperture=exp(-length(vec2((p.x+1.)*.71,p.y*1.51))/22.)*smoothstep(-5.,11.,p.x);
      float crescent=exp(-abs(root-(r*1.11+swirl*5.1))/(3.5+1.1*sin(phi*2.)))*(.32+.68*smoothstep(-.80,.47,-cos(phi)));
      over(acc,vec3(.84,.98,1.),max(crescent*.98,aperture)*emit);
      over(acc,vec3(.98,1.,1.),middle*emit);
      float first=exp(-pow((u-.012)/.068,2.))*smoothstep(-.048,-.002,u);
      over(acc,vec3(.44,.77,1.),exp(-root/26.)*first);
      over(acc,vec3(.98,1.,1.),(1.-smoothstep(24.,42.,root))*first);
      // Source #198 has a flying bundle of separate hot slivers. The strands
      // disappear into the developing body over the next two source frames.
      float transient=step(-.0004,u)*(1.-smoothstep(.004,.069,u))*smoothstep(18.,49.,x);
      if(transient>.001){
        for(int j=0;j<5;j++){
          float id=float(j),span=200.+12.*id+max(0.,u)*7800.;
          float g=clamp(x/span,0.,1.),travel=smoothstep(.04,.22,g)*(1.-smoothstep(.92,1.,g));
          float s=axis*1.19+(id-2.)*(.8+.021*x)+(.9+2.1*g)*sin(g*9.+id*2.6+u*27.);
          float segment=.38+.62*smoothstep(-.66,.55,sin(g*8.7-id*2.3-u*35.));
          float distance=abs(p.y-s);
          over(acc,vec3(.23,.64,1.),exp(-distance/(1.55+2.0*g))*travel*segment*transient);
          over(acc,mix(vec3(.60,.91,1.),vec3(1.,.81,.56),float(j==1)),
               exp(-distance/(.72+.66*g))*travel*segment*transient);
        }
        // The orange thread in #198 crosses the cold fan just once. Its
        // brighter heel sits above the colder tips and moves into the coil.
        float a=x-max(0.,u)*1900.,f=clamp((a-31.)/169.,0.,1.);
        float lane=axis*1.19-6.+19.*f*f+2.5*sin(f*5.8+.54);
        float pulse=smoothstep(29.,52.,a)*(1.-smoothstep(143.,201.,a))*(.40+.60*smoothstep(.012,.083,abs(f-.51)));
        float lobes=.61+.39*smoothstep(-.52,.65,cos(f*10.4-.42));
        float goldWidth=(1.40+1.22*sin(3.14159*f))*(.58+.42*lobes);
        float d=abs(p.y-lane);
        over(acc,vec3(1.,.28,.025),exp(-d/(2.45*goldWidth))*pulse*lobes*transient*.93);
        over(acc,vec3(1.,.58,.075),(1.-smoothstep(goldWidth*.46,goldWidth*1.08,d))*pulse*transient);
        over(acc,vec3(1.,.88,.51),exp(-d/(.31*goldWidth+.12))*pulse*lobes*transient);
      }
      result=vec4(acc.rgb/max(.0001,acc.a),acc.a);
    }`;
  let gpu;
  function hardware(){
    if(gpu!==undefined)return gpu;
    const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
    const gl=canvas.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true});
    if(!gl)return gpu=null;
    const vert='#version 300 es\nvoid main(){vec2 q=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(2.*q-1.,0.,1.);}';
    function program(frag){
      const pg=gl.createProgram();
      for(const [type,code] of [[gl.VERTEX_SHADER,vert],[gl.FRAGMENT_SHADER,frag]]){
        const sh=gl.createShader(type);gl.shaderSource(sh,code);gl.compileShader(sh);
        if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));
        gl.attachShader(pg,sh);gl.deleteShader(sh);
      }
      gl.linkProgram(pg);if(!gl.getProgramParameter(pg,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(pg));
      return pg;
    }
    const downFrag=`#version 300 es
      precision highp float;uniform sampler2D src;uniform vec2 size,texel;uniform int first;out vec4 outp;
      vec3 sampleAt(vec2 uv){
        vec4 c=texture(src,uv);if(first==0)return c.rgb;
        float l=dot(c.rgb,vec3(.30,.58,.12))*c.a;
        float e=smoothstep(.63,.89,l)*c.a;
        float hot=smoothstep(.07,.57,c.r-c.b);
        return mix(vec3(.16,.51,1.),vec3(1.,.37,.058),hot)*e*(.53+.78*l);
      }
      void main(){
        vec2 uv=gl_FragCoord.xy/size,d=texel*1.68;
        vec3 a=sampleAt(uv)*.20;
        a+=(sampleAt(uv+d)+sampleAt(uv-d)+sampleAt(uv+vec2(d.x,-d.y))+sampleAt(uv+vec2(-d.x,d.y)))*.115;
        vec2 e=d*2.03;
        a+=(sampleAt(uv+vec2(e.x,0))+sampleAt(uv-vec2(e.x,0))+sampleAt(uv+vec2(0,e.y))+sampleAt(uv-vec2(0,e.y)))*.085;
        outp=vec4(a,1.);
      }`;
    const composeFrag=`#version 300 es
      precision highp float;uniform sampler2D body,closeGlow,wideGlow,outerGlow;out vec4 outp;
      void main(){
        vec2 uv=gl_FragCoord.xy/vec2(960.,400.);vec4 b=texture(body,uv);
        vec3 g=texture(closeGlow,uv).rgb*.43+texture(wideGlow,uv).rgb*.61+texture(outerGlow,uv).rgb*.76;
        float brightest=max(g.r,max(g.g,g.b));
        float a=b.a+(1.-b.a)*clamp(brightest*.92,0.,.98);
        vec3 light=b.rgb*b.a+g*(1.-.58*b.a);
        outp=vec4(min(vec3(1.),light/max(.0001,a)),a);
      }`;
    let pg,down,compose;
    try{pg=program(beamFrag);down=program(downFrag);compose=program(composeFrag);}
    catch(e){console.error(e);return gpu=null;}
    const time=gl.getUniformLocation(pg,'T'),origin=gl.getUniformLocation(pg,'origin');
    const loc=(prog,label)=>gl.getUniformLocation(prog,label);
    const size=loc(down,'size'),texel=loc(down,'texel'),first=loc(down,'first');
    gl.useProgram(down);gl.uniform1i(loc(down,'src'),0);gl.useProgram(compose);
    ['body','closeGlow','wideGlow','outerGlow'].forEach((name,id)=>gl.uniform1i(loc(compose,name),id));
    const floating=gl.getExtension('EXT_color_buffer_float');
    function target(w,h){
      const fb=gl.createFramebuffer(),tex=gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      for(const param of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,param,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,floating?gl.RGBA16F:gl.RGBA8,w,h,0,gl.RGBA,floating?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);
      gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
      return {tex,fb,w,h,ready:gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE};
    }
    const layer=target(W,H),pyramid=[target(480,200),target(240,100),target(60,25)];
    if(!layer.ready||pyramid.some(t=>!t.ready))return gpu=null;
    function sample(id,t){gl.activeTexture(gl.TEXTURE0+id);gl.bindTexture(gl.TEXTURE_2D,t.tex);}
    function drawTo(t){gl.bindFramebuffer(gl.FRAMEBUFFER,t?.fb||null);gl.viewport(0,0,t?.w||W,t?.h||H);gl.drawArrays(gl.TRIANGLES,0,3);}
    gpu={canvas,draw(t,p){
      if(gl.isContextLost())return false;
      gl.useProgram(pg);gl.uniform1f(time,t);gl.uniform2f(origin,p.x,p.y);drawTo(layer);
      gl.useProgram(down);let input=layer;
      for(const dst of pyramid){
        sample(0,input);gl.uniform2f(size,dst.w,dst.h);gl.uniform2f(texel,1/input.w,1/input.h);
        gl.uniform1i(first,input===layer?1:0);drawTo(dst);input=dst;
      }
      gl.useProgram(compose);sample(0,layer);
      pyramid.forEach((dst,id)=>sample(id+1,dst));drawTo(null);return true;
    }};return gpu;
  }
  function chargeWind(c,t,x,y,p){
    const gain=smooth(.12,.44,t)*(1-smooth(2.01,2.34,t));
    if(gain<.001)return;
    c.save();
    halo(c,x,y-1,110,[[0,'rgba(29,44,72,'+(.28*gain)+')'],[.62,'rgba(38,56,78,'+(.22*gain)+')'],[1,'rgba(36,59,94,0)']],.22);
    for(let n=0;n<9;n++){
      const u=(t*(.53+.29*hash(n,14))+hash(n,41))%1,phase=t*2.9+n*1.98;
      const r=(49+49*u)*(.74+.46*hash(n,3)),span=.48+1.72*hash(n,21);
      c.beginPath();
      for(let j=0;j<=20;j++){
        const s=j/20,ang=phase+s*span,rw=r+3*Math.sin(ang*3.2+n);
        const xx=x+Math.cos(ang)*rw,yy=y-.9+Math.sin(ang)*rw*.20-4*Math.sin(s*Math.PI);
        if(!j)c.moveTo(xx,yy);else c.lineTo(xx,yy);
      }
      for(let j=20;j>=0;j--){
        const s=j/20,ang=phase+s*span,rw=r+3*Math.sin(ang*3.2+n);
        const w=(2+3.8*hash(n,14))*Math.sin(s*Math.PI)**.66;
        c.lineTo(x+Math.cos(ang)*rw,y-.9+Math.sin(ang)*rw*.20-4*Math.sin(s*Math.PI)-w);
      }
      c.closePath();c.fillStyle='rgba(220,236,247,'+(.42*gain*Math.sin(Math.PI*u))+')';c.fill();
    }
    // The broad, translucent wedges in the original are separate from the
    // short incandescent grains that actually travel into the charge.
    for(let j=0;j<5;j++){
      const turn=t*(1.17+.24*hash(j,2))+hash(j,71),cycle=Math.floor(turn),age=turn-cycle;
      const a=hash(j+cycle*31,62)*TAU+.065*age,dx=Math.cos(a),dy=Math.sin(a);
      const r=(109+174*hash(j+cycle*23,20))*(1-.12*age),w=4+8*hash(j,73);
      const g=c.createLinearGradient(p.x,p.y,p.x+dx*r,p.y+dy*r);
      const opacity=gain*Math.sin(Math.PI*age)**1.6;
      g.addColorStop(0,'rgba(225,239,255,'+(.61*opacity)+')');g.addColorStop(.57,'rgba(201,216,234,'+(.30*opacity)+')');g.addColorStop(1,'rgba(205,214,223,0)');
      poly(c,[p.x-dy,p.y+dx,p.x+dx*r-dy*w,p.y+dy*r+dx*w,p.x+dx*r+dy*w,p.y+dy*r-dx*w],g);
    }c.restore();
  }
  const grains=Array.from({length:31},(_,i)=>({
    angle:hash(i,2)*TAU,phase:hash(i,13),speed:.98+.63*hash(i,17),r:67+116*hash(i,27),blue:hash(i,16)>.50
  }));
  function chargeLight(c,t,p){
    const gain=smooth(.035,.37,t)*(1-smooth(2.04,2.31,t));
    if(gain>.001){
      c.save();c.globalCompositeOperation='lighter';
      for(const [i,g] of grains.entries()){
        const u=(t*g.speed+g.phase)%1,angle=g.angle+.17*(1-u);
        const d=(1-u*u)*g.r,dx=Math.cos(angle),dy=Math.sin(angle)*.83;
        const x=p.x+d*dx,y=p.y+d*dy,w=(.6+.8*u),l=3+7.6*u;
        const visible=gain*smooth(.06,.23,u)*(1-smooth(.94,1,u));
        if(visible<.05)continue;
        c.globalAlpha=visible;
        c.save();c.translate(x,y);c.rotate(Math.atan2(dy,dx));
        halo(c,0,0,6.7+l*.75,[[0,g.blue?'rgba(92,132,255,.75)':'rgba(177,220,255,.65)'],[.48,'rgba(54,117,255,.24)'],[1,'rgba(31,64,255,0)']],.34);
        poly(c,[-l*.8,0,-l*.17,-w,l,0,-l*.08,w],g.blue?'#acbeff':'#ecfaff');
        if(i%3===0)poly(c,[-l*.49,0,0,-w*.48,l*.77,0,0,w*.48],'#ffffff');c.restore();
      }c.restore();
    }
    const charge=smooth(.075,.50,t)*(1-smooth(2.395,2.446,t));if(charge<=0)return;
    const compact=smooth(1.84,2.26,t),r=(3.8+6.0*smooth(.20,1.75,t)+4.2*compact)*(1+.08*Math.sin(t*32.));
    c.save();c.globalAlpha=charge;
    halo(c,p.x,p.y,r*3.65,[[0,'rgba(240,255,255,1)'],[.17,'rgba(183,242,255,.99)'],[.32,'rgba(121,190,255,.89)'],[.55,'rgba(62,117,255,.43)'],[1,'rgba(56,98,255,0)']]);
    const outline=[];
    for(let i=0;i<42;i++){
      const a=i/42*TAU,rad=r*(.87+.08*Math.sin(7*a-t*18)+.058*Math.cos(3*a+t*14));
      outline.push(p.x+rad*Math.cos(a),p.y+rad*Math.sin(a));
    }
    poly(c,outline,'#e7faff');
    for(let j=0;j<3;j++){
      c.beginPath();c.ellipse(p.x,p.y,r*(1.07+.11*j),r*(.59+.08*j),t*2.5+j*1.7,.41,5.01);
      c.lineWidth=1.1;c.strokeStyle=j===1?'#93bcff':'#ffffff';c.stroke();
    }c.restore();
  }
  function fallbackStream(c,t,p){
    const u=t-start;
    if(u<-.05||t>=4.2)return;
    const reach=246+Math.max(0,u)*14500,length=u<-.0004?0:Math.min(W-p.x+8,reach);
    const root=Math.max(0,(t-4.147)*10400),drain=smooth(4.015,4.202,t);
    const field=smooth(-.014,.117,u),on=smooth(-.046,.047,u);
    const axis=x=>.081*x+.000148*x*x+2.6*Math.sin(x*.0076-u*5.8);
    const section=x=>(9+21.5*(1-Math.exp(-x/62))+.083*x+.000218*x*x)*
      (.176+.824*field)*(1-.17*drain)*(.025+.975*smooth(-1,164,reach-x));
    const sample=(x,z)=>axis(x)+section(x)*z;
    const fract=x=>x-Math.floor(x);
    const flow=x=>x*.0081-u*3.1;
    const upper=x=>{const s=fract((x-u*224)/351);return smooth(.015,.184,s)*(1-smooth(.393,.961,s));};
    const lower=x=>{const s=fract((x-u*271+97)/427);return smooth(.025,.118,s)*(1-smooth(.302,.931,s));};
    const rough=x=>.026*Math.sin((x-u*327)*.047)+.021*Math.cos((x-u*284)*.061);
    const lip=x=>.10+.22*Math.sin(x*.0057-u*3.28+.32)-.37+.134*Math.sin(flow(x)*1.42)
      +.116*Math.sin(flow(x)*2.49+.82)*upper(x)-.14*lower(x)+rough(x);
    const base=x=>.10+.22*Math.sin(x*.0057-u*3.28+.32)+.34+.14*Math.sin(flow(x)*.82+.31)
      -.16*lower(x)+.08*Math.sin(flow(x)*2.71+.38)-rough(x);
    const split=x=>{
      const v=(x-u*293+49)/237,f=fract(v);
      const cut=smooth(.07,.27,f)*(1-smooth(.36,.88,f));
      const tooth=smooth(.51,.65,f)*(1-smooth(.70,.89,f));
      return .026+(.15+.16*hash(Math.floor(v),83))*cut+.071*tooth;
    };
    const high=x=>-1-.041*Math.sin(flow(x)*2.51)+split(x);
    const low=x=>1+.039*Math.sin(flow(x)*2.27+.83);
    c.save();c.translate(p.x,p.y);
    function body(top,bottom,color,from=root,to=length){
      if(to<=from)return;
      const a=[],b=[],n=Math.ceil((to-from)/5);
      for(let i=0;i<=n;i++){
        const x=lerp(from,to,i/n),lo=Math.max(high(x),top(x)),hi=Math.max(lo,Math.min(low(x),bottom(x)));
        a.push(x,sample(x,lo));b.unshift(x,sample(x,hi));
      }
      poly(c,a.concat(b),color);
    }
    c.globalAlpha=on*(1-smooth(4.038,4.137,t));
    c.shadowColor='#479fff';c.shadowBlur=19;
    body(high,low,'#141e37');c.shadowBlur=0;
    body(x=>high(x)+.07,x=>low(x)-.095,'#538bd1');
    body(x=>high(x)+.18,x=>low(x)-.16,'#71baf1');
    body(high,x=>Math.min(-.05,-1.29+upper(x)+.11*Math.sin(flow(x)*2.42)),'#0a1427');
    body(x=>Math.min(low(x),1.28-.93*lower(x)+.09*Math.sin(flow(x)*2.21+.8)),low,'#12223b');
    body(x=>lip(x)-.15,x=>base(x)+.16,'#5dc7ff');
    body(x=>lip(x)-.044,x=>base(x)+.059,'#abf2ff');
    c.shadowBlur=6;c.shadowColor='#aef5ff';
    body(lip,x=>base(x)-.025,'#f7ffff');c.shadowBlur=0;
    // Displaced plates belonging to one bank at a time overlap the hot spine.
    function tongue(period,speed,offset,bank,bend,r,color){
      const pos=u*speed-offset;
      for(let k=Math.floor((root-pos)/period)-1;k<=(length-pos)/period;k++){
        const a=pos+k*period,span=period*(.67+.18*hash(k+151,r*49));
        const h=x=>{const f=clamp((x-a)/span);return r*smooth(0,.09,f)*(1-f)**.70;};
        const track=x=>{const f=clamp((x-a)/span);return bank(x)+bend*(f*f-.34*f)+.04*Math.sin(9.7*f+k*.77);};
        body(x=>track(x)-h(x),x=>track(x)+h(x),color,Math.max(root,a),Math.min(length,a+span));
      }
    }
    tongue(323,269,82,x=>-.57+.07*Math.sin(flow(x)*.9),.15,.21,'#6096d3');
    tongue(323,269,82,x=>-.54+.07*Math.sin(flow(x)*.9),.15,.09,'#a3edff');
    tongue(383,328,139,x=>.65+.05*Math.sin(flow(x)*.77),-.25,.17,'#578cc8');
    tongue(289,283,-18,x=>lip(x)+.09,-.17,.10,'#23446a');
    tongue(398,315,151,x=>base(x)+.056,.23,.18,'#85d6f7');
    function leaves(period,speed,offset,bank,bend,r,color,key){
      const pos=u*speed+offset;
      for(let k=Math.floor((pos-length)/period);k<=Math.ceil((pos-root)/period);k++){
        const tip=pos-k*period-.022*period,span=period*(.56+.26*hash(k,key));
        const f=x=>clamp((tip-x)/span);
        const lane=x=>{const v=f(x);return bank(x)+bend*(2.36*v*(1-v)-.17*v)+.025*Math.sin(10.1*v+k);};
        const from=Math.max(root,tip-span),to=Math.min(length,tip);
        const a=x=>r*smooth(.005,.14,f(x))*(1-smooth(.32,1,f(x)));
        const b=x=>r*.45*smooth(.045,.18,f(x))*(1-smooth(.29,.82,f(x)));
        const fork=x=>lane(x)-.047-.19*smooth(.16,.65,f(x));
        body(x=>lane(x)-a(x),x=>lane(x)+a(x),color,from,to);
        body(x=>fork(x)-b(x),x=>fork(x)+b(x),color,from,to);
      }
    }
    const pocket=x=>{
      const v=fract((x-u*286-9)/381);
      return smooth(.092,.242,v)*(1-smooth(.30,.585,v));
    };
    body(x=>-.94,x=>-.94+smooth(.18,.60,pocket(x))*Math.max(0,lip(x)+.58+.84*pocket(x)+rough(x)),'#142d48');
    leaves(299,255,265,x=>-.72+rough(x),.42,.23,'#47729d',31);
    leaves(299,255,265,x=>-.68+rough(x),.395,.093,'#8dccf6',31);
    leaves(379,347,161,x=>lip(x)-.035,.34,.117,'#34577c',4);
    leaves(379,347,161,x=>lip(x)+.014,.34,.05,'#83c7ec',4);
    leaves(493,302,32,x=>base(x)+.09,.21,.186,'#b4f3ff',8);
    if(drain>0){
      c.globalAlpha=smooth(4.025,4.115,t)*(1-smooth(4.145,4.201,t));
      const palette=['#151d32','#83b7e8','#bffaff','#5e93c0','#e6fbff'];
      for(let i=0;i<18;i++){
        const z=1.83*hash(i,8)-.90;
        tongue(194+102*hash(i,5),320+135*hash(i,2),hash(i,66)*340,
          x=>z+.089*Math.sin(x*.019-u*8+i),.14*(hash(i,44)-.5),.024+.053*hash(i,3),palette[i%5]);
      }
    }
    c.lineCap='round';c.lineJoin='round';
    if(length>root&&t<4.024){
      const clock=u-.367;
      const winding=x=>-1.73+x*.00865+.44*(1-Math.exp(-x/82))+.0000028*x*x-6.1*clock+.19*Math.sin(clock*7.2+x*.004);
      for(let x=Math.max(0,root);x<length;x+=3){
        const endX=Math.min(length,x+3.35),a=winding(x),b=winding(endX),depth=Math.cos(a),r=section(x);
        const crest=Math.exp(-(((Math.sin(a)+.39)/.58)**2)),front=smooth(-.065,.52,depth);
        const grain=.5+.26*Math.sin(x*.033-u*5)+.18*Math.cos(x*.071+u);
        let ya,yb,w,color;
        if(depth<0){
          const scrap=smooth(.44,.68,grain)*smooth(.02,.56,-depth);
          if(scrap<.08)continue;
          ya=sample(x,-.91-.07*Math.sin(flow(x)*.63)+.91*split(x));yb=sample(endX,-.91-.07*Math.sin(flow(endX)*.63)+.91*split(endX));
          c.globalAlpha=scrap*.82*on;w=.85+.063*r*scrap;color='#ffc651';
        }else{
          ya=sample(x,(.99+.025*Math.sin(flow(x)*.67))*Math.sin(a));
          yb=sample(endX,(.99+.025*Math.sin(flow(endX)*.67))*Math.sin(b));
          c.globalAlpha=front*on*(1-.83*(1-smooth(.18,.83,depth))*smooth(.42,.68,grain));
          w=(.55+(4.1+.235*r)*(.12+1.73*crest))*(.18+.82*front);color='#ff992a';
        }
        c.globalAlpha*=1-smooth(3.78,4.024,t);
        c.beginPath();c.moveTo(x,ya);c.lineTo(endX,yb);c.lineWidth=w;
        c.shadowColor='#ff791a';c.shadowBlur=5.2+6*crest;c.strokeStyle=color;c.stroke();
        if(crest>.24&&depth>0){
          c.shadowBlur=0;c.lineWidth=.3+.45*w*crest;c.strokeStyle=crest>.85?'#fff8da':'#ffe3a0';c.stroke();
        }
      }
    }
    c.shadowBlur=0;
    const palmLight=on*(1-smooth(4.03,4.18,t));
    for(let i=0;i<3;i++){
      const life=fract(Math.max(0,u-.027)*1.36+i/3),r=22+75*life,dx=-5-life*41;
      const active=smooth(.008+i*.012,.096+i*.026,u)*(1-smooth(4.0,4.174,t));
      for(let side=0;side<3;side++){
        c.globalAlpha=active*[.36,.87,.94][side];
        c.shadowColor='#54c0ff';c.shadowBlur=[13,7,3][side];c.strokeStyle=['#429aff','#5fcaff','#e9ffff'][side];
        c.lineWidth=[7.2,5.4,2.89][side];c.beginPath();
        c.ellipse(dx,0,r*(.49+.058*life),r,.145+.105*life,[.78,1.55,2.71][side],[6.60,5.20,4.91][side]);c.stroke();
      }
    }
    c.shadowBlur=0;c.globalAlpha=Math.max(palmLight,(1-smooth(.012,.10,u))*smooth(-.045,-.004,u));
    const punch=Math.exp(-(((u-.037)/.095)**2)),r=18+16*punch+2.2*Math.sin(u*16)*field;
    halo(c,0,0,r*3.5,[[0,'#ffffff'],[.23,'#ebffff'],[.36,'#a0edff'],[.59,'rgba(76,171,255,.57)'],[1,'rgba(63,133,255,0)']],1.15);
    const arcs=[];
    for(let i=0;i<64;i++){
      const a=i*TAU/64,rad=r*(.96+.069*Math.cos(3*a-u*10)+.031*Math.sin(7*a+u*11));
      arcs.push(rad*Math.cos(a),(1.22-.18*punch)*rad*Math.sin(a)-.17*rad*Math.cos(a));
    }
    c.shadowBlur=7;c.shadowColor='#7fdfff';poly(c,arcs,'#f5ffff');
    if(u>=-.0004&&u<.069){
      c.shadowColor='#60c8ff';c.shadowBlur=3.6;
      for(let i=0;i<5;i++){
        const span=200+12*i+Math.max(0,u)*7800;
        c.strokeStyle=i===1?'#ffe0a3':'#b6f3ff';
        for(let x=29;x<span;x+=6){
          const g=x/span;
          c.globalAlpha=(1-smooth(.004,.069,u))*smooth(.04,.22,g)*(1-smooth(.92,1,g))*
            (.38+.62*smooth(-.66,.55,Math.sin(g*8.7-i*2.3-u*35)));
          const y=v=>1.19*axis(v)+(i-2)*(.8+.021*v)+(.9+2.1*v/span)*Math.sin(v/span*9+i*2.6+u*27);
          c.lineWidth=1.3+1.1*g;c.beginPath();c.moveTo(x,y(x));c.lineTo(x+6,y(x+6));c.stroke();
        }
      }
      const off=Math.max(0,u)*1900;
      const warmY=x=>{
        const f=clamp((x-off-31)/169);
        return 1.19*axis(x)-6+19*f*f+2.5*Math.sin(f*5.8+.54);
      };
      for(let a=29;a<201;a+=4){
        const f=clamp((a-31)/169),x=a+off;
        const lobe=.61+.39*smooth(-.52,.65,Math.cos(f*10.4-.42));
        c.globalAlpha=(1-smooth(.004,.069,u))*smooth(29,52,a)*(1-smooth(143,201,a))*(.40+.60*smooth(.012,.083,Math.abs(f-.51)));
        c.beginPath();c.moveTo(x,warmY(x));c.lineTo(x+4.35,warmY(x+4.35));
        c.lineWidth=2*(1.40+1.22*Math.sin(Math.PI*f))*(.58+.42*lobe);
        c.strokeStyle='#ff9a28';c.shadowColor='#ff7219';c.shadowBlur=6.2;c.stroke();
        c.strokeStyle='#ffe092';c.lineWidth*=.31;c.shadowBlur=0;c.stroke();
      }
    }
    c.restore();
  }
  function draw(c,time,scene){
    const t=Math.max(0,Math.min(end,time)),x=scene.casterX,ground=scene.ground;
    scene.stage(c);
    const dark=.19*smooth(.08,.54,t)*(1-smooth(4.0,4.22,t))+.14*smooth(2.27,2.44,t)*(1-smooth(3.85,4.17,t));
    if(dark){c.fillStyle='rgba(17,27,52,'+dark+')';c.fillRect(0,0,W,H);}
    const pose=t<.13?'idle':t<.27?'gather':t<2.313?'charge':t<2.397?'drive':t<4.174?'fire':t<4.235?'recover':'idle';
    const palm=scene.palm?scene.palm(pose,x):{x:x+(pose==='fire'?55.86:pose==='drive'?52.08:-10.50),y:ground+(pose==='fire'?-63:pose==='drive'?-58.80:-44.94)};
    chargeWind(c,t,x,ground,palm);
    if(t>=2.365&&t<4.17){
      const v=smooth(2.365,2.47,t)*(1-smooth(3.97,4.18,t));
      c.save();c.globalAlpha=v;
      halo(c,palm.x+35,ground-1,117,[[0,'rgba(112,190,255,.43)'],[.46,'rgba(89,153,255,.22)'],[1,'rgba(75,124,249,0)']],.25);
      c.restore();
    }
    scene.fighter(c,'target',scene.targetX,t>=2.431&&t<4.1?'hurt':'idle',{});
    scene.fighter(c,'caster',x,pose,{});
    chargeLight(c,t,palm);
    if(t>=2.349&&t<4.2){const g=hardware();if(g&&g.draw(t,palm))c.drawImage(g.canvas,0,0);else fallbackStream(c,t,palm);}
  }
  window.DragonKame={duration:end,draw,phases:[
    {t:0,name:'起手'},{t:.633,name:'气粒汇掌'},{t:2.233,name:'收束凝核'},
    {t:2.400,name:'首束离手'},{t:2.767,name:'冲圈与缠束'},
    {t:4.133,name:'抽丝收束'},{t:4.200,name:'余波离场'}
  ]};
})();
