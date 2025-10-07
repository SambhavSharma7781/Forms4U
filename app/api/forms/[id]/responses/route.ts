import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/services/prisma';

// GET: Fetch all responses for a form (owner only)
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

    // First verify that user owns this form
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        createdBy: userId // Ensure user owns this form
      }
    });

    if (!form) {
      return NextResponse.json(
        { success: false, error: 'Form not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch all responses for this form with answers and question details
    const responses = await prisma.response.findMany({
      where: {
        formId: formId
      },
      include: {
        answers: {
          include: {
            question: true // Include question details for context
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // Latest responses first
      }
    });

    // Format response data for frontend
    const formattedResponses = responses.map(response => ({
      id: response.id,
      createdAt: response.createdAt,
      answers: response.answers.map(answer => ({
        questionId: answer.questionId,
        questionText: answer.question.text,
        questionType: answer.question.type,
        answerText: answer.answerText,
        selectedOptions: answer.selectedOptions
      }))
    }));

    return NextResponse.json({
      success: true,
      responses: formattedResponses,
      count: responses.length,
      formTitle: form.title
    });

  } catch (error) {
    console.error('Error fetching responses:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}