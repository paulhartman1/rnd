import { NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/features';

export async function GET() {
  return NextResponse.json({
    enabled: isFeatureEnabled('attom'),
  });
}
