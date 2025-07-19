import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";

export async function GET(req) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 1 or higher - HR can see jobs for filtering)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 1
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const jobs = await appPrisma.job.findMany({
      select: {
        id: true,
        title: true,
        department: true,
        status: true,
        createdAt: true,
        slug: true,
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the result to include dynamic applicationCount
    const jobsWithCount = jobs.map(job => ({
      ...job,
      applicationCount: job._count.applications,
      _count: undefined, // Remove the _count object from response
    }));

    return new Response(JSON.stringify(jobsWithCount), { status: 200 });
  } catch (error) {
    console.error("Jobs fetch error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
