/* Source beam in the shared side-view arena. */
(() => {
  'use strict';

  const width=960,height=400,release=2.4;
  const fxScale=[.34,.43,.46];
  const clamp=x=>Math.max(0,Math.min(1,x));
  function smooth(a,b,v){const x=clamp((v-a)/(b-a));return x*x*(3-2*x);}
  function pose(time){
    if(time<.13||time>=4.235)return 'idle';
    if(time<.27)return 'gather';
    if(time<2.313)return 'charge';
    if(time<2.397)return 'drive';
    return time<4.174?'fire':'recover';
  }
  function sample(time,scene,reach){
    const caster=pose(time),palm=scene.palm(caster,scene.casterX);
    const age=time-release;
    const contact=age>=0&&time<4.10&&reach(age)*fxScale[0]>=scene.targetX-palm.x-12;
    const charge=smooth(.10,.55,time)*(1-smooth(4.00,4.23,time));
    const beam=smooth(2.36,2.47,time)*(1-smooth(4.00,4.19,time));
    return {anchor:[palm.x,palm.y,0],groundAnchor:[scene.casterX,scene.ground-100*fxScale[1]-.9,0],
            scale:fxScale,casterPose:caster,targetPose:contact?'hurt':'idle',
            ambience:1-.14*charge-.10*beam,characterLight:1-.06*charge};
  }

  let runner,ready;
  window.DragonBeamArena={
    get duration(){return DragonKame.duration;},
    get phases(){return DragonKame.phases;},
    get sourceMaterials(){return !!runner;},
    get ready(){
      return ready??=(async()=>{
        const source=await window.loadDragonSourceMeshes('side-meshes');
        if(!source){await DragonKame.ready;return;}
        const canvas=document.createElement('canvas');
        canvas.width=width;canvas.height=height;
        runner=DragonBeamVolume.createStudy(canvas,(gl,program)=>createDragonArenaStage(gl,program,(t,scene)=>sample(t,scene,source.reach)),source,true);
        if(!runner)throw Error('横版原材质预览需要 WebGL 2');
      })();
    },
    draw(ctx,time,scene){
      if(!runner){DragonKame.draw(ctx,time,scene);return;}
      const canvas=runner.draw(time,{x:scene.casterX,y:scene.ground},{scene});
      if(canvas)ctx.drawImage(canvas,0,0);
    },
  };
})();
