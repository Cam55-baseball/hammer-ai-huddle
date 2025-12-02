-- Create monthly_reports table to store generated reports
CREATE TABLE public.monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  report_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'generated',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  viewed_at TIMESTAMP WITH TIME ZONE,
  downloaded_at TIMESTAMP WITH TIME ZONE,
  saved_to_library BOOLEAN DEFAULT true,
  CONSTRAINT valid_status CHECK (status IN ('generated', 'viewed', 'downloaded'))
);

-- Create user_report_cycles table to track report generation timing
CREATE TABLE public.user_report_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  cycle_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  next_report_date TIMESTAMP WITH TIME ZONE NOT NULL,
  reports_generated INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_report_cycles ENABLE ROW LEVEL SECURITY;

-- RLS policies for monthly_reports
CREATE POLICY "Users can view their own reports"
ON public.monthly_reports
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports"
ON public.monthly_reports
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports"
ON public.monthly_reports
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert reports"
ON public.monthly_reports
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Owners can view all reports"
ON public.monthly_reports
FOR SELECT
USING (has_role(auth.uid(), 'owner'::app_role));

-- RLS policies for user_report_cycles
CREATE POLICY "Users can view their own cycle"
ON public.user_report_cycles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own cycle"
ON public.user_report_cycles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert cycles"
ON public.user_report_cycles
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update cycles"
ON public.user_report_cycles
FOR UPDATE
WITH CHECK (true);

CREATE POLICY "Owners can view all cycles"
ON public.user_report_cycles
FOR SELECT
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create indexes for performance
CREATE INDEX idx_monthly_reports_user_id ON public.monthly_reports(user_id);
CREATE INDEX idx_monthly_reports_period ON public.monthly_reports(report_period_start, report_period_end);
CREATE INDEX idx_user_report_cycles_user_id ON public.user_report_cycles(user_id);
CREATE INDEX idx_user_report_cycles_next_report ON public.user_report_cycles(next_report_date);

-- Trigger for updated_at on user_report_cycles
CREATE TRIGGER update_user_report_cycles_updated_at
BEFORE UPDATE ON public.user_report_cycles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();