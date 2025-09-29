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
    const { title, description, questions } = data;
    
    // Debug log
    console.log('Received data:', { title, description, questions });

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

    // Create form in database
    const form = await prisma.form.create({
      data: {
        title: title || "Untitled form",
        description: description || "",
        createdBy: userId
      }
    });

    // Create questions for this form
    for (const question of questions) {
      const createdQuestion = await prisma.question.create({
        data: {
          text: question.question || "Untitled question",
          type: question.type,
          required: question.required,
          formId: form.id
        }
      });

      // If question has options (multiple choice, checkboxes, dropdown)
      if (question.options && question.options.length > 0) {
        for (const optionText of question.options) {
          if (optionText && optionText.trim()) { // Only save non-empty options
            await prisma.option.create({
              data: {
                text: optionText.trim(),
                questionId: createdQuestion.id
              }
            });
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Form saved successfully!",
      formId: form.id 
    });

  } catch (error) {
    console.error('Error saving form:', error);
    return NextResponse.json(
      { success: false, message: `Error saving form: ${error}` },
      { status: 500 }
    );
  }
}