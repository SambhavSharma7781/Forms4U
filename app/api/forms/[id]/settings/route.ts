import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/services/prisma';

// PUT: Update form settings
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
    const settingsData = await request.json();
    
    // Validate that user owns this form
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

    // Update form settings
    const updatedForm = await prisma.form.update({
      where: {
        id: formId
      },
      data: {
        shuffleQuestions: settingsData.shuffleQuestions,
        collectEmail: settingsData.collectEmail,
        allowMultipleResponses: settingsData.allowMultipleResponses,
        showProgress: settingsData.showProgress,
        confirmationMessage: settingsData.confirmationMessage,
        // Quiz settings
        isQuiz: settingsData.isQuiz,
        showCorrectAnswers: settingsData.showCorrectAnswers,
        releaseGrades: settingsData.releaseGrades,
        // Response editing settings (automatically disabled if quiz mode)
        allowResponseEditing: settingsData.isQuiz ? false : settingsData.allowResponseEditing,
        editTimeLimit: settingsData.editTimeLimit
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings: {
        shuffleQuestions: updatedForm.shuffleQuestions,
        collectEmail: updatedForm.collectEmail,
        allowMultipleResponses: updatedForm.allowMultipleResponses,
        showProgress: updatedForm.showProgress,
        confirmationMessage: updatedForm.confirmationMessage,
        // Quiz settings
        isQuiz: updatedForm.isQuiz,
        showCorrectAnswers: updatedForm.showCorrectAnswers,
        releaseGrades: updatedForm.releaseGrades,
        // Response editing settings
        allowResponseEditing: updatedForm.allowResponseEditing,
        editTimeLimit: updatedForm.editTimeLimit
      }
    });

  } catch (error) {
    console.error('Error updating form settings:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}