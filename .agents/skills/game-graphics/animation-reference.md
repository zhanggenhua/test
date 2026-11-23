# Sprite Animation Deep Dive

## Handedness and Equipment Roles

- **Identify the character’s anatomical left and right before selecting a source.** Trace each visible shoulder through its elbow to its wrist, with the character’s facing and camera view established. Record the source frame or time and which hand holds, leads, supports, blocks, or releases at the ready pose, active phase, and recovery. Use neighboring clear frames to resolve occlusion. Mark a side unverified when the footage does not establish it. Mirroring the image changes screen direction. Track the same anatomical limb through the mirror.
- **Match side and role before tracing or retargeting.** Reuse a limb’s poses or curves only when its anatomical side, equipment, and role match the target across the phases being reused. Never drive the target right arm with the source left arm or assign a two-handed weapon’s support arm to a shield while keeping its old role. A mismatched or unverified source can inform timing, spacing, silhouette or footwork. Document what it informed and use separately authored motion or a verified source for the target hands.
- **Verify the result at playback size.** Compare the source and candidate’s actual shoulder–elbow–wrist chains and equipment contacts through ready, action, and recovery. Check grip, draw order, and apparent hand changes in adjacent frames. For rigs, inspect the rendered silhouette and the bone overlay together. Record the source frames used, which curves or poses were reused, and which observations were visual reference only.

## Xubodang Generate and Edit Workflow
    
