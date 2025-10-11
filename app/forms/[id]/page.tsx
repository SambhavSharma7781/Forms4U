'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';

import LoadingSpinner from '@/components/LoadingSpinner';
import QuestionCard from '@/components/QuestionCard';
import { navbarEvents } from '@/components/Navbar';

interface Question {
  id: string;
  text: string;
  type: 'SHORT_ANSWER' | 'PARAGRAPH' | 'MULTIPLE_CHOICE' | 'CHECKBOXES';
  required: boolean;
  options: { id: string; text: string; }[];
}

interface FormData {
  id: string;
  title: string;
  description: string;
  published: boolean;
  acceptingResponses: boolean;
  questions: Question[];
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
    questions: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Tab system states - Google Forms style
  const [activeTab, setActiveTab] = useState<'questions' | 'responses'>('questions');
  const [responseData, setResponseData] = useState<ResponseData | null>(null);
  const [responseCount, setResponseCount] = useState(0);
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);

  // Track original form data to detect changes
  const [originalFormData, setOriginalFormData] = useState<FormData | null>(null);

  // Check if this is an existing form or new form
  const isExistingForm = formId !== 'create';

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
      console.log('Form page sending status update:', JSON.stringify({
        published: formData.published,
        acceptingResponses: formData.acceptingResponses,
        formId: formData.id,
        title: formData.title,
        loading: loading,
        isExistingForm: isExistingForm
      }));
      navbarEvents.emit('formStatusUpdate', {
        published: formData.published,
        acceptingResponses: formData.acceptingResponses,
        formId: formData.id,
        title: formData.title
      });
    } else {
      console.log('Form page NOT sending status update because:', JSON.stringify({
        hasId: !!formData.id,
        isExistingForm: isExistingForm,
        loading: loading,
        published: formData.published,
        publishedUndefined: formData.published === undefined
      }));
    }
  }, [formData.published, formData.acceptingResponses, formData.id, formData.title, isExistingForm, loading]);



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
        // Update navbar with form status
        navbarEvents.emit('formStatusUpdate', {
          published: data.form.published,
          formId: data.form.id,
          title: data.form.title
        });
      } else {
        alert('Form not found or access denied');
        router.push('/');
      }
    } catch (error) {
      console.error('Error fetching form:', error);
      alert('Error loading form');
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
      console.error('Error fetching response count:', error);
    }
  };

  const fetchResponses = async () => {
    try {
      const response = await fetch(`/api/forms/${formId}/responses`);
      const data = await response.json();
      
      if (data.success) {
        setResponseData(data);
      } else {
        console.error('Error fetching responses:', data.error);
      }
    } catch (error) {
      console.error('Error fetching responses:', error);
    }
  };

  // Check if form has unsaved changes
  const hasUnsavedChanges = () => {
    if (!originalFormData) return false;
    
    // Compare title and description
    if (formData.title !== originalFormData.title || 
        formData.description !== originalFormData.description) {
      return true;
    }
    
    // Compare questions count
    if (formData.questions.length !== originalFormData.questions.length) {
      return true;
    }
    
    // Compare each question
    for (let i = 0; i < formData.questions.length; i++) {
      const currentQ = formData.questions[i];
      const originalQ = originalFormData.questions[i];
      
      if (!originalQ) return true; // New question
      
      if (currentQ.text !== originalQ.text ||
          currentQ.type !== originalQ.type ||
          currentQ.required !== originalQ.required) {
        return true;
      }
      
      // Compare options for questions that have them
      if (currentQ.options && originalQ.options) {
        if (currentQ.options.length !== originalQ.options.length) {
          return true;
        }
        
        for (let j = 0; j < currentQ.options.length; j++) {
          if (currentQ.options[j].text !== originalQ.options[j].text) {
            return true;
          }
        }
      } else if (currentQ.options?.length !== originalQ.options?.length) {
        return true;
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
    const updatedQuestions = formData.questions.map((q: any) => 
      q.id === questionId ? { ...q, [field]: value } : q
    );
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `temp_${Date.now()}`,
      text: '',
      type: 'SHORT_ANSWER',
      required: false,
      options: []
    };
    setFormData({
      ...formData,
      questions: [...formData.questions, newQuestion]
    });
  };

  const deleteQuestion = (questionId: string) => {
    const updatedQuestions = formData.questions.filter((q: any) => q.id !== questionId);
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const duplicateQuestion = (questionId: string) => {
    const questionToDuplicate = formData.questions.find((q: any) => q.id === questionId);
    if (questionToDuplicate) {
      const duplicatedQuestion = {
        ...questionToDuplicate,
        id: `temp_${Date.now()}`,
        options: questionToDuplicate.options.map((opt: any) => ({
          ...opt,
          id: `temp_${Date.now()}_${Math.random()}`
        }))
      };
      setFormData({
        ...formData,
        questions: [...formData.questions, duplicatedQuestion]
      });
    }
  };

  const addOption = (questionId: string) => {
    const updatedQuestions = formData.questions.map((q: any) =>
      q.id === questionId
        ? { ...q, options: [...q.options, { id: `temp_${Date.now()}`, text: '' }] }
        : q
    );
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const removeOption = (questionId: string, optionId: string) => {
    const updatedQuestions = formData.questions.map((q: any) =>
      q.id === questionId
        ? { ...q, options: q.options.filter((opt: any) => opt.id !== optionId) }
        : q
    );
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const saveForm = async (forcePublished?: boolean) => {
    if (!formData.title.trim()) {
      alert('Please add a form title');
      return;
    }

    setSaving(true);
    try {
      // For existing forms, preserve current published status unless explicitly specified
      // For new forms, use the forcePublished parameter or default to false
      const publishedStatus = isExistingForm 
        ? (forcePublished !== undefined ? forcePublished : formData.published)
        : (forcePublished !== undefined ? forcePublished : false);
      
      // Create payload with correct published status
      const payload = { ...formData, published: publishedStatus };
      
      const url = isExistingForm ? `/api/forms/update/${formId}` : '/api/forms/create';
      const method = isExistingForm ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        // Update local state
        const updatedFormData = { ...formData, published: publishedStatus };
        setFormData(updatedFormData);
        setOriginalFormData(updatedFormData); // Update original data to reflect saved state
        
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
        alert(message);
        
        if (!isExistingForm) {
          router.push('/');
        }
      } else {
        alert('Error saving form: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving form:', error);
      alert('Error saving form');
    } finally {
      setSaving(false);
    }
  };



  const togglePublishStatus = async () => {
    if (!isExistingForm) {
      alert('Please save the form first');
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
        alert(message);
      } else {
        console.error('togglePublishStatus - API error:', data);
        alert('Error updating publish status: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error toggling publish status:', error);
      alert('Error updating publish status');
    } finally {
      setSaving(false);
    }
  };

  const toggleResponseAcceptance = async () => {
    if (!formData.published) {
      alert('Form must be published first');
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
        alert(message);
      } else {
        console.error('toggleResponseAcceptance - API error:', data);
        alert('Error updating response status: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error toggling response acceptance:', error);
      alert('Error updating response status');
    } finally {
      setSaving(false);
    }
  };

  // Response functions
  const handleTabChange = (tab: 'questions' | 'responses') => {
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        
        {/* Google Forms Style Tab Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
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
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateFormTitle(e.target.value)}
                  className="w-full text-3xl font-normal text-gray-900 bg-transparent border-none outline-none focus:bg-gray-50 rounded px-2 py-1 -mx-2 transition-colors"
                  placeholder="Untitled form"
                />
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormDescription(e.target.value)}
                  placeholder="Form description"
                  rows={2}
                  className="w-full mt-4 text-base text-gray-600 bg-transparent border-none outline-none focus:bg-gray-50 rounded px-2 py-1 -mx-2 resize-none transition-colors"
                />
              </div>
            </div>

            {/* Questions Section - Using Original QuestionCard */}
            <div className="space-y-0">
              {formData.questions.map((question: any, index: number) => (
                <QuestionCard
                  key={question.id}
                  id={question.id}
                  initialQuestion={question.text}
                  initialType={question.type}
                  initialRequired={question.required}
                  initialOptions={question.options?.map((opt: any) => opt.text) || []}
                  onDelete={() => deleteQuestion(question.id)}
                  onDuplicate={() => duplicateQuestion(question.id)}
                  onUpdate={(data) => {
                    // Update the question with new data
                    const updatedQuestions = formData.questions.map((q: any) =>
                      q.id === question.id
                        ? {
                            ...q,
                            text: data.question,
                            type: data.type,
                            required: data.required,
                            options: data.options.map((optText: string, idx: number) => ({
                              id: question.options[idx]?.id || `temp_${Date.now()}_${idx}`,
                              text: optText
                            }))
                          }
                        : q
                    );
                    setFormData({ ...formData, questions: updatedQuestions });
                  }}
                />
              ))}

              {/* Add Question Button */}
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
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <Link href="/" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                ← Back to Home
              </Link>
              
              {/* Save Button */}
              <button
                onClick={() => saveForm()} // No parameter - will preserve current published status
                disabled={saving || (!hasUnsavedChanges() && isExistingForm)}
                className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                  hasUnsavedChanges() || !isExistingForm
                    ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700' 
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {saving 
                  ? 'Saving...' 
                  : hasUnsavedChanges() || !isExistingForm
                    ? (formData.published ? 'Save Changes' : 'Save Draft')
                    : 'No Changes'
                }
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
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Form Responses</h2>
                  <p className="text-gray-600 mt-1">Submitted responses for "{formData.title}"</p>
                </div>
                <div className="flex items-center space-x-6">
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
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{responseCount}</div>
                    <div className="text-sm text-gray-500">Response{responseCount === 1 ? '' : 's'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Responses List */}
            {responseCount === 0 ? (
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
                          alert('Link copied to clipboard!');
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      📋 Copy Link
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
                                <div className="text-sm font-medium text-gray-900 mb-2">
                                  {answer.questionText}
                                </div>
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

      </div>
    </div>
  );
}