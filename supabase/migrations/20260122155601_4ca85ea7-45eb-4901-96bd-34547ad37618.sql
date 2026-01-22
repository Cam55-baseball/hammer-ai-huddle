-- Create calendar_day_orders table for per-date ordering and locking
CREATE TABLE public.calendar_day_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_date DATE NOT NULL,
  locked BOOLEAN NOT NULL DEFAULT false,
  order_keys TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT calendar_day_orders_user_date_unique UNIQUE (user_id, event_date)
);

-- Enable Row Level Security
ALTER TABLE public.calendar_day_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own day orders" 
ON public.calendar_day_orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own day orders" 
ON public.calendar_day_orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own day orders" 
ON public.calendar_day_orders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own day orders" 
ON public.calendar_day_orders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_calendar_day_orders_updated_at
BEFORE UPDATE ON public.calendar_day_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_day_orders;

-- Add index for faster queries by user and date range
CREATE INDEX idx_calendar_day_orders_user_date ON public.calendar_day_orders (user_id, event_date);