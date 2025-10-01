import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/services/prisma';
import { auth } from '@clerk/nextjs/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get user from Clerk
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Please sign in" },
        { status: 401 }
      );
    }

    const { id: formId } = await params;

    // Check if form belongs to user
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { createdBy: true }
    });

    if (!form) {
      return NextResponse.json(
        { success: false, message: "Form not found" },
        { status: 404 }
      );
    }

    if (form.createdBy !== userId) {
      return NextResponse.json(
        { success: false, message: "Not authorized" },
        { status: 403 }
      );
    }

    // Delete related data first, then form
    // Step 1: Delete all options for questions in this form
    await prisma.option.deleteMany({
      where: {
        question: {
          formId: formId
        }
      }
    });

    // Step 2: Delete all questions for this form
    await prisma.question.deleteMany({
      where: {
        formId: formId
      }
    });

    // Step 3: Delete the form
    await prisma.form.delete({
      where: { id: formId }
    });

    return NextResponse.json({
      success: true,
      message: "Form deleted successfully"
    });

  } catch (error) {
    console.error('Error deleting form:', error);
    return NextResponse.json(
      { success: false, message: "Error deleting form" },
      { status: 500 }
    );
  }
}