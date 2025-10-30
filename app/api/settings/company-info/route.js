import { NextResponse } from "next/server";
import { getSystemSetting } from "../../../lib/settings";

// GET /api/settings/company-info - Get public company information
export async function GET() {
  try {
    const [about, culture, values, benefits] = await Promise.all([
      getSystemSetting("company_about", ""),
      getSystemSetting("company_culture", ""),
      getSystemSetting("company_values", ""),
      getSystemSetting("company_benefits", ""),
    ]);

    return NextResponse.json({
      about,
      culture,
      values,
      benefits,
    });
  } catch (error) {
    console.error("Error fetching company info:", error);
    return NextResponse.json(
      { error: "Failed to fetch company information" },
      { status: 500 }
    );
  }
}
