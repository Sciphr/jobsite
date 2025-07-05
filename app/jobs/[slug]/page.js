import { db } from "../../lib/db";
import { notFound } from "next/navigation";
import JobDetailsClient from "./JobDetailsClient";

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  const { slug } = await params;

  const job = await db.job.findUnique({
    where: { slug: slug },
    select: {
      title: true,
      summary: true,
      department: true,
      location: true,
    },
  });

  if (!job) {
    return {
      title: "Job Not Found",
    };
  }

  return {
    title: `${job.title} - ${job.department} | JobSite`,
    description: job.summary,
    openGraph: {
      title: `${job.title} - ${job.department}`,
      description: job.summary,
      type: "website",
    },
  };
}

export default async function JobDetailsPage({ params }) {
  const { slug } = await params;

  // Fetch job by slug
  const job = await db.job.findUnique({
    where: { slug: slug },
    include: {
      category: true,
    },
  });

  if (!job || job.status !== "Active") {
    notFound();
  }

  // Pass the job data to the client component
  return <JobDetailsClient job={job} />;
}
