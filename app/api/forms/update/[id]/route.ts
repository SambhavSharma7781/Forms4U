import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await auth();
    const userId = authResult.userId;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: formId } = await params;
    const body = await request.json();
    const { title, description, questions } = body;

    // Verify form ownership
    const existingForm = await prisma.form.findFirst({
      where: {
        id: formId,
        createdBy: userId
      }
    });

    if (!existingForm) {
      return NextResponse.json(
        { success: false, error: 'Form not found or access denied' },
        { status: 404 }
      );
    }

    // Update form in transaction
    await prisma.$transaction(async (tx) => {
      // Update form title and description
      await tx.form.update({
        where: { id: formId },
        data: {
          title,
          description
        }
      });

      // Delete existing questions and options
      await tx.option.deleteMany({
        where: {
          question: {
            formId: formId
          }
        }
      });

      await tx.question.deleteMany({
        where: { formId: formId }
      });

      // Create new questions and options
      for (const question of questions) {
        const createdQuestion = await tx.question.create({
          data: {
            text: question.text,
            type: question.type,
            required: question.required,
            formId: formId
          }
        });

        // Create options if question type requires them
        if ((question.type === 'MULTIPLE_CHOICE' || question.type === 'CHECKBOXES') && question.options.length > 0) {
          await tx.option.createMany({
            data: question.options.map((option: any) => ({
              text: option.text,
              questionId: createdQuestion.id
            }))
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Form updated successfully'
    });

  } catch (error) {
    console.error('Error updating form:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}