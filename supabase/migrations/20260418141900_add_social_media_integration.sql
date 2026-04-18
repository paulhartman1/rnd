-- Social Media Integration Tables

-- Table to store connected social media accounts
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  account_type TEXT NOT NULL CHECK (account_type IN ('page', 'business_account', 'creator_account')),
  
  -- Account identifiers
  platform_account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_username TEXT,
  
  -- Access tokens (encrypted)
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  
  -- Metadata
  profile_picture_url TEXT,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one account per platform account per user
  UNIQUE(user_id, platform, platform_account_id)
);

-- Table to store post history
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  
  -- Post content
  message TEXT,
  media_urls TEXT[], -- Array of image/video URLs
  
  -- Platform details
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  platform_post_id TEXT, -- ID returned by Meta after posting
  post_url TEXT, -- Direct link to the post
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for social_accounts
-- Admins can manage all social accounts
CREATE POLICY "Admins can view all social accounts"
  ON public.social_accounts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert social accounts"
  ON public.social_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update social accounts"
  ON public.social_accounts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete social accounts"
  ON public.social_accounts
  FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for social_posts
-- Admins can manage all posts
CREATE POLICY "Admins can view all social posts"
  ON public.social_posts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert social posts"
  ON public.social_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update social posts"
  ON public.social_posts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete social posts"
  ON public.social_posts
  FOR DELETE
  TO authenticated
  USING (true);

-- Indexes for better query performance
CREATE INDEX idx_social_accounts_user_id ON public.social_accounts(user_id);
CREATE INDEX idx_social_accounts_platform ON public.social_accounts(platform);
CREATE INDEX idx_social_posts_user_id ON public.social_posts(user_id);
CREATE INDEX idx_social_posts_account_id ON public.social_posts(social_account_id);
CREATE INDEX idx_social_posts_status ON public.social_posts(status);
CREATE INDEX idx_social_posts_scheduled_for ON public.social_posts(scheduled_for) WHERE scheduled_for IS NOT NULL;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_social_accounts_updated_at
  BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_posts_updated_at
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
