// app/api/admin/applications/[id]/screening-answers/route.js
import { NextResponse } from "next/server";
import { protectRoute } from "@/app/lib/middleware/apiProtection";
import { appPrisma } from "@/app/lib/prisma";

// GET - Get screening answers for an application
export async function GET(request, { params }) {
  try {
    const authResult = await protectRoute("applications", "read");
    if (authResult.error) return authResult.error;

    const resolvedParams = await params;
    const answers = await appPrisma.application_screening_answers.findMany({
      where: { application_id: resolvedParams.id },
      orderBy: { created_at: "asc" },
    });

    return NextResponse.json({ answers });
  } catch (error) {
    console.error("Error fetching screening answers:", error);
    return NextResponse.json(
      { error: "Failed to fetch screening answers" },
      { status: 500 }
    );
  }
}
