import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateScoringConfig, ScoringConfig } from '@/lib/lead-scoring';
import { cache } from '@/lib/cache';

/**
 * PATCH /api/admin/lead-scoring/config/[id]
 * Update an existing scoring configuration
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: 'Unable to create admin client' },
        { status: 500 }
      );
    }

    // Verify config exists
    const { data: existing, error: fetchError } = await adminClient
      .from('lead_scoring_config')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    // Build update object
    const updates: Partial<ScoringConfig> = {
      ...existing,
      ...body,
    };

    // Validate the updated config
    const validation = validateScoringConfig(updates);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    // Perform update
    const { data, error: updateError } = await adminClient
      .from('lead_scoring_config')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Clear cache if this is the active config
    if (data.is_active) {
      await cache.delete('lead_scoring:active_config');
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
 * DELETE /api/admin/lead-scoring/config/[id]
 * Delete an inactive scoring configuration
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: 'Unable to create admin client' },
        { status: 500 }
      );
    }

    // Verify config exists and is not active
    const { data: config, error: fetchError } = await adminClient
      .from('lead_scoring_config')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError || !config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    if (config.is_active) {
      return NextResponse.json(
        { error: 'Cannot delete active configuration' },
        { status: 400 }
      );
    }

    // Delete the config
    const { error: deleteError } = await adminClient
      .from('lead_scoring_config')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
