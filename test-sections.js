// Quick script to add sections for testing pagination
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function addTestSections() {
  try {
    // Get the first form in database
    const form = await prisma.form.findFirst({
      include: {
        sections: {
          include: {
            questions: true
          }
        }
      }
    });

    if (!form) {
      console.log('❌ No forms found in database. Create a form first!');
      return;
    }

    console.log(`📋 Found form: "${form.title}" with ${form.sections.length} section(s)`);
    
    // Get all sections
    const sections = form.sections.sort((a, b) => a.order - b.order);
    
    if (sections.length < 3) {
      console.log('❌ Form needs at least 3 sections. Creating them...');
      
      // Add additional sections if needed
      const sectionsToCreate = [];
      
      if (sections.length === 1) {
        sectionsToCreate.push(
          {
            title: 'Education Background',
            description: 'Tell us about your educational qualifications',
            order: 1,
            formId: form.id
          },
          {
            title: 'Work Experience', 
            description: 'Share your professional experience',
            order: 2,
            formId: form.id
          }
        );
      } else if (sections.length === 2) {
        sectionsToCreate.push({
          title: 'Work Experience', 
          description: 'Share your professional experience',
          order: 2,
          formId: form.id
        });
      }
      
      for (const sectionData of sectionsToCreate) {
        await prisma.section.create({ data: sectionData });
      }
      
      // Refresh sections
      const updatedForm = await prisma.form.findFirst({
        where: { id: form.id },
        include: {
          sections: {
            include: {
              questions: true
            }
          }
        }
      });
      form.sections = updatedForm.sections.sort((a, b) => a.order - b.order);
    }

    // Now distribute questions and add new ones
    const allQuestions = form.sections.flatMap(s => s.questions);
    
    console.log(`📊 Found ${allQuestions.length} existing questions`);
    
    // Move existing questions to different sections
    if (allQuestions.length > 0) {
      for (let i = 0; i < allQuestions.length; i++) {
        const sectionIndex = i % 3; // Distribute across 3 sections
        const targetSectionId = form.sections[sectionIndex].id;
        
        await prisma.question.update({
          where: { id: allQuestions[i].id },
          data: { sectionId: targetSectionId }
        });
      }
      console.log(`✅ Distributed ${allQuestions.length} questions across sections`);
    }

    // Add new questions to ensure each section has questions
    const questionsToAdd = [
      // Section 1 - Personal Information
      {
        text: 'What is your full name?',
        description: 'Please provide your complete name',
        type: 'SHORT_ANSWER',
        required: true,
        sectionId: form.sections[0].id
      },
      {
        text: 'What is your age?',
        type: 'SHORT_ANSWER',
        required: true,
        sectionId: form.sections[0].id
      },
      
      // Section 2 - Education Background  
      {
        text: 'What is your highest level of education?',
        type: 'MULTIPLE_CHOICE',
        required: true,
        sectionId: form.sections[1].id
      },
      {
        text: 'Which university did you graduate from?',
        description: 'Please specify the name of your university',
        type: 'SHORT_ANSWER',
        sectionId: form.sections[1].id
      },
      
      // Section 3 - Work Experience
      {
        text: 'How many years of work experience do you have?',
        type: 'SHORT_ANSWER',
        required: true,
        sectionId: form.sections[2].id
      },
      {
        text: 'What skills do you possess?',
        description: 'Select all that apply',
        type: 'CHECKBOXES',
        sectionId: form.sections[2].id
      }
    ];

    // Add the questions
    for (const questionData of questionsToAdd) {
      const question = await prisma.question.create({
        data: questionData
      });
      
      // Add options for multiple choice and checkboxes
      if (questionData.type === 'MULTIPLE_CHOICE' && questionData.text.includes('education')) {
        await prisma.option.createMany({
          data: [
            { text: 'High School', questionId: question.id },
            { text: 'Bachelor\'s Degree', questionId: question.id },
            { text: 'Master\'s Degree', questionId: question.id },
            { text: 'PhD', questionId: question.id }
          ]
        });
      }
      
      if (questionData.type === 'CHECKBOXES' && questionData.text.includes('skills')) {
        await prisma.option.createMany({
          data: [
            { text: 'JavaScript', questionId: question.id },
            { text: 'Python', questionId: question.id },
            { text: 'React', questionId: question.id },
            { text: 'Node.js', questionId: question.id },
            { text: 'Database Management', questionId: question.id }
          ]
        });
      }
    }

    console.log(`✅ Added ${questionsToAdd.length} new questions across all sections`);
    
    // Final summary
    const finalForm = await prisma.form.findFirst({
      where: { id: form.id },
      include: {
        sections: {
          include: {
            questions: true
          }
        }
      }
    });
    
    const finalSections = finalForm.sections.sort((a, b) => a.order - b.order);
    
    console.log('\n🎯 Final Form Structure:');
    finalSections.forEach((section, index) => {
      console.log(`📋 Section ${index + 1}: "${section.title}" - ${section.questions.length} questions`);
    });
    
    console.log(`\n🔗 Test pagination at: http://localhost:3000/forms/${form.id}/view`);
    console.log('🎉 Perfect! Now each section has questions for proper testing!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestSections();