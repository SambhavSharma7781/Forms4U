import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST: Submit form response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params;
    const body = await request.json();
    const { responses } = body;

    console.log('Submitting response for form:', formId);
    console.log('Response data:', responses);

    // Validate that form exists
    const form = await prisma.form.findUnique({
      where: { id: formId },
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
        { success: false, error: 'Form not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    const requiredQuestions = form.questions.filter(q => q.required);
    for (const question of requiredQuestions) {
      const response = responses[question.id];
      if (!response || 
          (typeof response === 'string' && response.trim() === '') ||
          (Array.isArray(response) && response.length === 0)) {
        return NextResponse.json(
          { success: false, error: `Question "${question.text}" is required` },
          { status: 400 }
        );
      }
    }

    // Create response record (anonymous - no userId)
    const responseRecord = await prisma.response.create({
      data: {
        formId: formId,
        // userId is optional for anonymous responses
      }
    });

    // Create answer records for each question response
    const answerPromises = Object.entries(responses).map(async ([questionId, answerData]) => {
      // Find the question to determine its type
      const question = form.questions.find(q => q.id === questionId);
      if (!question) return null;

      let answerText = null;
      let selectedOptions: string[] = [];

      // Handle different answer types
      if (typeof answerData === 'string') {
        // Single text answer or single choice
        answerText = answerData;
      } else if (Array.isArray(answerData)) {
        // Multiple choice (checkboxes)
        selectedOptions = answerData;
        answerText = answerData.join(', '); // Store as comma-separated text too
      }

      return prisma.answer.create({
        data: {
          responseId: responseRecord.id,
          questionId: questionId,
          answerText: answerText,
          selectedOptions: selectedOptions
        }
      });
    });

    // Execute all answer creation promises
    await Promise.all(answerPromises.filter(promise => promise !== null));

    console.log('Response submitted successfully:', responseRecord.id);

    return NextResponse.json({
      success: true,
      message: 'Response submitted successfully',
      responseId: responseRecord.id
    });

  } catch (error) {
    console.error('Error submitting response:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}