# DBFZ Base Goku LV3 Super Spirit Bomb: wide-view check

## Local capture reviewed

The existing source sequence is `../base-goku.mp4`, 640x360. `../pts.json` maps the captured original full-frame PNGs in `../frames/` to source presentation timestamps. The capture-frame match at 58.421s is exact: extracting `base-goku.mp4` at 58.421s and scaling to its native 640x360 yields the same SHA-256 as `frames/source-0049.png`. The adjacent clips `fighterz.mp4` and `kid-buu.mp4` are different footage and do not match that frame.

Copied original full frames, with no crop or resizing:

- `dbfz-base-goku-lv3-charge-58.421s.png` — Goku under the orb; the upper orb boundary is outside the camera frame.
- `dbfz-base-goku-lv3-charge-58.921s.png` — orb grows; its upper boundary remains outside the frame.
- `dbfz-base-goku-lv3-impact-63.988s-columns.png` — narrow impact columns; no complete bomb silhouette.
- `dbfz-base-goku-lv3-impact-64.588s.png` — peak light fills the frame and hides the far edge.
- `dbfz-base-goku-lv3-impact-64.688s.png` — torn/occluded impact surface, but no closed outer contour.
- `dbfz-base-goku-lv3-aftershock-64.788s.png` — fragments and horizontal trails; the blast envelope is out of frame.
- `dbfz-base-goku-lv3-recovery-64.954s.png` — recovery aftermath, not a full sphere.

Times are source PTS, not relative offsets. The local sequence confirms that this in-game camera does not provide a frame showing the whole sphere, its center, and its back edge together; it crops the charged orb at the top and then fills the shot with the impact.

## Public same-version still

`steam-store-base-goku-spirit-bomb-charge-1920x1080.jpg` is the full 1920x1080 screenshot linked from the official [Dragon Ball FighterZ Base Goku Steam page](https://store.steampowered.com/app/779936/DRAGON_BALL_FighterZ__Goku/). It confirms the same Base Goku Spirit Bomb charge presentation, but the top of the sphere is cropped and it is a still with no playback timestamp. Direct image source: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/779936/ss_8fc4f607adb7d8cb86b5f505d56762f410d0a854.1920x1080.jpg?t=1716405411`.

The official Steam post links Bandai Namco's Base Goku gameplay trailer, including the Super Spirit Bomb: https://youtu.be/t1F96Yb53-Y. The searchable 4K Japanese “All Ultimate Attacks” video is not a valid replacement for this move: its listed Goku sequences are GT Goku's Super Ultra Spirit Bomb and SSJ3 Goku's Meteor Smash, not Base Goku's LV3 Super Spirit Bomb.

## What the supplementary views establish

The regular Base Goku LV3 impact fills the camera before its entire contour can be seen. For shape, the player includes `fighterz-finish-contact-wide.png`, a native 1280×720 frame from the separate Super Saiyan Goku vs. Kid Buu Dramatic Finish in the same game. Frame 4288 (zero-based, 24 fps) of the local `kid-buu.mp4` falls at 178.667 s. The included 177–181 s silent excerpt lets viewers check the band curvature, occlusion and direction in motion. The original upload of this local recording is unverified.

Three full frames from the [Kid Buu anime sequence](https://www.bilibili.com/video/BV1ACvYejEEA/?t=1223) show the luminous silhouette and detached arcs at 20:23, near-side ejecta at 20:29 and ground depth at 20:30.5. These references show other performances of the Spirit Bomb. The playable adaptation takes impact timing from the Base Goku LV3. The back side, interior density and tear depth are reconstructed.
