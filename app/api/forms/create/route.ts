import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/services/prisma';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Please sign in to create forms" },
        { status: 401 }
      );
    }

    // Get data from request
    const data = await request.json();
    const { title, description, questions, published = false, settings } = data;
    


    // Create or find user in our database
    let user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      // Get real user data from Clerk
      const clerkUser = await currentUser();
      const userEmail = clerkUser?.emailAddresses[0]?.emailAddress || "no-email@example.com";
      
      // Create user with real email
      user = await prisma.user.create({
        data: { 
          id: userId,
          email: userEmail
        }
      });
    }

    // Create form with questions
    const form = await prisma.form.create({
      data: {
        title,
        description,
        published,
        createdBy: userId,
        // Form settings
        shuffleQuestions: settings?.shuffleQuestions || false,
        collectEmail: settings?.collectEmail || false,
        allowMultipleResponses: settings?.allowMultipleResponses ?? true,
        showProgress: settings?.showProgress ?? true,
        confirmationMessage: settings?.confirmationMessage || 'Your response has been recorded.',
        defaultRequired: settings?.defaultRequired || false,
        // Quiz settings
        isQuiz: settings?.isQuiz || false,
        showCorrectAnswers: settings?.showCorrectAnswers ?? true,
        releaseGrades: settings?.releaseGrades ?? true,
        // Response editing settings (automatically disabled if quiz mode)
        allowResponseEditing: (settings?.isQuiz ? false : (settings?.allowResponseEditing || false)),
        editTimeLimit: settings?.editTimeLimit || '24h',
        questions: {
          create: questions.map((question: any, index: number) => ({
            text: question.question || question.text, // Handle both properties
            description: question.description || null, // Add description field
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
      message: "Form saved successfully!",
      formId: form.id 
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, message: `Error saving form: ${error}` },
      { status: 500 }
    );
  }
}