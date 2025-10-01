import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/services/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    // Get user from Clerk
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Please sign in" },
        { status: 401 }
      );
    }

    // Get user's forms from database with questions for preview
    const userForms = await prisma.form.findMany({
      where: {
        createdBy: userId
      },
      orderBy: {
        createdAt: 'desc' // Latest forms first
      },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        questions: {
          take: 3, // Only first 3 questions for preview
          select: {
            id: true,
            text: true,
            type: true,
            required: true,
            options: {
              select: {
                text: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      forms: userForms
    });

  } catch (error) {
    console.error('Error fetching forms:', error);
    return NextResponse.json(
      { success: false, message: "Error loading forms" },
      { status: 500 }
    );
  }
}