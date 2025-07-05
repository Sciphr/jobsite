import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import ProfileClient from "../../components/ProfileClient";

export const metadata = {
  title: "Profile - JobSite",
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    // Optionally redirect using server-side method
    return <div>You need to sign in to view this page.</div>;
  }

  return <ProfileClient session={session} />;
}
