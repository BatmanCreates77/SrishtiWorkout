# Third-party notices

This app is licensed under the **GNU AGPL v3.0** (see `LICENSE`) because it uses openGym's exercise catalogue text.
It is a personal, non-commercial project.

## Exercise data: openGym
`vendor/openGym` is a git submodule of [DuarteSantos8/openGym](https://github.com/DuarteSantos8/openGym)
(Copyright (C) 2026 Duarte Santos, AGPL-3.0). `scripts/build-data.mjs` reads its catalogue
(`catalogue/exercises/*.json`: names, muscles, descriptions, instructions) at build time. Entries marked
`"textSource": "exercisedb"` originate from ExerciseDB v1 via hasaneyldrm/exercises-dataset (MIT).

openGym's exercise **media** (stills and animations, licensed to openGym by Gym visual) is **not used, copied or
served** by this app.

## Exercise demo photos: free-exercise-db
`vendor/free-exercise-db` is a git submodule of [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db),
released under the Unlicense (public domain). The build copies the start/end photos of mapped exercises to
`public/demo/`. The mapping (openGym id → free-exercise-db id) is hand-checked in `coach-skill/content/media-map.json`.
