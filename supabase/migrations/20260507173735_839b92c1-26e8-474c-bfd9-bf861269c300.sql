-- Enum
CREATE TYPE public.feedback_kind AS ENUM ('bug', 'feature');

-- Table
CREATE TABLE public.feedback_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id UUID NOT NULL,
  profile_id UUID NOT NULL,
  kind public.feedback_kind NOT NULL,
  description TEXT NOT NULL,
  page_path TEXT,
  user_agent TEXT,
  console_logs JSONB,
  action_history JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_reports_gallery ON public.feedback_reports(gallery_id);
CREATE INDEX idx_feedback_reports_profile ON public.feedback_reports(profile_id);

ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

-- Insert: authenticated gallery member submitting their own report
CREATE POLICY feedback_reports_insert
ON public.feedback_reports
FOR INSERT
TO authenticated
WITH CHECK (
  profile_id = auth.uid()
  AND gallery_id = public.current_gallery_id()
);

-- Select: own reports, or admins see all in their gallery
CREATE POLICY feedback_reports_select
ON public.feedback_reports
FOR SELECT
TO authenticated
USING (
  gallery_id = public.current_gallery_id()
  AND (
    profile_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);
