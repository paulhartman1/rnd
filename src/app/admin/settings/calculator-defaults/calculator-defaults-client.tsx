"use client";

import { useRouter } from "next/navigation";
import NovationCalculator, {
  type NovationFormData,
} from "@/components/admin/NovationCalculator";
import { createClient } from "@/lib/supabase/client";

interface CalculatorDefaultsClientProps {
  initialValues?: Partial<NovationFormData>;
}

export default function CalculatorDefaultsClient({
  initialValues,
}: CalculatorDefaultsClientProps) {
  const router = useRouter();

  const handleSave = async (values: NovationFormData) => {
    const supabase = createClient();

    // Update the single row (id = 1) with new values
    const { error } = await supabase
      .from("calculator_defaults")
      .update({
        as_is_market_value: values.as_is_market_value,
        percent_of_market_value: values.percent_of_market_value,
        realtor_fee_percent: values.realtor_fee_percent,
        double_close_fee_percent: values.double_close_fee_percent,
        closing_attorney_fee: values.closing_attorney_fee,
        title_insurance: values.title_insurance,
        efile_fee: values.efile_fee,
        recording_fee: values.recording_fee,
        transfer_tax: values.transfer_tax,
        flat_fee_listing: values.flat_fee_listing,
        photographer_fee: values.photographer_fee,
        other_expenses: values.other_expenses,
        repair_costs: values.repair_costs,
        interest_costs: values.interest_costs,
        months_held: values.months_held,
        desired_profit_access: values.desired_profit_access,
        desired_profit_no_access: values.desired_profit_no_access,
      })
      .eq("id", 1);

    if (error) {
      throw new Error(error.message);
    }

    // Refresh the page data
    router.refresh();
  };

  return <NovationCalculator initialValues={initialValues} onSave={handleSave} />;
}
