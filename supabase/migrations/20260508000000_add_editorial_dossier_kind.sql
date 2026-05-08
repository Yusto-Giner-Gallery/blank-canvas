-- Adds the 'editorial' value to the dossier_kind enum so the new PARALLELS
-- layout can be saved. Frontend types were updated in advance per the
-- Lovable porting handoff (CLAUDE.md §13).

ALTER TYPE public.dossier_kind ADD VALUE IF NOT EXISTS 'editorial';
