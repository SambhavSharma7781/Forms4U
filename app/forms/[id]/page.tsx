'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';

import LoadingSpinner from '@/components/LoadingSpinner';
import QuestionCard from '@/components/QuestionCard';
import RichTextEditor from '@/components/RichTextEditor';
import { navbarEvents } from '@/components/Navbar';

interface Question {
  id: string;
  text: string;
  description?: string; // Add description field for helper text
  type: 'SHORT_ANSWER' | 'PARAGRAPH' | 'MULTIPLE_CHOICE' | 'CHECKBOXES' | 'DROPDOWN';
  required: boolean;
  options: { id: string; text: string; imageUrl?: string; }[];
  shuffleOptionsOrder?: boolean;
  imageUrl?: string; // Add image URL field
  // Quiz fields
  points?: number;
  correctAnswers?: string[];
}

interface Section {
  id: string;
  title: string;
  description: string | null;
  order: number;
  questions: Question[];
}

interface FormData {
  id: string;
  title: string;
  description: string;
  published: boolean;
  acceptingResponses: boolean;
  shuffleQuestions?: boolean;
  collectEmail?: boolean;
  allowMultipleResponses?: boolean;
  showProgress?: boolean;
  confirmationMessage?: string;
  restrictToOrganization?: boolean;
  // Quiz fields
  isQuiz?: boolean;
  showCorrectAnswers?: boolean;
  releaseGrades?: boolean;
  sections: Section[];
}

interface Answer {
  questionId: string;
  questionText: string;
  questionType: string;
  answerText: string | null;
  selectedOptions: string[];
}

interface Response {
  id: string;
  createdAt: string;
  answers: Answer[];
}

interface ResponseData {
  responses: Response[];
  count: number;
  formTitle: string;
}

