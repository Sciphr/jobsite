import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { PrismaClient } from "@/app/generated/prisma";
import { logAuditEvent } from "../../../../../../lib/auditMiddleware";

const prisma = new PrismaClient();

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !session.user.privilegeLevel ||
      session.user.privilegeLevel < 1
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch application notes
    const notes = await prisma.applicationNote.findMany({
      where: { applicationId: id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform data for frontend
    const transformedNotes = notes.map((note) => ({
      id: note.id,
      type: note.type,
      content: note.content,
      timestamp: note.createdAt,
      author: note.author
        ? `${note.author.firstName || ""} ${note.author.lastName || ""}`.trim() ||
          note.author.email
        : note.authorName || "System",
      authorId: note.authorId,
      metadata: note.metadata,
      isSystemGenerated: note.isSystemGenerated,
    }));

    return NextResponse.json({
      success: true,
      data: transformedNotes,
    });
  } catch (error) {
    console.error("Error fetching application notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch application notes", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !session.user.privilegeLevel ||
      session.user.privilegeLevel < 1
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { content, type = "note", metadata = null } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 }
      );
    }

    // Verify application exists
    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        job: { select: { title: true } },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Create the note
    const note = await prisma.applicationNote.create({
      data: {
        applicationId: id,
        content: content.trim(),
        type,
        authorId: session.user.id,
        authorName:
          `${session.user.firstName || ""} ${session.user.lastName || ""}`.trim() ||
          session.user.email,
        metadata,
        isSystemGenerated: false,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Log audit event for note creation
    await logAuditEvent(
      {
        eventType: "CREATE",
        category: "APPLICATION",
        subcategory: "NOTE_UPDATE",
        entityType: "application",
        entityId: id,
        entityName: `Application by ${application.name || application.email}`,
        action: "Note added to application",
        description: `Added note to application: "${content.substring(0, 100)}${content.length > 100 ? "..." : ""}"`,
        newValues: {
          noteContent: content,
          noteType: type,
        },
        relatedApplicationId: id,
        severity: "info",
        status: "success",
        tags: ["application", "note", "timeline", "update"],
        metadata: {
          noteId: note.id,
          applicationName: application.name,
          jobTitle: application.job?.title,
          noteLength: content.length,
          noteType: type,
        },
      },
      request
    );

    // Transform data for frontend
    const transformedNote = {
      id: note.id,
      type: note.type,
      content: note.content,
      timestamp: note.createdAt,
      author: note.author
        ? `${note.author.firstName || ""} ${note.author.lastName || ""}`.trim() ||
          note.author.email
        : note.authorName || "System",
      authorId: note.authorId,
      metadata: note.metadata,
      isSystemGenerated: note.isSystemGenerated,
    };

    return NextResponse.json({
      success: true,
      data: transformedNote,
    });
  } catch (error) {
    console.error("Error creating application note:", error);
    return NextResponse.json(
      { error: "Failed to create application note", details: error.message },
      { status: 500 }
    );
  }
}
