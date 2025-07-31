import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return Response.json({ message: "Job ID is required" }, { status: 400 });
  }

  try {
    const application = await appPrisma.applications.findUnique({
      where: {
        userId_jobId: {
          userId: session.user.id,
          jobId: jobId,
        },
      },
    });

    return Response.json({
      hasApplied: !!application,
      applicationId: application?.id || null,
      status: application?.status || null,
    });
  } catch (error) {
    console.error("Error checking application status:", error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
