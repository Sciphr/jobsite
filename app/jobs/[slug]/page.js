// app/jobs/[slug]/page.js (Server Component)
import { notFound } from "next/navigation";
import { appPrisma } from "../../lib/prisma";
import { getSystemSetting } from "../../lib/settings";
import JobDetailsClient from "./JobDetailsClient";

async function getJob(slug) {
  try {
    const job = await appPrisma.jobs.findUnique({
      where: {
        slug,
        status: "Active", // Only show active jobs
      },
      include: {
        categories: true,
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!job) {
      return null;
    }

    // Increment view count
    await appPrisma.jobs.update({
      where: { id: job.id },
      data: { viewCount: { increment: 1 } },
    });

    // Add alias for backward compatibility
    return {
      ...job,
      creator: job.users // Alias users as creator for backward compatibility
    };
  } catch (error) {
    console.error("Error fetching job:", error);
    return null;
  }
}

export default async function JobDetailsPage({ params }) {
  const resolvedParams = await params;
  const job = await getJob(resolvedParams.slug);

  if (!job) {
    notFound();
  }

  // Get system settings for guest applications
  const allowGuestApplications = await getSystemSetting(
    "allow_guest_applications",
    true
  );
  const siteConfig = await getSystemSetting("site_name", "Job Board");

  return (
    <JobDetailsClient
      job={job}
      allowGuestApplications={allowGuestApplications}
      siteConfig={siteConfig}
    />
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  const resolvedParams = await params; // Await params before using
  const job = await getJob(resolvedParams.slug);

  if (!job) {
    return {
      title: "Job Not Found",
    };
  }

  return {
    title: `${job.title} - ${job.department}`,
    description:
      job.summary ||
      job.description?.substring(0, 160) ||
      `Apply for ${job.title} position`,
    openGraph: {
      title: `${job.title} - ${job.department}`,
      description: job.summary || job.description?.substring(0, 160),
      type: "website",
    },
  };
}
