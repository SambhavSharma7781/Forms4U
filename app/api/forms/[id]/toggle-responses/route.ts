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
    const { acceptingResponses } = await request.json();

    // Verify form ownership and that it's published
    const existingForm = await prisma.form.findUnique({
      where: { id: formId },
      select: { createdBy: true, published: true }
    });

    if (!existingForm) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    if (existingForm.createdBy !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!existingForm.published) {
      return NextResponse.json({ error: 'Form must be published first' }, { status: 400 });
    }

    // Update accepting responses status
    const updatedForm = await prisma.form.update({
      where: { id: formId },
      data: { acceptingResponses },
      select: { id: true, acceptingResponses: true }
    });

    return NextResponse.json(updatedForm);
  } catch (error) {
    console.error('Error updating form response status:', error);
    return NextResponse.json(
      { error: 'Failed to update form response status' },
      { status: 500 }
    );
  }
}