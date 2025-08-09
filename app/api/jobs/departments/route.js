// app/api/jobs/departments/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    // Get distinct departments from active jobs
    const departments = await prisma.jobs.findMany({
      where: {
        status: "Active"
      },
      select: {
        department: true
      },
      distinct: ['department']
    });

    // Extract department names and filter out null/empty values
    const departmentNames = departments
      .map(job => job.department)
      .filter(dept => dept && dept.trim().length > 0)
      .sort();

    return NextResponse.json(departmentNames);

  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}