import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { appPrisma } from "../../../../../lib/prisma";
import { logAuditEvent } from "../../../../../../lib/auditMiddleware";
import { protectRoute } from "../../../../../lib/middleware/apiProtection";

export async function GET(request, { params }) {
  try {
    const authResult = await protectRoute("applications", "notes");
    if (authResult.error) return authResult.error;
    const { session } = authResult;

    const { id } = await params;

    // Fetch application notes
    const notes = await appPrisma.application_notes.findMany({
      where: { application_id: id },
      orderBy: { created_at: "desc" },
    });

    // Transform data for frontend
    const transformedNotes = notes.map((note) => ({
      id: note.id,
      type: note.type,
      content: note.content,
      timestamp: note.created_at,
      author: note.author_name || "System",
      authorId: note.author_id,
      metadata: note.metadata,
      isSystemGenerated: note.is_system_generated,
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
    const authResult = await protectRoute("applications", "notes");
    if (authResult.error) return authResult.error;
    const { session } = authResult;

    const { id } = await params;
    const { content, type = "note", metadata = null } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 }
      );
    }

    // Verify application exists
    const application = await appPrisma.applications.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        jobs: { select: { title: true } },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Create the note
    const note = await appPrisma.application_notes.create({
      data: {
        application_id: id,
        content: content.trim(),
        type,
        author_id: session.user.id,
        author_name:
          `${session.user.firstName || ""} ${session.user.lastName || ""}`.trim() ||
          session.user.email,
        metadata,
        is_system_generated: false,
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
          jobTitle: application.jobs?.title,
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
      timestamp: note.created_at,
      author: note.author_name || "System",
      authorId: note.author_id,
      metadata: note.metadata,
      isSystemGenerated: note.is_system_generated,
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
