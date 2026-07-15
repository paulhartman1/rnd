import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = {
  propertyId: string;
};

type NovationPayload = {
  as_is_market_value?: number;
  percent_of_market_value?: number;
  realtor_fee_percent?: number;
  double_close_fee_percent?: number;
  closing_attorney_fee?: number;
  title_insurance?: number;
  efile_fee?: number;
  recording_fee?: number;
  transfer_tax?: number;
  flat_fee_listing?: number;
  photographer_fee?: number;
  other_expenses?: number;
  repair_costs?: number;
  interest_costs?: number;
  months_held?: number;
  desired_profit_access?: number;
  desired_profit_no_access?: number;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  const { propertyId } = await params;
  const body = (await request.json()) as NovationPayload;

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("properties")
    .update({
      as_is_market_value: body.as_is_market_value ?? 0,
      percent_of_market_value: body.percent_of_market_value ?? 95,
      realtor_fee_percent: body.realtor_fee_percent ?? 3,
      double_close_fee_percent: body.double_close_fee_percent ?? 0.75,
      closing_attorney_fee: body.closing_attorney_fee ?? 0,
      title_insurance: body.title_insurance ?? 0,
      efile_fee: body.efile_fee ?? 0,
      recording_fee: body.recording_fee ?? 0,
      transfer_tax: body.transfer_tax ?? 0,
      flat_fee_listing: body.flat_fee_listing ?? 0,
      photographer_fee: body.photographer_fee ?? 0,
      other_expenses: body.other_expenses ?? 0,
      repair_costs: body.repair_costs ?? 0,
      interest_costs: body.interest_costs ?? 0,
      months_held: body.months_held ?? 0,
      desired_profit_access: body.desired_profit_access ?? 30000,
      desired_profit_no_access: body.desired_profit_no_access ?? 35000,
    })
    .eq("id", propertyId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Unable to update property." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
