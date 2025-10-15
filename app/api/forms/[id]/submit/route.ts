import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/services/prisma';

// POST: Submit form response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params;
    const body = await request.json();
    const { responses, email } = body;

    console.log('Form submission for:', formId);
    console.log('Received responses:', responses);
    console.log('Received email:', email);



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

    // Validate email if collection is enabled
    if (form.collectEmail) {
      if (!email || !email.trim()) {
        return NextResponse.json(
          { success: false, error: 'Email address is required' },
          { status: 400 }
        );
      }
      
      // Basic email validation
      const emailRegex = /\S+@\S+\.\S+/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid email address' },
          { status: 400 }
        );
      }
    }

    // Check multiple responses setting
    // Note: For anonymous users, multiple response validation is handled on the frontend
    // using localStorage. For logged-in users, you could add server-side validation here.
    
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
        email: form.collectEmail ? email : null,
        // userId is optional for anonymous responses
      }
    });

    console.log('Created response record:', responseRecord.id);

    // Create answer records for each question response
    const answerPromises = Object.entries(responses).map(async ([questionId, answerData]) => {
      console.log(`Processing answer for question ${questionId}:`, answerData);
      
      // Find the question to determine its type
      const question = form.questions.find(q => q.id === questionId);
      if (!question) {
        console.log(`Question ${questionId} not found!`);
        return null;
      }

      let answerText = null;
      let selectedOptions: string[] = [];

      // Handle different answer types
      if (typeof answerData === 'string') {
        // Single text answer or single choice
        answerText = answerData;
        console.log(`String answer: "${answerText}"`);
      } else if (Array.isArray(answerData)) {
        // Multiple choice (checkboxes)
        selectedOptions = answerData;
        answerText = answerData.join(', '); // Store as comma-separated text too
        console.log(`Array answer: [${selectedOptions.join(', ')}]`);
      }

      const answerRecord = await prisma.answer.create({
        data: {
          responseId: responseRecord.id,
          questionId: questionId,
          answerText: answerText,
          selectedOptions: selectedOptions
        }
      });

      console.log('Created answer record:', answerRecord);
      return answerRecord;
    });

    // Execute all answer creation promises
    const createdAnswers = await Promise.all(answerPromises.filter(promise => promise !== null));
    
    console.log('All answers created:', createdAnswers.length, 'answers');

    return NextResponse.json({
      success: true,
      message: 'Response submitted successfully',
      confirmationMessage: form.confirmationMessage || 'Your response has been recorded.',
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