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
    const { title, description, questions, published = false } = data;
    


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
        questions: {
          create: questions.map((question: any, index: number) => ({
            text: question.text,
            type: question.type,
            required: question.required || false,
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
    console.error('Error saving form:', error);
    return NextResponse.json(
      { success: false, message: `Error saving form: ${error}` },
      { status: 500 }
    );
  }
}