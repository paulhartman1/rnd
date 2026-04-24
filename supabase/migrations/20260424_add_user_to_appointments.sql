-- Add user_id column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster queries by user
CREATE INDEX IF NOT EXISTS appointments_user_id_idx ON public.appointments (user_id);

-- Add comment for documentation
COMMENT ON COLUMN public.appointments.user_id IS 'The user who created/owns this appointment';
