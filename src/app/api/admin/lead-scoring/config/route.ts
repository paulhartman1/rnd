import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createScoringConfig, validateScoringConfig, ScoringCriteria } from '@/lib/lead-scoring';

/**
 * GET /api/admin/lead-scoring/config
 * Fetch all scoring configurations (or just active one with ?active=true)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const adminClient = createAdminClient();
    const queryClient = adminClient ?? supabase;

    let query = queryClient.from('lead_scoring_config').select('*');

    if (activeOnly) {
      query = query.eq('is_active', true);
      const { data, error } = await query.single();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    }
    
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/lead-scoring/config
 * Create a new scoring configuration
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { config_name, description, base_score, criteria, set_as_active } = body;

    if (!config_name || !criteria) {
      return NextResponse.json(
        { error: 'config_name and criteria are required' },
        { status: 400 }
      );
    }

    const result = await createScoringConfig(
      config_name,
      criteria as ScoringCriteria,
      {
        description,
        baseScore: base_score,
        setAsActive: set_as_active,
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.config, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
