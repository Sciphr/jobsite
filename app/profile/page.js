import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import ProfileClient from "../components/ProfileClient";

export const metadata = {
  title: "Profile - JobSite",
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    // Redirect to home page if not authenticated
    redirect("/");
  }

  return <ProfileClient session={session} />;
}
