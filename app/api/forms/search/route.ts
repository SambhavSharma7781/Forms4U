import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismaClient from '@/services/prisma';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ success: true, forms: [] });
    }

    // Search forms by title (case-insensitive)
    const forms = await prismaClient.form.findMany({
      where: {
        createdBy: userId,
        title: {
          contains: query.trim(),
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        title: true,
        description: true,
        published: true,
        createdAt: true
      },
      orderBy: [
        { published: 'desc' }, // Published forms first
        { createdAt: 'desc' }   // Then by creation date
      ],
      take: 8 // Limit results like YouTube suggestions
    });

    return NextResponse.json({
      success: true,
      forms: forms
    });

  } catch (error) {
    console.error('Search forms error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search forms' },
      { status: 500 }
    );
  }
}