-- Ensure 'editorial' value exists on dossier_kind enum
ALTER TYPE public.dossier_kind ADD VALUE IF NOT EXISTS 'editorial';