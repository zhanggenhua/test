/* Full-arena Kamehameha. The clock starts at frame 126 of Hovl's demonstration. */
(() => {
  'use strict';
  const W=960,H=400,TAU=2*Math.PI,start=2.4,end=128/30;
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=(a,b,t)=>{const k=clamp((t-a)/(b-a));return k*k*(3-2*k);};
  const lerp=(a,b,u)=>a+(b-a)*u;
  const throat=9, tubeRadius=47, settleDistance=78;
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
    const axis=x=>2.6*Math.sin(x*.0076-u*5.8);
    const section=x=>(tubeRadius+(throat-tubeRadius)*Math.exp(-x/settleDistance))*
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
      const life=fract(Math.max(0,u-.027)*1.36+i/3),r=17+43*life,dx=-2-life*24;
      const active=smooth(.008+i*.012,.096+i*.026,u)*(1-smooth(4.0,4.174,t));
      for(let side=0;side<3;side++){
        c.globalAlpha=active*[.36,.87,.94][side];
        c.shadowColor='#54c0ff';c.shadowBlur=[13,7,3][side];c.strokeStyle=['#429aff','#5fcaff','#e9ffff'][side];
        c.lineWidth=[7.2,5.4,2.89][side];c.beginPath();
        c.ellipse(dx,0,r*(.245+.075*life),r,0,[.78,1.55,2.71][side],[6.60,5.20,4.91][side]);c.stroke();
      }
    }
    c.shadowBlur=0;c.globalAlpha=Math.max(palmLight,(1-smooth(.012,.10,u))*smooth(-.045,-.004,u));
    const punch=Math.exp(-(((u-.037)/.095)**2)),r=18+16*punch+2.2*Math.sin(u*16)*field;
    halo(c,0,0,r*3.5,[[0,'#ffffff'],[.23,'#ebffff'],[.36,'#a0edff'],[.59,'rgba(76,171,255,.57)'],[1,'rgba(63,133,255,0)']],1.15);
    const arcs=[];
    for(let i=0;i<64;i++){
      const a=i*TAU/64,rad=r*(.96+.069*Math.cos(3*a-u*10)+.031*Math.sin(7*a+u*11));
      arcs.push(rad*Math.cos(a),(1.13-.10*punch)*rad*Math.sin(a));
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
          const y=v=>(i-2)*(.8+4.2*v/span)+(.9+2.1*v/span)*Math.sin(v/span*9+i*2.6+u*27);
          c.lineWidth=1.3+1.1*g;c.beginPath();c.moveTo(x,y(x));c.lineTo(x+6,y(x+6));c.stroke();
        }
      }
      const off=Math.max(0,u)*1900;
      const warmY=x=>{
        const f=clamp((x-off-31)/169);
        return -5+9*f*f+2.5*Math.sin(f*5.8+.54);
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
  function draw(c,time,scene,view){
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
    if(t>=2.349&&t<4.2){
      const volume=window.DragonBeamVolume.draw(t,palm,view);
      if(volume)c.drawImage(volume,0,0);
      else fallbackStream(c,t,palm);
    }
  }
  window.DragonKame={duration:end,draw,get ready(){return Promise.resolve().then(()=>window.DragonBeamVolume.warm());},phases:[
    {t:0,name:'起手'},{t:.633,name:'气粒汇掌'},{t:2.233,name:'收束凝核'},
    {t:2.400,name:'首束离手'},{t:2.767,name:'冲圈与缠束'},
    {t:4.133,name:'抽丝收束'},{t:4.200,name:'余波离场'}
  ]};
})();
