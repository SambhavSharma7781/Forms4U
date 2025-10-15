import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/services/prisma';

// GET: Public form data (no authentication required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params;

    // Fetch form with questions and options (PUBLIC ACCESS)
    const form = await prisma.form.findUnique({
      where: {
        id: formId,
        published: true // Only allow access to published forms
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
        { success: false, error: 'Form not found or not published' },
        { status: 404 }
      );
    }

    // Return only public information (including settings needed for form rendering)
    return NextResponse.json({
      success: true,
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
        acceptingResponses: form.acceptingResponses,
        shuffleQuestions: form.shuffleQuestions,
        collectEmail: form.collectEmail,
        allowMultipleResponses: form.allowMultipleResponses,
        showProgress: form.showProgress,
        confirmationMessage: form.confirmationMessage,
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
    console.error('Error fetching public form:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}