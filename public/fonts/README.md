# Dossier title font

`Inter-Bold.ttf` is loaded at runtime by `src/lib/pdf/glyph-path.ts` and used
by `opentype.js` to extract glyph paths for the editorial dossier cover
title (the hollow PARALLELS-style headline).

The committed file is currently a temporary stand-in (LiberationSans-Bold —
a very close grotesque sans, SIL OFL licensed) because the build environment
this repo was bootstrapped in did not have network access to download Inter.

**To swap in real Inter for a pixel-exact brand match:** download
`Inter-Bold.ttf` from <https://github.com/rsms/inter/releases> (or any Inter
3.x release) and overwrite this file. No code changes needed.

Both Inter and Liberation Sans are licensed under SIL OFL — fine for
commercial embedding and distribution.
