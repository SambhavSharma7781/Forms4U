import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/services/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params;

    const form = await prisma.form.findUnique({
      where: {
        id: formId,
        published: true // Only allow access to published forms
      },
      include: {
        sections: {
          include: {
            questions: {
              include: {
                options: true
              }
            }
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
        // Quiz settings (needed for quiz rendering)
        isQuiz: form.isQuiz,
        showCorrectAnswers: form.showCorrectAnswers,
        releaseGrades: form.releaseGrades,
        // Response editing settings (needed for response handling)
        allowResponseEditing: form.allowResponseEditing,
        editTimeLimit: form.editTimeLimit,
        sections: form.sections.map(section => ({
          id: section.id,
          title: section.title,
          description: section.description,
          order: section.order,
          questions: section.questions.map(question => ({
            id: question.id,
            text: question.text,
            description: question.description,
            type: question.type,
            required: question.required,
            imageUrl: question.imageUrl,
            // Quiz fields
            points: question.points,
            correctAnswers: question.correctAnswers,
            // Option settings
            shuffleOptionsOrder: question.shuffleOptionsOrder,
            options: question.options.map(option => ({
              id: option.id,
              text: option.text,
              imageUrl: option.imageUrl
            }))
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