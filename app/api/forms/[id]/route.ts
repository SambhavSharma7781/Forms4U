import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/services/prisma';

export async function GET(
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

    // Fetch form with questions and options
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        createdBy: userId // Ensure user owns this form
      },
      include: {
        questions: {
          include: {
            options: true
          }
        }
      }
    });

    if (!form) {
      return NextResponse.json(
        { success: false, error: 'Form not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
        published: form.published,
        acceptingResponses: form.acceptingResponses,
        questions: form.questions.map(question => ({
          id: question.id,
          text: question.text,
          type: question.type,
          required: question.required,
          options: question.options.map(option => ({
            id: option.id,
            text: option.text
          }))
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching form:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}