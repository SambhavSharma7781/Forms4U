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
        shuffleQuestions: form.shuffleQuestions,
        collectEmail: form.collectEmail,
        allowMultipleResponses: form.allowMultipleResponses,
        showProgress: form.showProgress,
        confirmationMessage: form.confirmationMessage,
        defaultRequired: form.defaultRequired,
        // Quiz settings
        isQuiz: form.isQuiz,
        showCorrectAnswers: form.showCorrectAnswers,
        releaseGrades: form.releaseGrades,
        questions: form.questions.map(question => ({
          id: question.id,
          text: question.text,
          type: question.type,
          required: question.required,
          imageUrl: question.imageUrl, // Add image URL to response
          // Quiz fields
          points: question.points,
          correctAnswers: question.correctAnswers,
          // Option settings
          shuffleOptionsOrder: question.shuffleOptionsOrder,
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

// PUT: Update existing form
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
    const data = await request.json();
    const { title, description, questions, published, settings } = data;

    console.log('Updating form:', formId, 'with questions:', questions.length);

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

    console.log('Form found, deleting existing data...');

    // Delete existing answers first (to avoid constraint violation)
    await prisma.answer.deleteMany({
      where: {
        question: {
          formId: formId
        }
      }
    });

    console.log('Answers deleted');

    // Delete existing questions and their options
    await prisma.option.deleteMany({
      where: {
        question: {
          formId: formId
        }
      }
    });

    console.log('Options deleted');

    await prisma.question.deleteMany({
      where: {
        formId: formId
      }
    });

    console.log('Questions deleted, creating new ones...');

    // Update form with new data
    const updatedForm = await prisma.form.update({
      where: { id: formId },
      data: {
        title,
        description,
        published: published ?? existingForm.published,
        // Form settings
        shuffleQuestions: settings?.shuffleQuestions ?? existingForm.shuffleQuestions,
        collectEmail: settings?.collectEmail ?? existingForm.collectEmail,
        allowMultipleResponses: settings?.allowMultipleResponses ?? existingForm.allowMultipleResponses,
        showProgress: settings?.showProgress ?? existingForm.showProgress,
        confirmationMessage: settings?.confirmationMessage ?? existingForm.confirmationMessage,
        defaultRequired: settings?.defaultRequired ?? existingForm.defaultRequired,
        // Quiz settings
        isQuiz: settings?.isQuiz ?? existingForm.isQuiz,
        showCorrectAnswers: settings?.showCorrectAnswers ?? existingForm.showCorrectAnswers,
        releaseGrades: settings?.releaseGrades ?? existingForm.releaseGrades,
        questions: {
          create: questions.map((question: any, index: number) => ({
            text: question.question || question.text,
            type: question.type,
            required: question.required || false,
            imageUrl: question.imageUrl || null, // Add image URL field
            // Quiz fields
            points: question.points || 1,
            correctAnswers: question.correctAnswers || [],
            // Option settings
            shuffleOptionsOrder: question.shuffleOptionsOrder || false,
            options: question.options
              ? {
                  create: question.options.map((option: string, optionIndex: number) => ({
                    text: option
                  }))
                }
              : undefined
          }))
        }
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
      message: published ? 'Form published successfully!' : 'Form updated successfully!',
      formId: updatedForm.id
    });

  } catch (error) {
    console.error('Error updating form:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}