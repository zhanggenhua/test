-- Generalized from the validated pixel-sprite-lab assembler.
-- All inputs are complete, aligned RGBA frames. No limb transformations.
local path=assert(app.params.manifest, 'Pass --script-param manifest=/path/motion.json')
local base=path:match('^(.*[/\\])') or './'
local function resolve(p)
  if p:match('^/') or p:match('^%a:[/\\]') then return p end
  return base..p
end
local f=assert(io.open(path,'r'))
local motion=json.decode(f:read('*a')); f:close()
assert(#motion.frames>0, 'No frames')
assert(motion.canvas[1]>0 and motion.canvas[2]>0, 'Invalid canvas')
local images={}
for i,frame in ipairs(motion.frames) do
  assert(frame.duration_ms>0 and frame.duration_ms%10==0, 'Use positive 10 ms durations for GIF')
  local im=Image{fromFile=resolve(frame.image)}
  assert(im.width==motion.canvas[1] and im.height==motion.canvas[2], 'Frame size mismatch: '..frame.image)
  images[i]=im
end
local sprite=Sprite(motion.canvas[1],motion.canvas[2],ColorMode.RGB)
sprite.layers[1].name='character'
for i,frame in ipairs(motion.frames) do
  if i>1 then sprite:newEmptyFrame() end
  sprite.frames[i].duration=frame.duration_ms/1000
  sprite:newCel(sprite.layers[1],i,images[i],Point(0,0))
end
local tag=sprite:newTag(1,#motion.frames);tag.name=motion.tag or 'animation'
sprite:saveAs(resolve(assert(motion.output, 'Missing output path')))
assert(#sprite.frames==#motion.frames and #sprite.layers==1)
print('Saved '..#sprite.frames..' complete drawings: '..resolve(motion.output))
