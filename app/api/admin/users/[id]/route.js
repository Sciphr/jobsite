import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../lib/prisma";
import { deleteFromSupabase } from "../../../../lib/supabase-storage";
import bcrypt from "bcryptjs";

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);

  // Check if user is super admin (privilege level 3)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 3
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  const { id } = await params;

  try {
    const user = await appPrisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        privilegeLevel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdJobs: true,
            applications: true,
            savedJobs: true,
          },
        },
        createdJobs: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
          },
          take: 5,
          orderBy: { createdAt: "desc" },
        },
        applications: {
          select: {
            id: true,
            status: true,
            appliedAt: true,
            job: {
              select: {
                title: true,
              },
            },
          },
          take: 5,
          orderBy: { appliedAt: "desc" },
        },
      },
    });

    if (!user) {
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify(user), { status: 200 });
  } catch (error) {
    console.error("User fetch error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);

  // Check if user is super admin (privilege level 3)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 3
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  const { id } = await params;

  try {
    const body = await req.json();

    // Extract fields that can be updated
    const updateData = {};

    // Basic profile fields
    const allowedFields = ["firstName", "lastName", "phone", "email"];
    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Role and privilege updates
    if (body.role !== undefined) {
      const validRoles = ["user", "hr", "admin", "super_admin"];
      if (!validRoles.includes(body.role)) {
        return new Response(JSON.stringify({ message: "Invalid role" }), {
          status: 400,
        });
      }
      updateData.role = body.role;
    }

    if (body.privilegeLevel !== undefined) {
      if (body.privilegeLevel < 0 || body.privilegeLevel > 3) {
        return new Response(
          JSON.stringify({
            message: "Privilege level must be between 0 and 3",
          }),
          {
            status: 400,
          }
        );
      }
      updateData.privilegeLevel = body.privilegeLevel;
    }

    // Status update
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    // Password update
    if (body.password !== undefined && body.password !== "") {
      if (body.password.length < 6) {
        return new Response(
          JSON.stringify({ message: "Password must be at least 6 characters" }),
          {
            status: 400,
          }
        );
      }
      updateData.password = await bcrypt.hash(body.password, 12);
    }

    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();

    // Prevent users from demoting themselves
    if (
      id === session.user.id &&
      body.privilegeLevel !== undefined &&
      body.privilegeLevel < session.user.privilegeLevel
    ) {
      return new Response(
        JSON.stringify({ message: "Cannot reduce your own privilege level" }),
        {
          status: 403,
        }
      );
    }

    // Prevent users from deactivating themselves
    if (id === session.user.id && body.isActive === false) {
      return new Response(
        JSON.stringify({ message: "Cannot deactivate your own account" }),
        {
          status: 403,
        }
      );
    }

    const updatedUser = await appPrisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        privilegeLevel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdJobs: true,
            applications: true,
            savedJobs: true,
          },
        },
      },
    });

    return new Response(JSON.stringify(updatedUser), { status: 200 });
  } catch (error) {
    console.error("User update error:", error);

    if (error.code === "P2025") {
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    if (error.code === "P2002") {
      return new Response(JSON.stringify({ message: "Email already exists" }), {
        status: 409,
      });
    }

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);

  // Check if user is super admin (privilege level 3)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 3
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  const { id } = await params;

  // Prevent users from deleting themselves
  if (id === session.user.id) {
    return new Response(
      JSON.stringify({ message: "Cannot delete your own account" }),
      {
        status: 403,
      }
    );
  }

  try {
    // Get user data and all related records
    const userToDelete = await appPrisma.user.findUnique({
      where: { id },
      include: {
        resumes: true, // Get all resume records with storage paths
        applications: true,
        savedJobs: true,
        createdJobs: true,
        settings: true,
        _count: {
          select: {
            createdJobs: true,
            applications: true,
            savedJobs: true,
            resumes: true,
            settings: true,
          },
        },
      },
    });

    if (!userToDelete) {
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    console.log(`Preparing to delete user ${id} with:`, {
      jobs: userToDelete._count.createdJobs,
      applications: userToDelete._count.applications,
      savedJobs: userToDelete._count.savedJobs,
      resumes: userToDelete._count.resumes,
      settings: userToDelete._count.settings,
    });

    // Step 1: Delete resume files from Supabase storage
    const resumeDeletionPromises = userToDelete.resumes.map(async (resume) => {
      try {
        console.log(`Deleting resume file: ${resume.storagePath}`);
        const { error } = await deleteFromSupabase(resume.storagePath);
        if (error) {
          console.error(
            `Failed to delete resume file ${resume.storagePath}:`,
            error
          );
          // Don't throw here - we want to continue with user deletion even if storage cleanup fails
        } else {
          console.log(
            `Successfully deleted resume file: ${resume.storagePath}`
          );
        }
      } catch (error) {
        console.error(
          `Error deleting resume file ${resume.storagePath}:`,
          error
        );
      }
    });

    // Wait for all resume file deletions to complete (or fail)
    await Promise.allSettled(resumeDeletionPromises);

    // Step 2: Handle jobs created by this user
    if (userToDelete.createdJobs.length > 0) {
      console.log(`User has ${userToDelete.createdJobs.length} created jobs`);

      // Option A: Set createdBy to null (recommended)
      await appPrisma.job.updateMany({
        where: { createdBy: id },
        data: { createdBy: null },
      });

      // Option B: Delete jobs and their applications (uncomment if preferred)
      // for (const job of userToDelete.createdJobs) {
      //   await appPrisma.application.deleteMany({
      //     where: { jobId: job.id }
      //   });
      //   await appPrisma.savedJob.deleteMany({
      //     where: { jobId: job.id }
      //   });
      // }
      // await appPrisma.job.deleteMany({
      //   where: { createdBy: id }
      // });
    }

    // Step 3: Delete user's applications
    if (userToDelete._count.applications > 0) {
      console.log(`Deleting ${userToDelete._count.applications} applications`);
      await appPrisma.application.deleteMany({
        where: { userId: id },
      });
    }

    // Step 4: Delete user's saved jobs
    if (userToDelete._count.savedJobs > 0) {
      console.log(`Deleting ${userToDelete._count.savedJobs} saved jobs`);
      await appPrisma.savedJob.deleteMany({
        where: { userId: id },
      });
    }

    // Step 5: Delete the user (this will CASCADE delete resumes and settings automatically)
    await appPrisma.user.delete({
      where: { id },
    });

    console.log(`Successfully deleted user ${id}`);

    return new Response(
      JSON.stringify({
        message: "User deleted successfully",
        deletedData: {
          applications: userToDelete._count.applications,
          savedJobs: userToDelete._count.savedJobs,
          resumes: userToDelete._count.resumes,
          resumeFiles: userToDelete.resumes.length,
          settings: userToDelete._count.settings,
          jobsHandled: userToDelete._count.createdJobs,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("User deletion error:", error);

    if (error.code === "P2025") {
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    if (error.code === "P2003") {
      return new Response(
        JSON.stringify({
          message:
            "Cannot delete user due to foreign key constraints. Please contact support.",
        }),
        {
          status: 409,
        }
      );
    }

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
