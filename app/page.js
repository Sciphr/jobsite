import { db } from "./lib/db";
import HeroSection from "./components/HeroSection";
import FeaturedJobsSection from "./components/FeaturedJobsSection";

// Disable static generation for this page since it needs database access
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Fetch featured jobs from database
  const featuredJobs = await db.jobs.findMany({
    where: {
      status: "Active",
      featured: true,
    },
    include: {
      categories: true,
    },
    orderBy: {
      priority: "asc",
    },
    take: 6,
  });

  // Get total job count
  const totalJobs = await db.jobs.count({
    where: {
      status: "Active",
    },
  });

  // Fetch all categories for quick filters
  const categories = await db.categories.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Hero Section with Search */}
      <HeroSection totalJobs={totalJobs} categories={categories} />

      {/* Featured Jobs Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 -mt-8">
        <FeaturedJobsSection featuredJobs={featuredJobs} totalJobs={totalJobs} />
      </section>
    </div>
  );
}
