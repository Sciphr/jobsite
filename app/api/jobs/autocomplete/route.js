import { NextResponse } from "next/server";
import { appPrisma } from "../../../lib/prisma";

// GET /api/jobs/autocomplete?q=search
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    // Search for matching job titles and departments
    const jobs = await appPrisma.jobs.findMany({
      where: {
        status: "Active",
        OR: [
          {
            title: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            department: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        title: true,
        department: true,
        categories: {
          select: {
            name: true,
          },
        },
      },
      take: 10,
      distinct: ["title"],
    });

    // Create suggestions with type indicators
    const suggestions = jobs.map((job) => ({
      text: job.title,
      type: "job_title",
      department: job.department,
      category: job.categories?.name,
    }));

    // Also get matching departments
    const departments = await appPrisma.jobs.findMany({
      where: {
        status: "Active",
        department: {
          contains: query,
          mode: "insensitive",
        },
      },
      select: {
        department: true,
      },
      distinct: ["department"],
      take: 5,
    });

    const departmentSuggestions = departments.map((dept) => ({
      text: dept.department,
      type: "department",
    }));

    // Combine and deduplicate
    const allSuggestions = [...suggestions, ...departmentSuggestions]
      .filter((suggestion, index, self) =>
        index === self.findIndex((s) => s.text === suggestion.text)
      )
      .slice(0, 8); // Limit to 8 total suggestions

    return NextResponse.json({ suggestions: allSuggestions });
  } catch (error) {
    console.error("Autocomplete error:", error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
