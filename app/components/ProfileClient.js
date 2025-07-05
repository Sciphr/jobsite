"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// import any needed components like Header, etc.

export default function ProfileClient({ session }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [profile, setProfile] = useState(null);
  const [savedJobs, setSavedJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    fetchProfileData();
  }, [session]);

  const fetchProfileData = async () => {
    try {
      const [profileRes, savedJobsRes, applicationsRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/saved-jobs"),
        fetch("/api/applications"),
      ]);

      const [profileData, savedJobsData, applicationsData] = await Promise.all([
        profileRes.json(),
        savedJobsRes.json(),
        applicationsRes.json(),
      ]);

      setProfile(profileData);
      setSavedJobs(savedJobsData);
      setApplications(applicationsData);
    } catch (err) {
      console.error("Error fetching profile data", err);
    } finally {
      setLoading(false);
    }
  };

  // Keep your existing render logic here
  // return JSX with tabs etc.
}
