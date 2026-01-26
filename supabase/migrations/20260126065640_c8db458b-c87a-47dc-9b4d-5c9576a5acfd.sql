-- Create study_rooms table for video call sessions
CREATE TABLE public.study_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL,
  name TEXT NOT NULL,
  subject_id UUID REFERENCES public.subjects(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_participants INTEGER NOT NULL DEFAULT 6,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create room_participants table
CREATE TABLE public.room_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  subject_id UUID REFERENCES public.subjects(id),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  is_camera_off BOOLEAN NOT NULL DEFAULT false,
  is_sharing_screen BOOLEAN NOT NULL DEFAULT false,
  study_duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is friend or host of room
CREATE OR REPLACE FUNCTION public.can_access_study_room(room_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_host_id UUID;
BEGIN
  -- Get the host of the room
  SELECT host_id INTO room_host_id FROM study_rooms WHERE id = room_id;
  
  -- User is the host
  IF room_host_id = user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a friend of the host (accepted friendship)
  RETURN EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
    AND (
      (requester_id = room_host_id AND addressee_id = user_id)
      OR (addressee_id = room_host_id AND requester_id = user_id)
    )
  );
END;
$$;

-- RLS Policies for study_rooms
CREATE POLICY "Users can view rooms they can access"
ON public.study_rooms
FOR SELECT
USING (
  host_id = auth.uid() 
  OR can_access_study_room(id, auth.uid())
);

CREATE POLICY "Users can create their own rooms"
ON public.study_rooms
FOR INSERT
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their own rooms"
ON public.study_rooms
FOR UPDATE
USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their own rooms"
ON public.study_rooms
FOR DELETE
USING (auth.uid() = host_id);

-- RLS Policies for room_participants
CREATE POLICY "Users can view participants in rooms they can access"
ON public.room_participants
FOR SELECT
USING (
  user_id = auth.uid()
  OR can_access_study_room(room_id, auth.uid())
);

CREATE POLICY "Users can join rooms they can access"
ON public.room_participants
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND can_access_study_room(room_id, auth.uid())
);

CREATE POLICY "Users can update their own participant record"
ON public.room_participants
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms (delete their participant record)"
ON public.room_participants
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updating updated_at
CREATE TRIGGER update_study_rooms_updated_at
BEFORE UPDATE ON public.study_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_room_participants_updated_at
BEFORE UPDATE ON public.room_participants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;