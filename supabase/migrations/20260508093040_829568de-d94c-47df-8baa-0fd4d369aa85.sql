ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS color text
    CHECK (color IS NULL OR color IN ('red','orange','yellow','green','blue','purple')),
  ADD COLUMN IF NOT EXISTS starred boolean NOT NULL DEFAULT false;