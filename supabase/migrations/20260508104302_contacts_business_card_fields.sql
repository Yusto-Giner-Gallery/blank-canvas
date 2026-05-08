-- Extend contacts with the fields a typical business card carries.
-- Lets the CRM scan-card feature persist phone/company/role/website
-- structurally instead of jamming them into the notes free-form field.
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS website text;
