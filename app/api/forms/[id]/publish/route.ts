import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/services/prisma';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const formId = params.id;
    const { published } = await request.json();

    // Verify form ownership
    const existingForm = await prisma.form.findUnique({
      where: { id: formId },
      select: { createdBy: true }
    });

    if (!existingForm) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    if (existingForm.createdBy !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updatedForm = await prisma.form.update({
      where: { id: formId },
      data: { published },
      select: { id: true, published: true }
    });

    return NextResponse.json(updatedForm);
  } catch (error) {
    console.error('Error updating form publish status:', error);
    return NextResponse.json(
      { error: 'Failed to update form publish status' },
      { status: 500 }
    );
  }
}