export default function Form() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const formId = params.id as string;

  // Form editing states
  const [formData, setFormData] = useState<FormData>({
    id: '',
    title: 'Untitled form',
    description: '',
    published: false,
    acceptingResponses: true,
    sections: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingResponses, setLoadingResponses] = useState(false);
  
  // Tab system states - Google Forms style
  const [activeTab, setActiveTab] = useState<'questions' | 'responses' | 'settings'>('questions');
  const [responseData, setResponseData] = useState<ResponseData | null>(null);
  const [responseCount, setResponseCount] = useState(0);
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Track original form data to detect changes
  const [originalFormData, setOriginalFormData] = useState<FormData | null>(null);

  // Form settings states
  const [formSettings, setFormSettings] = useState({
    shuffleQuestions: false,
    collectEmail: false,
    allowMultipleResponses: true,
    showProgress: true,
    confirmationMessage: 'Your response has been recorded.',
    defaultRequired: false,
    // Quiz settings
    isQuiz: false,
    showCorrectAnswers: true,
    releaseGrades: true,
    // Response editing settings
    allowResponseEditing: false,
    editTimeLimit: '24h'
  });
  
  // Track original settings for change detection
  const [originalSettings, setOriginalSettings] = useState({
    shuffleQuestions: false,
    collectEmail: false,
    allowMultipleResponses: true,
    showProgress: true,
    confirmationMessage: 'Your response has been recorded.',
    defaultRequired: false,
    // Quiz settings
    isQuiz: false,
    showCorrectAnswers: true,
    releaseGrades: true,
    // Response editing settings
    allowResponseEditing: false,
    editTimeLimit: '24h'
  });

  // Check if this is an existing form or new form
  const isExistingForm = formId !== 'create';

  // Helper function to get all questions from sections (flattened)
  const getAllQuestions = (sections: Section[]): Question[] => {
    if (!sections || sections.length === 0) return [];
    return sections.flatMap(section => section.questions || []);
  };

  // Helper function to update a question in sections
  const updateQuestionInSections = (sections: Section[], questionId: string, updateFn: (question: Question) => Question): Section[] => {
    return sections.map(section => ({
      ...section,
      questions: section.questions.map(q => q.id === questionId ? updateFn(q) : q)
    }));
  };

  // Helper function to add a question to a specific section (or create section if none exist)
  const addQuestionToSections = (sections: Section[], newQuestion: Question, sectionId?: string): Section[] => {
    if (!sections || sections.length === 0) {
      // Create default section if none exist
      return [{
        id: `section_${Date.now()}`,
        title: 'Section 1',
        description: null,
        order: 0,
        questions: [newQuestion]
      }];
    }
    
    // If sectionId is provided, add to that specific section
    if (sectionId) {
      return sections.map(section => 
        section.id === sectionId 
          ? { ...section, questions: [...(section.questions || []), newQuestion] }
          : section
      );
    }
    
    // Default: Add to last section
    const updatedSections = [...sections];
    const lastSectionIndex = updatedSections.length - 1;
    updatedSections[lastSectionIndex] = {
      ...updatedSections[lastSectionIndex],
      questions: [...(updatedSections[lastSectionIndex].questions || []), newQuestion]
    };
    return updatedSections;
  };

  // Helper function to remove a question from sections
  const removeQuestionFromSections = (sections: Section[], questionId: string): Section[] => {
    return sections.map(section => ({
      ...section,
      questions: section.questions.filter(q => q.id !== questionId)
    }));
  };

  // Auto-disable response editing when quiz mode is enabled
  useEffect(() => {
    if (formSettings.isQuiz && formSettings.allowResponseEditing) {
      setFormSettings(prev => ({
        ...prev,
        allowResponseEditing: false
      }));
    }
  }, [formSettings.isQuiz]);

  // Utility function to validate settings before saving
  const validateSettings = (settings: typeof formSettings) => {
    // Ensure response editing is disabled in quiz mode
    if (settings.isQuiz && settings.allowResponseEditing) {
      return {
        ...settings,
        allowResponseEditing: false
      };
    }
    return settings;
  };

  // Fetch existing form data if editing
  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn) {
        if (isExistingForm) {
          fetchFormData();
          fetchResponseCount();
        } else {
          // New form - start fresh
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
  }, [isSignedIn, isLoaded, formId]);

  // Auto-refresh responses when on responses tab
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;
    
    if (activeTab === 'responses' && isExistingForm && formData.published) {
      // Refresh responses every 10 seconds when on responses tab
      refreshInterval = setInterval(() => {
        fetchResponses();
        fetchResponseCount();
      }, 10000); // 10 seconds
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [activeTab, isExistingForm, formData.published]);



  // Listen for navbar publish button clicks
  useEffect(() => {
    const handleNavbarPublish = () => {
      if (isExistingForm) {
        // For existing forms, can only publish if not already published
        if (!formData.published) {
          togglePublishStatus();
        }
      } else {
        // For new forms, save and publish
        saveForm(true);
      }
    };

    const handleNavbarUnpublish = () => {
      if (isExistingForm && formData.published) {
        // Unpublish the form
        togglePublishStatus();
      }
    };

    const handleToggleResponses = () => {
      toggleResponseAcceptance();
    };

    navbarEvents.subscribe('publishForm', handleNavbarPublish);
    navbarEvents.subscribe('unpublishForm', handleNavbarUnpublish);
    navbarEvents.subscribe('toggleResponses', handleToggleResponses);
    
    return () => {
      navbarEvents.unsubscribe('publishForm', handleNavbarPublish);
      navbarEvents.unsubscribe('unpublishForm', handleNavbarUnpublish);
      navbarEvents.unsubscribe('toggleResponses', handleToggleResponses);
    };
  }, [isExistingForm, formData.published]);

  // Update navbar whenever formData changes - with proper timing
  useEffect(() => {
    // Only update navbar after form data is fully loaded and published status is defined
    if (formData.id && isExistingForm && !loading && formData.published !== undefined) {
      navbarEvents.emit('formStatusUpdate', {
        published: formData.published,
        acceptingResponses: formData.acceptingResponses,
        formId: formData.id,
        title: formData.title
      });
    }
  }, [formData.published, formData.acceptingResponses, formData.id, formData.title, isExistingForm, loading]);



  // Sync formData with formSettings changes for components that rely on formData
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      ...formSettings
    }));
  }, [formSettings]);

  // Cleanup navbar when component unmounts
  useEffect(() => {
    return () => {
      navbarEvents.emit('formStatusUpdate', {
        published: false,
        acceptingResponses: true,
        formId: '',
        title: ''
      });
    };
  }, []);

  const fetchFormData = async () => {
    try {
      const response = await fetch(`/api/forms/${formId}`);
      const data = await response.json();
      
      if (data.success) {
        setFormData(data.form);
        setOriginalFormData(data.form); // Store original data for comparison
        
        // Load form settings from the fetched data
        const loadedSettings = {
          shuffleQuestions: data.form.shuffleQuestions || false,
          collectEmail: data.form.collectEmail || false,
          allowMultipleResponses: data.form.allowMultipleResponses ?? true,
          showProgress: data.form.showProgress ?? true,
          confirmationMessage: data.form.confirmationMessage || 'Your response has been recorded.',
          defaultRequired: data.form.defaultRequired || false,
          // Quiz settings
          isQuiz: data.form.isQuiz || false,
          showCorrectAnswers: data.form.showCorrectAnswers ?? true,
          releaseGrades: data.form.releaseGrades ?? true,
          // Response editing settings
          allowResponseEditing: data.form.allowResponseEditing || false,
          editTimeLimit: data.form.editTimeLimit || '24h'
        };
        console.log('🎯 Loaded quiz settings:', {
          isQuiz: loadedSettings.isQuiz,
          showCorrectAnswers: loadedSettings.showCorrectAnswers,
          releaseGrades: loadedSettings.releaseGrades
        });
        setFormSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
        
        // Update navbar with form status
        navbarEvents.emit('formStatusUpdate', {
          published: data.form.published,
          formId: data.form.id,
          title: data.form.title
        });
      } else {
        router.push('/');
      }
    } catch (error) {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchResponseCount = async () => {
    try {
      const response = await fetch(`/api/forms/${formId}/responses`);
      const data = await response.json();
      
      if (data.success) {
        setResponseCount(data.count);
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const fetchResponses = async () => {
    setLoadingResponses(true);
    try {
      const response = await fetch(`/api/forms/${formId}/responses`);
      const data = await response.json();
      
      if (data.success) {
        setResponseData(data);
      }
    } catch (error) {
      // Error handled silently
    } finally {
      setLoadingResponses(false);
    }
  };

  // Check if settings have unsaved changes
  const hasUnsavedSettingsChanges = () => {
    return JSON.stringify(formSettings) !== JSON.stringify(originalSettings);
  };

  // Check if form has unsaved changes
  const hasUnsavedChanges = () => {
    if (!originalFormData) {
      return false;
    }
    
    // Compare title and description
    if (formData.title !== originalFormData.title || 
        formData.description !== originalFormData.description) {
      return true;
    }
    
    // Compare form settings (including quiz settings)
    if (hasUnsavedSettingsChanges()) {
      return true;
    }
    
    // Get flattened questions from sections for comparison
    const currentQuestions = getAllQuestions(formData.sections || []);
    const originalQuestions = getAllQuestions(originalFormData.sections || []);
    
    // Compare questions count
    if (currentQuestions.length !== originalQuestions.length) {
      return true;
    }
    
    // Compare each question
    for (let i = 0; i < currentQuestions.length; i++) {
      const currentQ = currentQuestions[i];
      const originalQ = originalQuestions[i];
      
      if (!originalQ) {
        return true; // New question
      }
      
      if (currentQ.text !== originalQ.text) {
        return true;
      }
      
      if ((currentQ.description || '') !== (originalQ.description || '')) {
        return true;
      }
      
      if (currentQ.type !== originalQ.type ||
          currentQ.required !== originalQ.required ||
          (currentQ.shuffleOptionsOrder || false) !== (originalQ.shuffleOptionsOrder || false) ||
          (currentQ.imageUrl || '') !== (originalQ.imageUrl || '')) {
        return true;
      }
      
      // Compare quiz fields
      if ((currentQ.points || 1) !== (originalQ.points || 1)) {
        return true;
      }
      
      // Compare correct answers
      const currentCorrectAnswers = JSON.stringify(currentQ.correctAnswers || []);
      const originalCorrectAnswers = JSON.stringify(originalQ.correctAnswers || []);
      if (currentCorrectAnswers !== originalCorrectAnswers) {
        return true;
      }
      
      // Compare options for questions that have them
      // Filter empty options for consistent comparison with QuestionCard filtering
      const currentOptions = currentQ.options?.filter((opt: any) => opt.text.trim() !== "") || [];
      const originalOptions = originalQ.options?.filter((opt: any) => opt.text.trim() !== "") || [];
      
      if (currentOptions.length !== originalOptions.length) {
        return true;
      }
      
      for (let j = 0; j < currentOptions.length; j++) {
        if (currentOptions[j].text !== originalOptions[j].text ||
            (currentOptions[j].imageUrl || '') !== (originalOptions[j].imageUrl || '')) {
          console.log('🔍 OPTION CONTENT MISMATCH:', {
            questionIndex: i,
            optionIndex: j,
            currentText: currentOptions[j].text,
            originalText: originalOptions[j].text,
            currentImage: currentOptions[j].imageUrl,
            originalImage: originalOptions[j].imageUrl
          });
          return true;
        }
      }
    }
    
    return false;
  };

  // Form editing functions
  const updateFormTitle = (title: string) => {
    setFormData({ ...formData, title });
  };

  const updateFormDescription = (description: string) => {
    setFormData({ ...formData, description });
  };

  const updateQuestion = (questionId: string, field: string, value: any) => {
    const updatedSections = updateQuestionInSections(formData.sections || [], questionId, (question: Question) => ({
      ...question,
      [field]: value
    }));
    setFormData({ ...formData, sections: updatedSections });
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `temp_${Date.now()}`,
      text: '',
      type: 'SHORT_ANSWER',
      required: formSettings.defaultRequired,
      options: [],
      imageUrl: '' // Initialize imageUrl field
    };
    
    const updatedSections = addQuestionToSections(formData.sections || [], newQuestion);
    setFormData({ ...formData, sections: updatedSections });
  };

  const addSectionAfter = (questionId: string) => {
    if (!formData.sections) return;

    // Find which section contains this question
    let targetSectionIndex = -1;
    formData.sections.forEach((section, index) => {
      if (section.questions.some(q => q.id === questionId)) {
        targetSectionIndex = index;
      }
    });

    if (targetSectionIndex === -1) return;

    // Create new section
    const newSection: Section = {
      id: `temp_section_${Date.now()}`,
      title: `Section ${formData.sections.length + 1}`,
      description: null,
      order: targetSectionIndex + 1,
      questions: [{
        id: `temp_${Date.now()}`,
        text: '',
        type: 'SHORT_ANSWER',
        required: formSettings.defaultRequired,
        options: [],
        imageUrl: ''
      }]
    };

    // Insert the new section after the target section
    const updatedSections = [...formData.sections];
    updatedSections.splice(targetSectionIndex + 1, 0, newSection);

    // Update order values for sections after the insertion point
    updatedSections.forEach((section, index) => {
      section.order = index;
    });

    setFormData({ ...formData, sections: updatedSections });
  };

  const deleteQuestion = (questionId: string) => {
    const updatedSections = removeQuestionFromSections(formData.sections || [], questionId);
    setFormData({ ...formData, sections: updatedSections });
  };

  const duplicateQuestion = (questionId: string) => {
    const allQuestions = getAllQuestions(formData.sections || []);
    const questionToDuplicate = allQuestions.find((q: any) => q.id === questionId);
    
    if (questionToDuplicate) {
      const duplicatedQuestion = {
        ...questionToDuplicate,
        id: `temp_${Date.now()}`,
        options: questionToDuplicate.options.map((opt: any) => ({
          ...opt,
          id: `temp_${Date.now()}_${Math.random()}`
        }))
      };
      
      const updatedSections = addQuestionToSections(formData.sections || [], duplicatedQuestion);
      setFormData({ ...formData, sections: updatedSections });
    }
  };

  const addOption = (questionId: string) => {
    const updatedSections = updateQuestionInSections(formData.sections || [], questionId, (question: Question) => ({
      ...question,
      options: [...question.options, { id: `temp_${Date.now()}`, text: '' }]
    }));
    setFormData({ ...formData, sections: updatedSections });
  };

  const removeOption = (questionId: string, optionId: string) => {
    const updatedSections = updateQuestionInSections(formData.sections || [], questionId, (question: Question) => ({
      ...question,
      options: question.options.filter((opt: any) => opt.id !== optionId)
    }));
    setFormData({ ...formData, sections: updatedSections });
  };

  const saveForm = async (forcePublished?: boolean) => {
    if (!formData.title.trim()) {
      return;
    }

    setSaving(true);
    try {
      // For existing forms, preserve current published status unless explicitly specified
      // For new forms, use the forcePublished parameter or default to false
      const publishedStatus = isExistingForm 
        ? (forcePublished !== undefined ? forcePublished : formData.published)
        : (forcePublished !== undefined ? forcePublished : false);
      
      // Create payload with correct published status and proper data structure
      const allQuestions = getAllQuestions(formData.sections || []);
      const payload = {
        title: formData.title,
        description: formData.description,
        published: publishedStatus,
        sections: formData.sections || [],
        // Legacy support - also include flattened questions
        questions: allQuestions.map((q: any) => ({
          id: q.id, // Include question ID for existing questions
          question: q.text, // API expects 'question' field
          text: q.text, // Also send as 'text' for compatibility
          description: q.description, // Add description to the payload
          type: q.type,
          required: q.required,
          options: q.options,
          shuffleOptionsOrder: q.shuffleOptionsOrder || false,
          imageUrl: q.imageUrl, // Add image URL to the payload
          // Quiz fields
          points: q.points || 1,
          correctAnswers: q.correctAnswers || []
        })),
        settings: validateSettings(formSettings)
      };
      
      console.log('🚀 SAVING FORM - Full payload:', JSON.stringify(payload, null, 2));
      console.log('🚀 Questions with descriptions:', payload.questions.map((q: any) => ({ id: q.id, text: q.text, description: q.description })));
      
      const url = isExistingForm ? `/api/forms/update/${formId}` : '/api/forms/create';
      const method = isExistingForm ? 'PUT' : 'POST';
      
      console.log('🚀 API URL:', url, 'Method:', method);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      console.log('🚀 API Response status:', response.status);

      const data = await response.json();
      
      if (data.success) {
        // Update local state
        const updatedFormData = { ...formData, published: publishedStatus };
        setFormData(updatedFormData);
        setOriginalFormData(updatedFormData); // Update original data to reflect saved state
        
        // Also update original settings to reflect saved state
        setOriginalSettings(formSettings);
        
        // Update navbar with new status
        navbarEvents.emit('formStatusUpdate', {
          published: publishedStatus,
          formId: formData.id || data.form?.id,
          title: formData.title
        });
        
        // Show appropriate message based on what happened
        let message;
        if (isExistingForm) {
          if (formData.published && publishedStatus) {
            message = 'Changes saved!';
          } else if (!formData.published && publishedStatus) {
            message = 'Form published successfully!';
          } else if (formData.published && !publishedStatus) {
            message = 'Form unpublished and saved as draft!';
          } else {
            message = 'Form saved as draft!';
          }
        } else {
          message = publishedStatus ? 'Form published successfully!' : 'Form saved as draft!';
        }
        
        if (!isExistingForm) {
          router.push('/');
        }
      } else {
      }
    } catch (error) {
      console.error('Error saving form:', error);
    } finally {
      setSaving(false);
    }
  };



  const togglePublishStatus = async () => {
    if (!isExistingForm) {
      return;
    }

    setSaving(true);
    try {
      const newPublishedStatus = !formData.published;
      console.log('togglePublishStatus - Changing from:', formData.published, 'to:', newPublishedStatus);
      
      const response = await fetch(`/api/forms/${formId}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ published: newPublishedStatus }),
      });

      const data = await response.json();
      console.log('togglePublishStatus - API response:', data);
      
      if (response.ok) {
        console.log('togglePublishStatus - Updating form data to published:', newPublishedStatus);
        setFormData(prev => ({ ...prev, published: newPublishedStatus }));
        // Update navbar with new status
        navbarEvents.emit('formStatusUpdate', {
          published: newPublishedStatus,
          acceptingResponses: formData.acceptingResponses,
          formId: formData.id || formId, // Use formId from URL if formData.id is empty
          title: formData.title
        });
        const message = newPublishedStatus ? 'Form published!' : 'Form unpublished (draft)';
        console.log('togglePublishStatus - Alert message:', message, 'newPublishedStatus:', newPublishedStatus);
      } else {
        console.error('togglePublishStatus - API error:', data);
      }
    } catch (error) {
      console.error('Error toggling publish status:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleResponseAcceptance = async () => {
    if (!formData.published) {
      return;
    }

    setSaving(true);
    try {
      const newAcceptingStatus = !formData.acceptingResponses;
      console.log('toggleResponseAcceptance - Changing from:', formData.acceptingResponses, 'to:', newAcceptingStatus);
      
      const response = await fetch(`/api/forms/${formId}/toggle-responses`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ acceptingResponses: newAcceptingStatus }),
      });

      const data = await response.json();
      console.log('toggleResponseAcceptance - API response:', data);
      
      if (response.ok) {
        console.log('toggleResponseAcceptance - Updating form data to acceptingResponses:', newAcceptingStatus);
        setFormData(prev => ({ ...prev, acceptingResponses: newAcceptingStatus }));
        // Update navbar with new status
        navbarEvents.emit('formStatusUpdate', {
          published: formData.published,
          acceptingResponses: newAcceptingStatus,
          formId: formData.id || formId,
          title: formData.title
        });
        const message = newAcceptingStatus ? 'Now accepting responses!' : 'Stopped accepting responses';
      } else {
        console.error('toggleResponseAcceptance - API error:', data);
      }
    } catch (error) {
      console.error('Error toggling response acceptance:', error);
    } finally {
      setSaving(false);
    }
  };

  // Response functions
  const handleTabChange = (tab: 'questions' | 'responses' | 'settings') => {
    setActiveTab(tab);
    if (tab === 'responses') {
      // Always fetch latest responses when switching to responses tab
      fetchResponses();
      fetchResponseCount(); // Also update the response count
    }
  };

  const toggleResponseExpansion = (responseId: string) => {
    setExpandedResponse(expandedResponse === responseId ? null : responseId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const renderAnswer = (answer: Answer) => {
    if (answer.selectedOptions && answer.selectedOptions.length > 0) {
      return answer.selectedOptions.join(', ');
    }
    
    if (answer.answerText && answer.answerText.trim() !== '') {
      return answer.answerText;
    }
    
    return 'No answer provided';
  };

  // Show loading while auth is checking
  if (!isLoaded || loading) {
    return <LoadingSpinner message="Loading form..." />;
  }

  // Show sign in message only after auth is fully loaded
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please sign in to edit forms.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        
        {/* Google Forms Style Tab Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="flex justify-between items-center border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => handleTabChange('questions')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'questions'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Questions
              </button>
              <button
                onClick={() => handleTabChange('responses')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'responses'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Responses {responseCount > 0 && <span className="ml-1 bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">{responseCount}</span>}
              </button>
              <button
                onClick={() => handleTabChange('settings')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'settings'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Settings
              </button>
            </div>
            
            {/* Total Points Display */}
            {formSettings.isQuiz && getAllQuestions(formData.sections || []).length > 0 && (
              <div className="text-sm text-gray-600 px-6">
                Total points: {getAllQuestions(formData.sections || []).reduce((total: number, q: any) => total + (q.points || 1), 0)}
              </div>
            )}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'questions' && (
          <>
            {/* Form Status Indicator */}
            {isExistingForm && (
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    formData.published 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      formData.published ? 'bg-green-400' : 'bg-gray-400'
                    }`}></div>
                    {formData.published ? 'Published' : 'Draft'}
                  </div>
                  {formData.published && (
                    <div className="text-sm text-gray-600">
                      Public link: 
                      <span className="ml-1 text-blue-600 font-mono">
                        {typeof window !== 'undefined' ? `${window.location.origin}/forms/${formId}/view` : ''}
                      </span>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Form Header Card */}
            <div className="bg-white rounded-lg border border-gray-200 mb-6">
              <div className="h-3 bg-blue-600 rounded-t-lg"></div>
              <div className="p-8">
                <RichTextEditor
                  value={formData.title || ''}
                  onChange={(value) => updateFormTitle(value)}
                  placeholder="Untitled form"
                  className="w-full text-3xl font-normal text-gray-900 bg-transparent border-none outline-none focus:bg-gray-50 rounded px-2 py-1 -mx-2 transition-colors"
                  style={{ minHeight: '45px' }}
                />
                
                <RichTextEditor
                  value={formData.description || ''}
                  onChange={(value) => updateFormDescription(value)}
                  placeholder="Form description"
                  className="w-full mt-4 text-base text-gray-600 bg-transparent border-none outline-none focus:bg-gray-50 rounded px-2 py-1 -mx-2 resize-none transition-colors"
                  style={{ minHeight: '50px' }}
                />
              </div>
            </div>

            {/* Questions Section - Section-wise Display */}
            <div className="space-y-6">
              {formData.sections && formData.sections.length > 0 ? (
                formData.sections.map((section, sectionIndex) => (
                  <div key={section.id} className="space-y-0">
                    {/* Section Header - Simple and Clean */}
                    {formData.sections.length > 1 && (
                      <div className="mb-6 pb-4 border-b-2 border-blue-100">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                            Section {sectionIndex + 1}
                          </span>
                          <input
                            type="text"
                            value={section.title === `Section ${sectionIndex + 1}` ? '' : section.title}
                            onChange={(e) => {
                              const updatedSections = [...formData.sections];
                              updatedSections[sectionIndex] = {
                                ...updatedSections[sectionIndex],
                                title: e.target.value || `Section ${sectionIndex + 1}`
                              };
                              setFormData({ ...formData, sections: updatedSections });
                            }}
                            placeholder={`Section ${sectionIndex + 1} Title`}
                            className="text-lg font-medium text-gray-900 bg-transparent border-none outline-none focus:bg-gray-50 rounded px-3 py-1 transition-colors flex-1 placeholder-gray-400"
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Questions in this Section */}
                    {section.questions.map((question: any) => (
                      <QuestionCard
                        key={question.id}
                        id={question.id}
                        initialQuestion={question.text}
                        initialDescription={question.description || ""}
                        initialType={question.type}
                        initialRequired={question.required}
                        initialOptions={question.options || []}
                        initialShuffleOptionsOrder={question.shuffleOptionsOrder || false}
                        initialImageUrl={question.imageUrl || ""}
                        // Quiz props
                        isQuiz={formSettings.isQuiz}
                        initialPoints={question.points || 1}
                        initialCorrectAnswers={question.correctAnswers || []}
                        onDelete={() => deleteQuestion(question.id)}
                        onDuplicate={() => duplicateQuestion(question.id)}
                        onAddSectionAfter={() => addSectionAfter(question.id)}
                        onUpdate={(data) => {
                          // Update the question with new data - sections aware
                          const updatedSections = formData.sections.map(sec => ({
                            ...sec,
                            questions: sec.questions.map((q: any) =>
                              q.id === question.id
                                ? {
                                    ...q,
                                    text: data.question,
                                    description: data.description,
                                    type: data.type,
                                    required: data.required,
                                    shuffleOptionsOrder: data.shuffleOptionsOrder,
                                    imageUrl: data.imageUrl,
                                    options: data.options.map((opt: any, idx: number) => ({
                                      id: question.options[idx]?.id || `temp_${Date.now()}_${idx}`,
                                      text: opt.text,
                                      imageUrl: opt.imageUrl
                                    })),
                                    // Quiz fields
                                    points: data.points,
                                    correctAnswers: data.correctAnswers
                                  }
                                : q
                            )
                          }));
                          
                          setFormData({ ...formData, sections: updatedSections });
                        }}
                      />
                    ))}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No questions yet. Add your first question below.
                </div>
              )}

              {/* Add Question Buttons for Each Section */}
              {formData.sections && formData.sections.length > 0 && (
                <div className="mb-6">
                  {formData.sections.map((section, sectionIndex) => (
                    <div key={section.id} className="mb-4">
                      <button 
                        onClick={() => {
                          const newQuestion: Question = {
                            id: `temp_${Date.now()}`,
                            text: '',
                            type: 'SHORT_ANSWER',
                            required: formSettings.defaultRequired,
                            options: [],
                            imageUrl: ''
                          };
                          const updatedSections = addQuestionToSections(formData.sections || [], newQuestion, section.id);
                          setFormData({ ...formData, sections: updatedSections });
                        }}
                        className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>
                          {formData.sections.length > 1 
                            ? `Add Question to Section ${sectionIndex + 1}` 
                            : 'Add Question'
                          }
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Default Add Question Button for empty forms */}
              {(!formData.sections || formData.sections.length === 0) && (
                <div className="mb-6">
                  <button 
                    onClick={addQuestion}
                    className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add Question</span>
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <Link href="/" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                ← Back to Home
              </Link>
              
              {/* Save Button */}
              <button
                onClick={() => {
                  saveForm();
                }}
                disabled={saving || (!hasUnsavedChanges() && isExistingForm)}
                className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                  hasUnsavedChanges() || !isExistingForm
                    ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700' 
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {(() => {
                  const hasChanges = hasUnsavedChanges();
                  
                  if (saving) return 'Saving...';
                  if (hasChanges || !isExistingForm) {
                    return formData.published ? 'Save Changes' : 'Save Draft';
                  }
                  return 'No Changes';
                })()}
              </button>
            </div>
          </>
        )}

        {/* Responses Tab Content */}
        {activeTab === 'responses' && (
          <div>
            {/* Response Stats */}
            <div className="bg-white rounded-lg border border-gray-200 mb-6 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {formData.published && (
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600">Accepting responses:</span>
                      <button
                        onClick={toggleResponseAcceptance}
                        disabled={saving}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          formData.acceptingResponses ? 'bg-green-600' : 'bg-gray-300'
                        } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.acceptingResponses ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`text-sm font-medium ${
                        formData.acceptingResponses ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {formData.acceptingResponses ? 'On' : 'Off'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className="text-2xl font-bold text-blue-600">{responseCount}</div>
                      {loadingResponses && (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                      )}
                    </div>
                    <div className="text-lg font-medium text-gray-700">Total Response{responseCount === 1 ? '' : 's'}</div>
                  </div>
                  
                  {/* 3-dot menu for delete all responses */}
                  {responseCount > 0 && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === 'responses-menu' ? null : 'responses-menu');
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" />
                        </svg>
                      </button>
                      
                      {/* Dropdown Menu */}
                      {openMenuId === 'responses-menu' && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                          <div className="py-1">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                
                                if (confirm(`Are you sure you want to delete all ${responseCount} responses? This action cannot be undone.`)) {
                                  try {
                                    const response = await fetch(`/api/forms/${formId}/responses`, {
                                      method: 'DELETE'
                                    });
                                    
                                    if (response.ok) {
                                      // Update UI
                                      setResponseCount(0);
                                      setResponseData(null);
                                      // Refresh the responses data
                                      fetchResponses();
                                      fetchResponseCount();
                                    } else {
                                      alert('Failed to delete responses');
                                    }
                                  } catch (error) {
                                    console.error('Error deleting responses:', error);
                                    alert('Failed to delete responses');
                                  }
                                }
                              }}
                              className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Delete all responses</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Responses List */}
            {loadingResponses ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <LoadingSpinner message="Loading responses..." size="md" fullScreen={false} />
              </div>
            ) : responseCount === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No responses yet</h3>
                  <p className="text-gray-600 mb-6">Share your form to start collecting responses from users.</p>
                  <div className="space-y-3">
                    <div className="text-sm text-gray-500">Share your form:</div>
                    <div className="bg-gray-50 p-3 rounded-md text-sm font-mono text-gray-800 border break-all">
                      {typeof window !== 'undefined' ? `${window.location.origin}/forms/${formId}/view` : ''}
                    </div>
                    <button 
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          navigator.clipboard.writeText(`${window.location.origin}/forms/${formId}/view`);
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 2000);
                        }
                      }}
                      className={`text-sm font-medium transition-all duration-200 ${
                        linkCopied 
                          ? 'text-green-600 hover:text-green-700' 
                          : 'text-blue-600 hover:text-blue-800'
                      }`}
                    >
                      {linkCopied ? '✅ Copied!' : '📋 Copy Link'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              responseData && (
                <div className="space-y-4">
                  {responseData.responses.map((response, index) => (
                    <div key={response.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      
                      {/* Response Header */}
                      <div 
                        className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                        onClick={() => toggleResponseExpansion(response.id)}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">Response #{index + 1}</div>
                            <div className="text-sm text-gray-500">{formatDate(response.createdAt)}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">{response.answers.length} answer{response.answers.length === 1 ? '' : 's'}</span>
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${
                              expandedResponse === response.id ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Response Details */}
                      {expandedResponse === response.id && (
                        <div className="border-t border-gray-200 p-4 bg-gray-50">
                          <div className="space-y-4">
                            {response.answers.map((answer, answerIndex) => (
                              <div key={answerIndex} className="bg-white p-4 rounded-md border border-gray-200">
                                <div 
                                  className="text-sm font-medium text-gray-900 mb-2 [&_a]:text-blue-600 [&_a]:underline [&_a]:cursor-pointer"
                                  dangerouslySetInnerHTML={{ __html: answer.questionText }}
                                  onClick={(e) => {
                                    const target = e.target as HTMLElement;
                                    if (target.tagName === 'A') {
                                      e.preventDefault();
                                      window.open((target as HTMLAnchorElement).href, '_blank', 'noopener,noreferrer');
                                    }
                                  }}
                                />
                                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border">
                                  {renderAnswer(answer)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* Settings Tab Content */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            
            {/* New Form Notice */}
            {!isExistingForm && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-yellow-800 font-medium">New Form</span>
                </div>
                <p className="text-yellow-700 text-sm mt-2">
                  Please save your form first before configuring settings. Settings will be available after the form is created.
                </p>
              </div>
            )}

            {/* Form Settings */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Form Settings</h3>
              </div>

              <div className="space-y-6">
                
                {/* Question Settings */}
                <div className="space-y-4">
                  <h4 className="text-base font-medium text-gray-800 border-b border-gray-200 pb-2">
                    Question Settings
                  </h4>
                  
                  {/* Shuffle Questions */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">Randomize Question Order</label>
                      <p className="text-sm text-gray-500 mt-1">
                        Questions will appear in random order for each respondent. This helps reduce response bias and ensures fair distribution of attention across all questions.
                      </p>
                    </div>
                    <button
                      onClick={() => setFormSettings(prev => ({ ...prev, shuffleQuestions: !prev.shuffleQuestions }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formSettings.shuffleQuestions ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formSettings.shuffleQuestions ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Show Progress */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">Show Progress Bar</label>
                      <p className="text-sm text-gray-500 mt-1">
                        Display progress indicator to respondents
                      </p>
                    </div>
                    <button
                      onClick={() => setFormSettings(prev => ({ ...prev, showProgress: !prev.showProgress }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formSettings.showProgress ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formSettings.showProgress ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Make Questions Required by Default */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">Make Questions Required by Default</label>
                      <p className="text-sm text-gray-500 mt-1">
                        New questions will be marked as required automatically. You can still make individual questions optional later.
                      </p>
                    </div>
                    <button
                      onClick={() => setFormSettings(prev => ({ ...prev, defaultRequired: !prev.defaultRequired }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formSettings.defaultRequired ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formSettings.defaultRequired ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Response Settings */}
                <div className="space-y-4">
                  <h4 className="text-base font-medium text-gray-800 border-b border-gray-200 pb-2">
                    Response Settings
                  </h4>
                  
                  {/* Collect Email */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">Collect Email Addresses</label>
                      <p className="text-sm text-gray-500 mt-1">
                        Require respondents to provide their email address
                      </p>
                    </div>
                    <button
                      onClick={() => setFormSettings(prev => ({ ...prev, collectEmail: !prev.collectEmail }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formSettings.collectEmail ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formSettings.collectEmail ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Multiple Responses */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">Allow Multiple Responses</label>
                      <p className="text-sm text-gray-500 mt-1">
                        Users can submit multiple responses to this form
                      </p>
                    </div>
                    <button
                      onClick={() => setFormSettings(prev => ({ ...prev, allowMultipleResponses: !prev.allowMultipleResponses }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formSettings.allowMultipleResponses ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formSettings.allowMultipleResponses ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Response Editing - Only show if NOT a quiz */}
                  {!formSettings.isQuiz && (
                    <>
                      {/* Allow response editing toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-700">Allow response editing</label>
                          <p className="text-sm text-gray-500 mt-1">
                            Let users modify their responses after submission
                          </p>
                        </div>
                        <button
                          onClick={() => setFormSettings(prev => ({ ...prev, allowResponseEditing: !prev.allowResponseEditing }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            formSettings.allowResponseEditing ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formSettings.allowResponseEditing ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Edit time limit - only show when response editing is enabled */}
                      {formSettings.allowResponseEditing && (
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <label className="text-sm font-medium text-gray-700">Edit time limit</label>
                            <p className="text-sm text-gray-500 mt-1">
                              How long users can edit their responses
                            </p>
                          </div>
                          <select
                            value={formSettings.editTimeLimit}
                            onChange={(e) => setFormSettings(prev => ({ ...prev, editTimeLimit: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-[120px]"
                          >
                            <option value="24h">24 Hours</option>
                            <option value="7d">7 Days</option>
                            <option value="30d">30 Days</option>
                            <option value="always">Always</option>
                          </select>
                        </div>
                      )}
                    </>
                  )}

                  {/* Quiz mode restriction notice - only show when quiz is enabled */}
                  {formSettings.isQuiz && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-orange-800 text-sm font-medium">Quiz Mode Active</span>
                      </div>
                      <p className="text-orange-700 text-sm mt-1">
                        Response editing is automatically disabled in quiz mode to maintain academic integrity.
                      </p>
                    </div>
                  )}

                </div>

                {/* Quiz Settings */}
                <div className="space-y-4">
                  <h4 className="text-base font-medium text-gray-800 border-b border-gray-200 pb-2">
                    Quiz Settings
                  </h4>
                  
                  {/* Make this a quiz */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">Make this a quiz</label>
                      <p className="text-sm text-gray-500 mt-1">
                        Collect and grade responses with automatic scoring
                      </p>
                    </div>
                    <button
                      onClick={() => setFormSettings(prev => ({ ...prev, isQuiz: !prev.isQuiz }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formSettings.isQuiz ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formSettings.isQuiz ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Quiz-specific options (only show when quiz is enabled) */}
                  {formSettings.isQuiz && (
                    <>
                      {/* Release grades immediately */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-700">Release grades immediately</label>
                          <p className="text-sm text-gray-500 mt-1">
                            Show quiz results right after submission
                          </p>
                        </div>
                        <button
                          onClick={() => setFormSettings(prev => ({ ...prev, releaseGrades: !prev.releaseGrades }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            formSettings.releaseGrades ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formSettings.releaseGrades ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Show correct answers */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-700">Show correct answers</label>
                          <p className="text-sm text-gray-500 mt-1">
                            Display correct answers after quiz submission
                          </p>
                        </div>
                        <button
                          onClick={() => setFormSettings(prev => ({ ...prev, showCorrectAnswers: !prev.showCorrectAnswers }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            formSettings.showCorrectAnswers ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formSettings.showCorrectAnswers ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Confirmation Message */}
                <div className="space-y-4">
                  <h4 className="text-base font-medium text-gray-800 border-b border-gray-200 pb-2">
                    Confirmation Message
                  </h4>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Message shown after form submission
                    </label>
                    <textarea
                      value={formSettings.confirmationMessage}
                      onChange={(e) => setFormSettings(prev => ({ ...prev, confirmationMessage: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      rows={3}
                      placeholder="Enter confirmation message..."
                    />
                  </div>
                </div>

              </div>

              {/* Save Settings Button */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex justify-end">
                  <button
                    onClick={async () => {
                      if (!isExistingForm) {
                        return;
                      }
                      
                      setSaving(true);
                      try {
                        const response = await fetch(`/api/forms/${formId}/settings`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify(formSettings),
                        });

                        const data = await response.json();
                        
                        if (data.success) {
                          // Update the form data with new settings to keep everything in sync
                          setFormData(prev => ({
                            ...prev,
                            ...data.settings
                          }));
                          // Update original settings to reflect saved state
                          setOriginalSettings(formSettings);
                        } else {
                        }
                      } catch (error) {
                        console.error('Error saving settings:', error);
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving || !isExistingForm || !hasUnsavedSettingsChanges()}
                    className={`px-4 py-2 text-white text-sm font-medium rounded-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                      hasUnsavedSettingsChanges() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'
                    }`}
                  >
                    {saving ? 'Saving...' : hasUnsavedSettingsChanges() ? 'Save Settings' : 'No Changes'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}