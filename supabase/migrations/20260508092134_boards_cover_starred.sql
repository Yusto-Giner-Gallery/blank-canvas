-- Optional cover colour and per-user-irrelevant "starred" flag for
-- Kanban (Shirika) boards. Drives the Trello-style cover stripe and
-- the "Starred" section on /kanban.

ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS starred boolean NOT NULL DEFAULT false;

-- Restrict colour to the existing label palette so the cover stripes
-- on the boards page stay visually consistent with the card-tile
-- covers on the board view. Allow NULL for "no cover".
ALTER TABLE public.boards
  DROP CONSTRAINT IF EXISTS boards_color_check;
ALTER TABLE public.boards
  ADD CONSTRAINT boards_color_check
  CHECK (color IS NULL OR color IN ('red','orange','yellow','green','blue','purple'));
