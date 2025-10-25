// app/api/jobs/[slug]/route.js
import { NextResponse } from "next/server";
import { appPrisma } from "@/app/lib/prisma";

// GET - Get job details by slug (public endpoint, no auth required)
export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;

    const job = await appPrisma.jobs.findUnique({
      where: {
        slug: resolvedParams.slug,
        status: "Active", // Only show active jobs
      },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        employment_types: {
          select: {
            id: true,
            name: true,
          },
        },
        experience_levels: {
          select: {
            id: true,
            name: true,
          },
        },
        remote_policies: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error("Error fetching job:", error);
    return NextResponse.json(
      { error: "Failed to fetch job details" },
      { status: 500 }
    );
  }
}
