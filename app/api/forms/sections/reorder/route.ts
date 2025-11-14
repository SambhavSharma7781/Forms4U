import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/services/prisma';
import { auth } from '@clerk/nextjs/server';

// Reorder sections within a form
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Please sign in to reorder sections" },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { formId, sectionIds } = data; // sectionIds is an array in the desired order

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

    // Verify all section IDs belong to this form
    const formSectionIds = form.sections.map(s => s.id);
    const isValidReorder = sectionIds.every((id: string) => formSectionIds.includes(id));

    if (!isValidReorder || sectionIds.length !== formSectionIds.length) {
      return NextResponse.json(
        { success: false, message: "Invalid section order provided" },
        { status: 400 }
      );
    }

    // Update the order of each section
    for (let i = 0; i < sectionIds.length; i++) {
      await prisma.section.update({
        where: { id: sectionIds[i] },
        data: { order: i }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Sections reordered successfully!"
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, message: `Error reordering sections: ${error}` },
      { status: 500 }
    );
  }
}