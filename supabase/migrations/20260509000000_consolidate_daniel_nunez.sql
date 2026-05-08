-- One-shot consolidation of duplicate "Daniel Núñez" artist rows.
-- Picks the oldest non-deleted row as canonical, repoints every artwork
-- whose artist_id is one of the duplicates, then soft-deletes the
-- duplicate artist rows.
--
-- The name match is case-insensitive and handles three common spellings:
--   "Daniel Núñez" (with combining diacritics)
--   "Daniel Nuñez"
--   "Daniel Nunez"
-- Idempotent: re-running after the first execution is a no-op.

DO $$
DECLARE
  v_canon uuid;
  v_dup_count int;
BEGIN
  -- Pick the oldest matching row as the canonical id.
  SELECT id INTO v_canon
  FROM public.artists
  WHERE deleted_at IS NULL
    AND LOWER(TRIM(name)) IN ('daniel núñez', 'daniel nuñez', 'daniel nunez')
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_canon IS NULL THEN
    RAISE NOTICE 'No "Daniel Núñez" row found — nothing to consolidate.';
    RETURN;
  END IF;

  -- Repoint artworks belonging to the duplicates onto the canonical id.
  UPDATE public.artworks
  SET artist_id = v_canon
  WHERE artist_id IN (
    SELECT id
    FROM public.artists
    WHERE deleted_at IS NULL
      AND LOWER(TRIM(name)) IN ('daniel núñez', 'daniel nuñez', 'daniel nunez')
      AND id <> v_canon
  );

  -- Soft-delete the duplicate artist rows.
  UPDATE public.artists
  SET deleted_at = NOW()
  WHERE deleted_at IS NULL
    AND LOWER(TRIM(name)) IN ('daniel núñez', 'daniel nuñez', 'daniel nunez')
    AND id <> v_canon;

  GET DIAGNOSTICS v_dup_count = ROW_COUNT;
  RAISE NOTICE 'Consolidated % duplicate Daniel Núñez row(s) into %', v_dup_count, v_canon;
END $$;
