-- Create sent_activity_templates table for coach-to-player activity sharing
CREATE TABLE public.sent_activity_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Sender (coach/scout)
  sender_id UUID NOT NULL,
  
  -- Original template reference
  template_id UUID NOT NULL REFERENCES public.custom_activity_templates(id) ON DELETE CASCADE,
  
  -- Snapshot of template data at time of sending
  template_snapshot JSONB NOT NULL,
  
  -- Recipient (player)
  recipient_id UUID NOT NULL,
  
  -- Locked fields - array of field names player CANNOT edit
  locked_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Status workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  
  -- If accepted, reference to player's copy
  accepted_template_id UUID REFERENCES public.custom_activity_templates(id),
  
  -- Optional message from coach
  message TEXT,
  
  -- Timestamps
  sent_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  
  -- Prevent duplicate sends of same template to same player
  UNIQUE(sender_id, template_id, recipient_id)
);

-- Enable RLS
ALTER TABLE public.sent_activity_templates ENABLE ROW LEVEL SECURITY;

-- Coaches/scouts can send to players they follow
CREATE POLICY "Scouts can send to followed players"
  ON public.sent_activity_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM public.scout_follows 
      WHERE scout_id = auth.uid() 
      AND player_id = recipient_id 
      AND status = 'accepted'
    )
  );

-- Both sender and recipient can view
CREATE POLICY "Users can view their sent or received activities"
  ON public.sent_activity_templates FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid() OR sender_id = auth.uid());

-- Only recipient can update status
CREATE POLICY "Recipients can respond to activities"
  ON public.sent_activity_templates FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Sender can delete pending activities they sent
CREATE POLICY "Senders can delete pending sent activities"
  ON public.sent_activity_templates FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid() AND status = 'pending');

-- Enable realtime for instant notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.sent_activity_templates;