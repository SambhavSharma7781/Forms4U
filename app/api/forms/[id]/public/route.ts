import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
        id: formId
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
        { success: false, error: 'Form not found' },
        { status: 404 }
      );
    }

    // Return only public information
    return NextResponse.json({
      success: true,
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
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