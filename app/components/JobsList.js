"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import JobCard from "./JobCard";

export default function JobsList({ jobs, onJobHover }) {
  const { data: session } = useSession();
  const [applicationStatuses, setApplicationStatuses] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("🔍 JobsList useEffect triggered:", {
      hasSession: !!session?.user?.id,
      jobsLength: jobs.length,
      sessionUserId: session?.user?.id,
    });

    if (session?.user?.id && jobs.length > 0) {
      checkApplicationStatuses();
    }
  }, [session, jobs]);

  const checkApplicationStatuses = async () => {
    if (!session?.user?.id || jobs.length === 0) return;

    console.log("📡 Checking application statuses for user:", session.user.id);

    setLoading(true);
    try {
      const jobIds = jobs.map((job) => job.id);
      console.log("📋 Job IDs to check:", jobIds);

      const response = await fetch("/api/applications/check-multiple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobIds }),
      });

      console.log("📡 API Response status:", response.status);
      console.log("📡 API Response ok:", response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Application statuses received:", data);
        setApplicationStatuses(data);
      } else {
        const errorText = await response.text();
        console.error("❌ API Error:", response.status, errorText);
      }
    } catch (error) {
      console.error("❌ Error checking application statuses:", error);
    } finally {
      setLoading(false);
    }
  };

  console.log("🎨 Rendering JobsList with statuses:", applicationStatuses);

  return (
    <div className="space-y-6">
      {jobs.map((job, index) => {
        const appStatus = applicationStatuses[job.id];
        console.log(`🎯 Job ${job.title} (${job.id}) status:`, appStatus);

        return (
          <div
            key={job.id}
            className="opacity-0 animate-fadeInUp"
            style={{
              animationDelay: `${index * 100}ms`,
              animationFillMode: 'forwards'
            }}
            onMouseEnter={onJobHover ? () => onJobHover(job) : undefined}
          >
            <JobCard job={job} applicationStatus={appStatus} />
          </div>
        );
      })}
    </div>
  );
}
