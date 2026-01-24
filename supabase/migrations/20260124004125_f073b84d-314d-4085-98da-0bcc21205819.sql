-- Create table for user forest/plants
CREATE TABLE public.user_plants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plant_type TEXT NOT NULL DEFAULT 'oak',
  growth_percentage INTEGER NOT NULL DEFAULT 0 CHECK (growth_percentage >= 0 AND growth_percentage <= 100),
  is_alive BOOLEAN NOT NULL DEFAULT true,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  planted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_watered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  died_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_plants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own plants" 
ON public.user_plants 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plants" 
ON public.user_plants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plants" 
ON public.user_plants 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plants" 
ON public.user_plants 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_plants_updated_at
BEFORE UPDATE ON public.user_plants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_plants;