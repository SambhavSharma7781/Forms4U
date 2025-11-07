import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/services/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await auth();
    const userId = authResult.userId;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: formId } = await params;
    const body = await request.json();
    const { title, description, questions, published = false, acceptingResponses = true } = body;
    
    console.log('🔴 API UPDATE - Received questions:', questions.map((q: any) => ({ 
      id: q.id, 
      text: q.text || q.question, 
      description: q.description 
    })));

    // Verify form ownership
    const existingForm = await prisma.form.findFirst({
      where: {
        id: formId,
        createdBy: userId
      }
    });

    if (!existingForm) {
      return NextResponse.json(
        { success: false, error: 'Form not found or access denied' },
        { status: 404 }
      );
    }

    // Check if form has existing responses
    const hasResponses = await prisma.response.count({
      where: { formId: formId }
    }) > 0;

    // Update form in transaction
    await prisma.$transaction(async (tx) => {
      // Update form title, description, published status, and accepting responses
      await tx.form.update({
        where: { id: formId },
        data: {
          title,
          description,
          published,
          acceptingResponses
        }
      });

      if (!hasResponses) {
        // If no responses exist, we can safely delete and recreate questions/options
        // Delete existing data in correct order (due to foreign key constraints)
        // 1. Delete options first
        await tx.option.deleteMany({
          where: {
            question: {
              formId: formId
            }
          }
        });

        // 2. Then delete questions
        await tx.question.deleteMany({
          where: { formId: formId }
        });

        // Create new questions and options
        for (const question of questions) {
          const createdQuestion = await tx.question.create({
            data: {
              text: question.text,
              description: question.description || null, // Add description field
              type: question.type,
              required: question.required,
              imageUrl: question.imageUrl || null, // Add imageUrl field
              formId: formId
            }
          });

          // Create options if question type requires them
          if ((question.type === 'MULTIPLE_CHOICE' || question.type === 'CHECKBOXES' || question.type === 'DROPDOWN') && question.options.length > 0) {
            await tx.option.createMany({
              data: question.options.map((option: any) => ({
                text: typeof option === 'string' ? option : option.text,
                imageUrl: typeof option === 'string' ? null : (option.imageUrl || null),
                questionId: createdQuestion.id
              }))
            });
          }
        }
      } else {
        // If responses exist, we need to be more careful to preserve existing data
        // For now, we'll only allow updating form title, description, and status
        // More sophisticated question editing with response preservation can be added later
        console.log('Form has existing responses - preserving questions and answers');
        
        // Get existing questions to check if they match
        const existingQuestions = await tx.question.findMany({
          where: { formId: formId },
          include: { options: true },
          orderBy: { id: 'asc' }
        });

        // For forms with responses, we'll be more flexible but still preserve data
        // Allow safe changes and warn about unsafe ones
        
        // Map questions by their permanent IDs (non-temp IDs)
        const existingQuestionsMap = new Map();
        existingQuestions.forEach(q => {
          existingQuestionsMap.set(q.id, q);
        });

        // Process each question in the new set
        for (const newQuestion of questions) {
          if (newQuestion.id && !newQuestion.id.toString().startsWith('temp_')) {
            // Existing question - update it
            const existingQuestion = existingQuestionsMap.get(newQuestion.id);
            if (existingQuestion) {
              // Allow text, required, and options updates
              // For type changes, we'll allow safe ones
              const isSafeTypeChange = (
                existingQuestion.type === newQuestion.type ||
                // Allow changes between similar text types
                (existingQuestion.type === 'SHORT_ANSWER' && newQuestion.type === 'PARAGRAPH') ||
                (existingQuestion.type === 'PARAGRAPH' && newQuestion.type === 'SHORT_ANSWER') ||
                // Allow changes between choice types (they have similar structure)
                (['MULTIPLE_CHOICE', 'CHECKBOXES', 'DROPDOWN'].includes(existingQuestion.type) && 
                 ['MULTIPLE_CHOICE', 'CHECKBOXES', 'DROPDOWN'].includes(newQuestion.type))
              );

              if (!isSafeTypeChange) {
                console.warn(`Unsafe type change detected for question ${existingQuestion.id}: ${existingQuestion.type} -> ${newQuestion.type}`);
                // Skip this question or handle it differently
                continue;
              }
              
              await tx.question.update({
                where: { id: existingQuestion.id },
                data: {
                  text: newQuestion.text,
                  description: newQuestion.description || null, // Add description field
                  type: newQuestion.type,
                  required: newQuestion.required,
                  imageUrl: newQuestion.imageUrl || null // Add imageUrl field
                }
              });

              // Update options for choice-based questions
              if (['MULTIPLE_CHOICE', 'CHECKBOXES', 'DROPDOWN'].includes(newQuestion.type) && newQuestion.options) {
                // Delete existing options
                await tx.option.deleteMany({
                  where: { questionId: existingQuestion.id }
                });
                
                // Create new options
                if (newQuestion.options.length > 0) {
                  await tx.option.createMany({
                    data: newQuestion.options.map((option: any) => ({
                      text: typeof option === 'string' ? option : option.text,
                      imageUrl: typeof option === 'string' ? null : (option.imageUrl || null),
                      questionId: existingQuestion.id
                    }))
                  });
                }
              }
            }
          } else {
            // New question (temp ID) - create it
            console.log('Creating new question for form with responses:', newQuestion.text);
            const createdQuestion = await tx.question.create({
              data: {
                text: newQuestion.text,
                description: newQuestion.description || null, // Add description field
                type: newQuestion.type,
                required: newQuestion.required,
                imageUrl: newQuestion.imageUrl || null, // Add imageUrl field
                formId: formId
              }
            });

            // Create options if needed
            if (['MULTIPLE_CHOICE', 'CHECKBOXES', 'DROPDOWN'].includes(newQuestion.type) && newQuestion.options && newQuestion.options.length > 0) {
              await tx.option.createMany({
                data: newQuestion.options.map((option: any) => ({
                  text: typeof option === 'string' ? option : option.text,
                  imageUrl: typeof option === 'string' ? null : (option.imageUrl || null),
                  questionId: createdQuestion.id
                }))
              });
            }
          }
        }

        // Handle question deletions - identify questions that are no longer in the new list
        const newQuestionIds = new Set(
          questions
            .filter((q: any) => q.id && !q.id.toString().startsWith('temp_'))
            .map((q: any) => q.id)
        );
        
        const questionsToDelete = existingQuestions.filter(q => !newQuestionIds.has(q.id));
        
        if (questionsToDelete.length > 0) {
          console.log(`Deleting ${questionsToDelete.length} questions from form with responses`);
          
          // Delete questions and their related data
          for (const questionToDelete of questionsToDelete) {
            // First delete related answers
            await tx.answer.deleteMany({
              where: { questionId: questionToDelete.id }
            });
            
            // Then delete options
            await tx.option.deleteMany({
              where: { questionId: questionToDelete.id }
            });
            
            // Finally delete the question
            await tx.question.delete({
              where: { id: questionToDelete.id }
            });
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Form updated successfully'
    });

  } catch (error) {
    console.error('Error updating form:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}