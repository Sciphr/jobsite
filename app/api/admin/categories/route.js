import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { appPrisma } from "../../../lib/prisma";

export async function GET(req) {
  const session = await getServerSession(authOptions);

  // Check if user is admin (privilege level 1 or higher can see categories)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 1
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const categories = await appPrisma.categories.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: {
            jobs: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Format with job count
    const formattedCategories = categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      jobCount: category._count.jobs,
    }));

    return new Response(JSON.stringify(formattedCategories), { status: 200 });
  } catch (error) {
    console.error("Categories fetch error:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);

  // Check if user is super admin (privilege level 3 for creating categories)
  if (
    !session ||
    !session.user.privilegeLevel ||
    session.user.privilegeLevel < 3
  ) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return new Response(
        JSON.stringify({ message: "Category name is required" }),
        {
          status: 400,
        }
      );
    }

    const category = await appPrisma.categories.create({
      data: {
        name,
        description,
      },
    });

    return new Response(JSON.stringify(category), { status: 201 });
  } catch (error) {
    console.error("Category creation error:", error);

    if (error.code === "P2002") {
      return new Response(
        JSON.stringify({ message: "Category name already exists" }),
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
