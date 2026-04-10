# Database Migrations

## update_policies_for_service_role.sql

**Purpose**: Updates Row Level Security (RLS) policies to use the service role for admin operations.

**What it does**:
- Updates leads table policies to allow only `service_role` for read/update/delete operations
- Keeps `anon` role for lead insertions (public form submissions)
- Updates appointments table policies to allow only `service_role` for all operations
- Removes deprecated `authenticated` role policies

**Why**: 
All admin API routes now use the Supabase service role key instead of authenticated sessions. This migration aligns the RLS policies with the actual authentication method being used.

**When to run**:
Run this migration if you already have the leads table deployed and want to update to service role authentication.

**How to run**:

Via psql:
```bash
psql -h <your-supabase-host> -U postgres -d postgres -f supabase/migrations/update_policies_for_service_role.sql
```

Via Supabase Dashboard:
1. Go to SQL Editor in your Supabase dashboard
2. Copy the contents of `update_policies_for_service_role.sql`
3. Paste and run the query

**Requirements**:
- `SUPABASE_SERVICE_ROLE_KEY` must be set in your environment variables
- The service role key should be kept secret and never exposed to the client

**Note**: 
The service role bypasses all RLS policies, so these policies are mainly for documentation and as a safety measure in case non-admin code ever uses the regular client.
