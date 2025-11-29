import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/services/prisma';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Please sign in to add sections" },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { formId, title = "", description = "" } = data;

    // Verify user owns the form
    const form = await prisma.form.findFirst({
      where: { 
        id: formId,
        createdBy: userId 
      },
      include: {
        sections: true
      }
    });

    if (!form) {
      return NextResponse.json(
        { success: false, message: "Form not found or access denied" },
        { status: 404 }
      );
    }

    // Calculate the order for new section (last position)
    const nextOrder = form.sections.length;

    // Create the new section
    const newSection = await prisma.section.create({
      data: {
        title,
        description,
        order: nextOrder,
        formId: formId,
      },
      include: {
        questions: {
          include: {
            options: true
          }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Section added successfully!",
      section: newSection
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, message: `Error adding section: ${error}` },
      { status: 500 }
    );
  }
}

// Update section details
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Please sign in to update sections" },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { sectionId, title, description } = data;

    // Verify user owns the form that contains this section
    const section = await prisma.section.findFirst({
      where: { 
        id: sectionId,
        form: {
          createdBy: userId
        }
      }
    });

    if (!section) {
      return NextResponse.json(
        { success: false, message: "Section not found or access denied" },
        { status: 404 }
      );
    }

    // Update the section
    const updatedSection = await prisma.section.update({
      where: { id: sectionId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description })
      },
      include: {
        questions: {
          include: {
            options: true
          }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Section updated successfully!",
      section: updatedSection
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, message: `Error updating section: ${error}` },
      { status: 500 }
    );
  }
}

// Delete a section and all its questions
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Please sign in to delete sections" },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { sectionId } = data;

    // Verify user owns the form that contains this section
    const section = await prisma.section.findFirst({
      where: { 
        id: sectionId,
        form: {
          createdBy: userId
        }
      },
      include: {
        form: {
          include: {
            sections: true
          }
        }
      }
    });

    if (!section) {
      return NextResponse.json(
        { success: false, message: "Section not found or access denied" },
        { status: 404 }
      );
    }

    // Prevent deletion if it's the only section
    if (section.form.sections.length <= 1) {
      return NextResponse.json(
        { success: false, message: "Cannot delete the last section. A form must have at least one section." },
        { status: 400 }
      );
    }

    // Delete the section (this will cascade delete all questions and options)
    await prisma.section.delete({
      where: { id: sectionId }
    });

    // Reorder remaining sections
    const remainingSections = await prisma.section.findMany({
      where: { formId: section.formId },
      orderBy: { order: 'asc' }
    });

    for (let i = 0; i < remainingSections.length; i++) {
      await prisma.section.update({
        where: { id: remainingSections[i].id },
        data: { order: i }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Section deleted successfully!"
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, message: `Error deleting section: ${error}` },
      { status: 500 }
    );
  }
}