1. **Select the real move and reference.** Trace the game action to its actual call site. View the original poses and confirm the phase order and timing before generating. Use the approved character design for anatomy, palette and equipment. Record the source frame for every required pose. For a run, explicitly locate the hip, bearing foot, push-off leg, air clearance, landing angle and exchange of leg roles.
2. **Generate each complete pose.** Submit the approved character and the corresponding source frame to the image tool, one pose per output. Use source pose and joint directions as the motion baseline. Preserve the prompt, actual input images, and returned full-frame file.
3. **Edit the returned images.** Use each generated frame as the edit target along with its source frame and the approved identity. Fix the specific silhouette, contact, costume or equipment problem found in that pose. Save edited full-frame outputs separately from drafts, with input/output lineage. For a local correction, compare the untouched area with the edit input. If the image model repaints unrelated areas, use a localized edit or the tool’s full-frame export with that repair isolated. Verify unchanged opaque pixels and inspect the repair boundary at display size. Approve palette, leg lengths, knees, grips and occlusion against neighboring edited poses. Limit assembly to whole-frame uniform scaling, translation and exposure timing.
4. **Require independent source-based review.** Follow [Animation Acceptance](#animation-acceptance). Give a subagent the raw reference frames and synchronized playable tracks. Require a source comparison for each suspected mismatch, and recheck the revised frames and their neighbors before delivery.
5. **Record actual status.** Report generated and edited frames and the result of reference-based review. For a generation or editing entry that reports quota exhaustion, refusal, queue failure, or missing output, stop that entry and state the actual failure and missing frames immediately. Resume at a viable authorized step.

## Stick Figure Drawing

1. **Choose the style and motion references.** Inspect the approved character design and the actual source frames. The design establishes proportions, limb thickness, costume and equipment. The source motion establishes weight, support, grip, occlusion and timing. Record the relevant frame or time for each key pose.
2. **Establish action masters with image generation.** Use the approved design and matching source poses when a change in silhouette, support or equipment needs a visual anchor. Check each master at display size. Use its sound pose, design and overlap cues. Reject proportion, contact or occlusion errors before tracing, even when the rest of that pose is usable.
3. **Set the body baseline before tracing clothes.** Use an approved frame with exposed limbs at a comparable angle. Align by anatomy and the ground rather than outer costume bounds. Draw the shoulder line, pelvis, joint positions and bare limb silhouettes first. Check that their projected lengths, widths and silhouette volume carry across adjacent frames where facing and depth stay stable. Estimate a hidden landmark from the same body at a nearby clear pose and test its continuity against both neighbors. An occlusion boundary is evidence about the overlap, rather than a new anatomical joint. Record the projected widths at corresponding stations such as mid-thigh, knee and calf, measured perpendicular to the local limb axis. Resolve hidden edges from that body profile and the nearest clear poses. Keep costume, armor, and held objects on separate drawing passes with explicit overlap edges. A skirt edge or a dark fold merged into a thigh is a costume cue; use the exposed body baseline for the leg beneath it.
4. **Draw the remaining complete poses on the source timeline.** Establish foot contacts and weight transfer first. Use the accepted masters and the body baseline for consistent proportions. Compare adjacent drawings with onion skin. Check the silhouettes with the costume pass hidden at the start, deepest bend and return, then check the dressed poses. Carry the same outline, color boundaries, scale and landmarks across poses for parts whose view and shape stay stable in the source. Reuse the same drawing for a held source pose. When generating a frame-for-frame redraw, use the same masters and matching ordered source poses.
5. **Review the exported cycle.** Play the full move at its intended speed and display size, then inspect the same phase, direction and scale of the source motion and the body and action baselines. Verify stance, limb width, clothing follow-through, grip and the return pose. Show the references actually used and distinguish uploaded images from visual checks. Report which images were generated, which poses were directly drawn, and any remaining differences. Use [Animation Acceptance](#animation-acceptance) for the synchronized review.

### Drawing and motion checks from the reviewed skills

- **Shape and coverage.** Compare one matching pose to the approved artwork at display size. Check the exact silhouette of each hand and foot, its connection to the limb, the knee curve and the face opening before lighting. Use a few value groups to describe the large forms, soften edges where adjacent forms already read, and put outlines behind the garments or equipment that cover them. [Klad drawing guide](https://github.com/klad-app/klad/blob/main/docs/skill/drawing/SKILL.md)
- **Pose and timing.** Set the held poses and phase lengths from the actual motion. Preserve the source's pose boundaries, including a deliberate hard cut or a one-shot ending. For an original move with no prescribed timing, design the arcs and exposures to fit the intended action. [Character animation skill](https://github.com/codepawl/creator-generalist/blob/main/plugins/3d-generalist/skills/animate-characters/SKILL.md) · [2D frame-by-frame reference](https://github.com/codepawl/creator-generalist/blob/main/plugins/3d-generalist/skills/animate-characters/references/2d-frame-by-frame-and-cutout.md)

For raster drawing, see [Krita's animation and onion-skin workflow](https://docs.krita.org/en/user_manual/animation.html).

## Animation Acceptance

Apply [Handedness and Equipment Roles](#handedness-and-equipment-roles) when hands control the action. Choose the acceptance criteria from what the user asked the result to reproduce. For animation intended to match the source frame by frame, follow the tracing checks below, including when an image or video tool produces the frames. When the video may develop its own poses and timing, follow the independent-motion checks.

### Frame-for-frame tracing

1. **Set the comparison.** Assign the user's approved reference for each property, such as motion, character design or equipment. The motion reference defines source poses, transitions, holds, event timing and where the action ends. Play on one clock at matched facing, camera, scale and ground. Preserve each source frame ID and duration in the comparison.
2. **Check the same two frames in both tracks.** When the candidate appears to jump, inspect the same part across both corresponding source frames before judging. Preserve a cut, a big step, a camera change or a cloth flip when the reference does it. A missing, delayed or invented movement is a motion mismatch. Jitter is extra drift in position, width, outline, color or shape where the reference establishes stability. Compare floor contact in canvas coordinates and check the consistency of carried parts relative to the local joint, grip or attachment, accounting for the direction or turn shown in the reference.
3. **Fix the drawing and keep the timing.** Copy a held character drawing exactly across its exposure and layer independent events separately. Correct unstable areas against a shared approved drawing or redraw affected full poses with consistent volumes and anchors. Preserve the source order, holds, occlusion and boundaries. Add intermediate poses or a loop closure only if the approved motion or the user calls for them. A one-shot replay can hard cut back to its first pose.
4. **Record observable evidence.** For each flagged adjacent pair give the identifiers and part, the change in the source and the change in the candidate, then the diagnosis. Use onion skin or a pixel measurement when needed for small drift. Confirm actual silhouettes and contact points, and watch both tracks at the intended size and speed, then step all affected transitions. Note which playback or source views were unavailable.
5. **Require independent art review.** For this user's game animations, give a subagent the actual source cels, accepted style, final candidates, user-marked areas and synchronized playback. Ask it to compare corresponding transitions as in step 2, including holds and the ending, and record a verdict for each candidate. Review revisions at the affected transition and on both sides. A playback test or a smooth-looking candidate is insufficient evidence of a match to the reference.

### Independently generated video

1. Check the approved design and intended move. Inspect the final pixels for stable body proportions, silhouette, equipment and grip across the video’s own neighboring frames. Check weight transfer, ground contact, facing, and camera stability. Allow its own stride, poses and timing within the motion brief.
2. Watch at intended size and native speed. Select a complete action or a continuous loop between equivalent events in the native video. Record the native frame indices, exclusive end, and frame rate. Step through the selection with its neighboring source frames and check the loop seam.
3. Compare alongside source material at common scale and facing where practical. Retain the selected video’s native timing and show its timecodes. Review against its raw clip and approved design, and distinguish native motion or shape problems from extraction and playback changes.

## Animation Principles for Games

### Keyframes vs In-Betweens

**Keyframes** define the extreme poses of an action — the essential positions that communicate the movement. **In-betweens** (tweens) fill the gaps for smoothness.

For pixel art, work keyframe-first:
1. Draw the contact/extreme poses (keyframes)
2. Test the animation with just keyframes
3. Add in-betweens only where needed for readability
4. Remove frames that don't add information

### Timing and Spacing

Timing (how long each frame holds) matters more than frame count:

```
Even timing:    ●───●───●───●───●    (mechanical, robotic)
Ease-in:        ●─●──●───●────●      (accelerating — start of jump)
Ease-out:       ●────●───●──●─●      (decelerating — landing)
Ease both:      ●─●──●───●──●─●      (natural — most organic motion)
```

Use **hold frames** — frames displayed longer than others — to add weight and emphasis:
- Hold the anticipation pose 2–3 frames before a fast strike
- Hold the impact frame 1–2 extra frames on landing
- Hold the peak of a jump for 1 frame for floaty feel

### Frame Rate Guidelines

| Animation Type | FPS | Reasoning |
|---------------|-----|-----------|
| Idle | 4–6 | Slow, ambient; shouldn't distract |
| Walk | 8–10 | Natural walking cadence |
| Run | 10–15 | Faster without being frantic |
| Attack/VFX | 12–20 | Snappy, responsive game feel |
| UI animations | 15–30 | Smooth polish elements |

Different animations on the same character can run at different frame rates.

## Walk Cycle Anatomy

### 4-Frame Walk (Small Sprites)

```
Frame 1: Contact      Frame 2: Passing       Frame 3: Contact      Frame 4: Passing
(right foot forward)  (right foot passing)   (left foot forward)   (left foot passing)

  ○                     ○                      ○                     ○
 /|\                   /|\                    /|\                   /|\
 / \                   ||                     / \                   ||
L   R                  R L                   R   L                 L R
```

Key principles:
- **Contact pose**: Legs at widest extension, body at lowest point
- **Passing pose**: Weight on one leg, other leg passing, body at highest point
- The up-down bounce (2–3 pixels) sells the walk
- Arms swing opposite to legs
- Head bobs with the body — don't keep it static

### 6–8 Frame Walk (Larger Sprites)

Add in-between frames:
1. Contact (right forward)
2. Down/Recoil (body drops, absorbs step)
3. Passing (weight transfers)
4. Up/Reach (body rises, extends next step)
5. Contact (left forward)
6. Down/Recoil
7. Passing
8. Up/Reach

### Walk Cycle Checklist

- [ ] Body bobs up and down (not just legs moving)
- [ ] Arms swing opposite to legs
- [ ] Torso has subtle lean in movement direction
- [ ] Head follows body bob (not floating independently)
- [ ] Loops seamlessly (last frame flows into first)
- [ ] Works when mirrored for opposite direction

## Run Cycle

Run differs from walk in key ways:

| Aspect | Walk | Run |
|--------|------|-----|
| Contact | Always one foot on ground | Both feet leave ground (flight phase) |
| Body lean | Slight | Pronounced forward lean |
| Arm swing | Small | Exaggerated, bent arms |
| Bounce | 2–3 px | 3–5 px |
| Stride | Short | Long |

### Run Cycle Structure (6 Frames)

1. **Contact** — Front foot strikes ground, body compressed
2. **Push-off** — Back leg extends, body launches
3. **Flight up** — Both feet airborne, body at highest point
4. **Reach** — Front leg extends forward for next contact
5. **Contact** (opposite leg)
6. **Flight** (opposite side)

## Attack Animations

### Three-Phase Structure

Every attack needs three distinct phases:

```
ANTICIPATION (wind-up)  →  ACTION (strike)  →  RECOVERY (follow-through)
   2–3 frames               1–2 frames            2–3 frames
   Slow, builds tension      Fast, impactful        Returns to idle
```

**Anticipation**: Movement opposite to strike direction. Sword raised behind, fist pulled back.

**Action**: The actual strike. Keep this SHORT (1–2 frames) for snappy game feel. Use smear frames or motion trails.

**Recovery**: Follow-through after the hit. Can be shortened or cancelled for combo systems.

### Smear Frames

A smear frame stretches the weapon/limb across the arc of motion in a single frame, creating a motion blur effect:

```
Normal frames:    Smear frame:
  /                 ╱╱╱╱
 ○                 ○
```

Use smear frames for:
- Fast weapon swings
- Punch/kick arcs
- Projectile launches
- Rapid turns/dashes

### Hit Feedback

Reinforce attacks with visual feedback:
- **Hitstop**: Freeze both attacker and target for 2–5 frames on impact
- **Screen shake**: 1–3 pixel displacement for 3–5 frames
- **Flash white**: Target flashes white/bright for 1 frame
- **Knockback**: Target pushed away from hit direction
- **Particles**: Spawn impact sparks, slash trails, debris

## Idle Animation

The most-seen animation. Keep it subtle:

### Simple Idle (2–3 Frames)
- Frame 1: Base pose
- Frame 2: Slight chest expansion (1 px up) — breathing in
- Frame 3: Optional transitional frame back to base

### Detailed Idle (4–6 Frames)
Add personality: weight shifting, blinking, looking around, hair/cape sway.

Rules:
- Must loop seamlessly
- Should not be distracting during gameplay
- Play at 3–6 FPS (slower than other animations)
- Show character personality (warrior: weapon ready; mage: magic particles)

## Jump Animation

Jumps are often **pose-based** rather than frame-animated — the game state drives which pose is shown:

```
State: ASCENDING     → Show crouch/launch frame
State: PEAK          → Show stretched/reaching frame
State: DESCENDING    → Show falling/bracing frame
State: LANDING       → Show impact squash (2–3 frames, then idle)
```

Squash and stretch sells the jump:
- **Crouch before jump**: Character squashes down 1–2 pixels
- **Peak**: Character stretches 1–2 pixels taller
- **Landing**: Character squashes again, then returns to normal height

## Directional Sprites

### How Many Directions?

| Facing System | Directions | Assets Needed | Common In |
|---------------|-----------|---------------|-----------|
| Side-only | 1 (+flip) | 1 set | Platformers |
| 4-directional | 4 | 3 sets (side is mirrored) | Top-down RPGs |
| 8-directional | 8 | 5 sets (mirror 3) | Isometric, tactical |

**Mirror trick**: Draw right-facing sprites only; flip horizontally in code for left-facing. Saves 50% of directional work. Exception: asymmetric characters (shield on one arm).

### Drawing Order for Directions

Start with the **side view** — it shows the most character profile and is easiest to animate. Then:
1. Side view (primary)
2. Front view (down-facing)
3. Back view (up-facing)
4. Diagonals (if using 8-direction)

## Animation State Machine

Structure character animations as a state machine:

```
         ┌─────────┐
         │  IDLE   │◄──────────────────────┐
         └────┬────┘                        │
              │ move input                  │ no input + grounded
              ▼                             │
         ┌─────────┐                        │
         │  WALK   │────────────────────────┤
         └────┬────┘                        │
              │ speed > threshold           │
              ▼                             │
         ┌─────────┐                        │
         │   RUN   │────────────────────────┤
         └────┬────┘                        │
              │ jump pressed                │
              ▼                             │
         ┌─────────┐    landed              │
         │  JUMP   │───────────────────────►│
         └────┬────┘                        │
              │ attack pressed              │
              ▼                             │
         ┌─────────┐    anim complete       │
         │ ATTACK  │──────────────────────►─┘
         └─────────┘
```

### Transition Rules

- **Interruptible**: Idle, Walk, Run can be immediately interrupted by any action
- **Non-interruptible**: Attack plays to completion (or to a defined cancel window for combos)
- **Priority**: Hurt/Death override all other animations
- **Blending**: For smooth transitions, last frame of current anim should visually connect to first frame of next anim

## Sprite Sheet Organization

### Layout Conventions

```
Row 0: Idle (all directions)
Row 1: Walk (all directions)
Row 2: Run (all directions)
Row 3: Attack (all directions)
Row 4: Jump phases
Row 5: Hurt / Death
```

### Export Checklist

- [ ] Consistent frame size across all animations (even if sprite doesn't fill frame)
- [ ] 1–2 px padding between frames
- [ ] Transparent background (alpha channel)
- [ ] Character centered/grounded consistently in each frame
- [ ] Total sheet dimensions are power-of-2 (or engine handles packing)
- [ ] Accompanying JSON/XML metadata with frame rects and animation definitions
- [ ] Named animation tags (idle, walk, run, attack) in metadata

## Onion Skinning

Onion skinning displays previous/next frames as transparent overlays while drawing:

- **Previous frames** (typically red-tinted): Shows where you came from
- **Next frames** (typically blue/green-tinted): Shows where you're going
- Display 1–2 frames in each direction for most work
- Essential for smooth transitions between keyframes
- Available in Aseprite, Krita, Piskel, and most animation tools

## Production Tips

- **Animate before detailing**: Get the motion right with rough shapes, then refine the pixel art
- **Test at game speed early**: An animation that looks great frame-by-frame may not work at 10 FPS
- **Reuse frames**: Walk and run cycles can share some contact poses
- **Mirror trick**: Draw one direction, mirror for the other (saves ~50% work)
- **Modular characters**: Separate head/torso/legs for mix-and-match or procedural animation
- **Reference videos**: Record yourself performing the action for timing reference
- **Study games you admire**: Frame-step through animations in your favorite pixel art games
