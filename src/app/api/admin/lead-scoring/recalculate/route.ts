import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recalculatePropertyScores } from '@/lib/lead-scoring';

/**
 * POST /api/admin/lead-scoring/recalculate
 * Recalculate scores for existing properties using active configuration
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { minScore, maxScore, dateFrom, dateTo } = body;

    const result = await recalculatePropertyScores({
      minScore,
      maxScore,
      dateFrom,
      dateTo,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updatedCount: result.updatedCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
