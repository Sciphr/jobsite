// app/api/profile/change-password/route.js
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    // Validation
    if (!currentPassword) {
      return new Response(
        JSON.stringify({
          message: "Current password is required",
          field: "currentPassword",
        }),
        { status: 400 }
      );
    }

    if (!newPassword) {
      return new Response(
        JSON.stringify({
          message: "New password is required",
          field: "newPassword",
        }),
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({
          message: "Password must be at least 6 characters",
          field: "newPassword",
        }),
        { status: 400 }
      );
    }

    // Get user from database
    const user = await appPrisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return new Response(
        JSON.stringify({
          message: "Current password is incorrect",
          field: "currentPassword",
        }),
        { status: 400 }
      );
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      return new Response(
        JSON.stringify({
          message: "New password must be different from current password",
          field: "newPassword",
        }),
        { status: 400 }
      );
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password in database
    await appPrisma.users.update({
      where: { id: session.user.id },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date(),
      },
    });

    return new Response(
      JSON.stringify({ message: "Password changed successfully" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Password change error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
