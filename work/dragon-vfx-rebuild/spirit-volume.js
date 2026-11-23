/* The burst at impact. World units are relative to the incoming ball's radius.
   The outer skin, recessed core and the ribbons all use the scene depth buffer. */
(() => {
  'use strict';

  const vertex = `#version 300 es
    precision highp float;
    precision highp int;
    layout(location=0) in vec3 position;
    layout(location=3) in vec4 curve;
    layout(location=4) in vec4 brush;
    uniform mat4 vp;
    uniform float age;
    uniform int layer;
    out vec3 world;
    out vec3 surface;
    out vec4 stroke;

    float ease(float a,float b){return smoothstep(a,b,age);}
    vec3 corePoint(vec3 n,float lift){
      float open=ease(.035,.46),land=ease(.85,1.31);
      float ripple=sin(4.*atan(n.z,n.x)+age*5.+n.y*9.)*.009*open;
      float s=1.+.077*open-.33*land+ripple+lift;
      vec3 q=n;
      // The north pole actually folds into the core. A side or elevated
      // camera therefore sees the far lip and can see only part of the pit.
      q.y-=open*.75*pow(max(0.,n.y),6.0);
      float tilt=.49*open;
      q.yz=mat2(cos(tilt),sin(tilt),-sin(tilt),cos(tilt))*q.yz;
      q.xz*=1.+.047*exp(-pow((age-.15)/.11,2.));
      q.y*=1.-.16*exp(-pow((age-.15)/.11,2.))-.51*land;
      if(layer==2){
        float fall=ease(1.10,1.43);
        q.y*=1.-.57*fall;
        q.xz*=1.-.28*fall;
        q.y-=.17*fall;
      }
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
      stroke=vec4(0.);
      if(layer==2){
        float t=position.x,edge=position.y;
        float th=curve.x+curve.y*t+age*brush.z;
        float bend=sin(t*4.6+brush.w)*.027+sin(th*2.1+brush.w)*.019;
        float lat=mix(curve.z,curve.w,t)+bend;
        float taper=smoothstep(0.,.17,t)*(1.-smoothstep(.68,1.,t));
        float width=brush.x*taper*(.77+.23*sin(t*15.+brush.w));
        lat+=edge*width;
        vec3 n=vec3(cos(lat)*cos(th),sin(lat),cos(lat)*sin(th));
        surface=n;
        world=corePoint(n,brush.y+.010*taper);
        stroke=vec4(t,edge,brush.x,brush.w);
      }else{
        surface=normalize(position);
        if(layer==4){
          float t=ease(.89,1.31);
          float r=(.84+.70*t)*(1.-.18*ease(1.38,1.62));
          vec2 ground=surface.xz*r;
          float phase=atan(ground.y,ground.x)*2.-length(ground)*6.+age*4.;
          float crest=.045*sin(phase)*surface.y;
          world=vec3(ground.x,.035+(1.-surface.z)*.104+surface.y*(.26-.15*t)+crest,ground.y);
        }else world=layer==1?corePoint(surface,0.):shellPoint(surface);
      }
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
    in vec4 stroke;
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
        float fracture=1.-smoothstep(.72,1.245,age);
        float survival=max(fracture+.14*(.52-rim),1.-smoothstep(.038,.15,lowBand));
        if(breakup>.001&&fault+jag>survival*.80+.021)discard;
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
          put(shell,sweep*(.91+.08*rim));return;
        }
        float opening=.32+.095*(broad-.5)+.060*sin(rotating*2.+lat*5.);
        float rimCoverage=1.-smoothstep(opening-.075,opening+.046,rim);
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
        put(shell,mask*sweep*(.91+.08*belt));return;
      }

      float coreSurvival=layer==2?1.-smoothstep(1.04,1.46,age):1.-smoothstep(.84,1.28,age);
      float plate=.48*broad+.23*grain+.29*clamp(1.-curl*2.,0.,1.);
      if(1.-coreSurvival>plate+.045)discard;
      vec3 surfaceN=normalize(cross(dFdx(world),dFdy(world)));
      float fres=pow(1.-abs(dot(v,surfaceN)),2.1);
      if(layer==2){
        float cut=abs(stroke.y),tip=smoothstep(0.,.11,stroke.x)*(1.-smoothstep(.78,1.,stroke.x));
        float brushNoise=noise3(vec3(stroke.x*26.,stroke.y*2.2,stroke.w));
        float fibers=abscomb(stroke.y*2.3+.20*sin(stroke.x*19.+stroke.w)+.17*brushNoise);
        float opacity=tip*smoothstep(.035,.42,open)*(1.-smoothstep(.55+.22*brushNoise,1.01,cut));
        if(opacity<.026)discard;
        float spark=pow(max(0.,cos(stroke.x*8.-age*7.+stroke.w)),6.);
        vec3 tint=mix(vec3(.23,.71,.91),vec3(.91,1.22,1.32),1.-cut*.80);
        tint+=vec3(.44,.63,.74)*(1.-smoothstep(.05,.24,fibers))*(.40+.60*brushNoise);
        tint+=vec3(.55,.53,.48)*spark;
        put(tint,opacity*(.68+.31*brushNoise));return;
      }
      // A helical current converges inside the recessed north pole. The
      // longitude terms have integer winding, preserving the texture seam.
      float bottom=.48+.52*smoothstep(-.88,.9,n.y);
      float eyePit=smoothstep(.935,.997,n.y);
      vec3 marine=mix(vec3(.047,.20,.32),vec3(.12,.47,.62),bottom*.74+.23*broad);
      vec3 body=mix(marine,vec3(.026,.13,.215),eyePit*.85);
      float broadTrack=pow(1.-smoothstep(0.,.39,curl),1.4);
      float breadth=.007+.021*grain+.014*smoothstep(-.28,.83,cos(rotating-.5+n.y*.7));
      float line=1.-smoothstep(breadth,breadth+.029,curl);
      float rough=noise3(vec3(az(rotating)*11.2,n.y*26.+age*.9));
      float fiberPhase=bank*5.+.21*sin(3.*rotating-12.*n.y)+.32*(grain-.5)+.22*(rough-.5);
      float fine=exp(-abscomb(fiberPhase)*13.)*smoothstep(.15,.73,grain);
      float twin=exp(-abscomb(fiberPhase-.21-.11*rough)*16.)*smoothstep(.39,.71,rough);
      float cutout=.28+.72*smoothstep(-.48,.68,cos(2.*rotating+n.y*8.+broad*2.));
      float lip=smoothstep(.60,.83,n.y)*(1.-smoothstep(.91,.99,n.y));
      body+=vec3(.07,.27,.36)*broadTrack+vec3(.18,.36,.44)*fres;
      float fray=smoothstep(.15,.73,grain*.39+rough*.61);
      body+=vec3(.84,1.05,1.19)*line*cutout*(.22+.78*fray);
      body+=vec3(.58,.68,.76)*(fine+.72*twin)*(.48+.52*cutout);
      body+=vec3(.14,.26,.37)*lip*(.47+.53*grain);
      float focus=dot(n,normalize(vec3(.78,.56,.41)));
      float shoulder=smoothstep(.78,.996,focus)*(.66+.34*grain);
      body+=vec3(.75,.97,1.03)*shoulder*(.47+.63*line+.38*fine);
      float impactFlash=exp(-pow((age-.29)/.132,2.));
      float contactFace=smoothstep(-.29,.81,dot(n,normalize(vec3(.31,.60,.74))));
      body*=1.-.22*impactFlash*smoothstep(.15,.39,curl);
      float inletLip=(.055+.22*contactFace+.72*broadTrack+.32*line)*(1.-.88*smoothstep(.89,.978,n.y));
      body+=vec3(1.59,1.80,1.91)*impactFlash*inletLip;
      float fractureGlow=breakup*(1.-smoothstep(.02,.09,plate+.045-(1.-coreSurvival)));
      body+=vec3(.25,.65,.81)*fractureGlow;
      // The incoming turquoise orb initially has no hole or mature shell.
      float inlet=noise3(n*3.3+vec3(.2,age*2.,.4));
      float flare=smoothstep(.35,.91,1.-length(n-vec3(.14,.25,.89))*.79);
      vec3 initial=mix(vec3(.075,.48,.79),vec3(.45,.85,1.02),.62*inlet+.37*fres);
      initial+=vec3(.63,.75,.78)*flare*(.6+.4*inlet);
      float takeover=smoothstep(.018,.23,age);
      if(takeover<.005)discard;
      put(mix(initial,body,smoothstep(.038,.30,age)),takeover);
    }`;

  function makeRibbons(gl){
    const vertices=[],indices=[],segments=105;
    let seed=731;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    function ribbon(angle,arc,base,end,width,lift,speed,key){
      const first=vertices.length/11;
      for(let i=0;i<=segments;i++){
        for(const side of [-1,1])vertices.push(i/segments,side,0,angle,arc,base,end,width,lift,speed,key);
        if(i<segments){
          const j=first+2*i;
          indices.push(j,j+1,j+2,j+2,j+1,j+3);
        }
      }
    }
    // Five larger streams and their shorter peeling ends share a current.
    const currents=[[-1.03,.16],[-.56,.21],[-.13,.24],[.39,.23],[.82,.22]];
    currents.forEach(([latitude,rise],i)=>{
      const angle=i*2.11+.33,arc=5.9+random()*2.1,speed=1.45+random()*.58;
      ribbon(angle,arc,latitude,latitude+rise,.016+random()*.015,.019,speed,random()*19);
      for(let j=0;j<8;j++){
        const start=angle+random()*5.8,base=latitude+(random()-.46)*.245;
        ribbon(start,1.5+random()*3.9,base,base+rise*(.25+random()*.77),
          .005+random()*.010,.013+random()*.013,speed+(random()-.5)*.39,random()*29);
      }
    });
    for(let i=0;i<8;i++){
      const latitude=.93+i*.067;
      ribbon(i*1.36,2.8+random()*2.7,latitude,Math.min(1.55,latitude+.13),
        .004+random()*.008,.013,2.4+random()*.9,random()*19);
    }
    const vao=gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vb=gl.createBuffer(),ib=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,vb);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    for(const [loc,size,offset] of [[0,3,0],[3,4,3],[4,4,7]]){
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc,size,gl.FLOAT,false,44,offset*4);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return {vao,count:indices.length};
  }

  window.SpiritVolumeBuild=(gl,geom)=>{
    const material=geom.program(vertex,fragment);
    const layer=gl.getUniformLocation(material,'layer'),ribbons=makeRibbons(gl);
    return function render(age){
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
      gl.depthMask(true);gl.cullFace(gl.FRONT);
      gl.uniform1i(layer,0);geom.draw(geom.sphere);
      // The recessed north pole folds over the near lip; rasterize both
      // sides so the depth buffer picks the visible part of the funnel.
      if(age<.22)gl.cullFace(gl.BACK);else gl.disable(gl.CULL_FACE);
      gl.uniform1i(layer,1);geom.draw(geom.sphere);
      gl.disable(gl.CULL_FACE);gl.depthMask(false);
      gl.uniform1i(layer,2);gl.bindVertexArray(ribbons.vao);
      gl.drawElements(gl.TRIANGLES,ribbons.count,gl.UNSIGNED_SHORT,0);
      gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.depthMask(true);
      gl.uniform1i(layer,3);geom.draw(geom.sphere);
      gl.bindVertexArray(null);
    };
  };
})();
