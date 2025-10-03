'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { ToggleLeft, ToggleRight } from "lucide-react";
import LoadingSpinner from '@/components/LoadingSpinner';
import QuestionCard from '@/components/QuestionCard';

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
  const { isSignedIn } = useAuth();
  const formId = params.id as string;

  // Form editing states
  const [formData, setFormData] = useState<FormData>({
    id: '',
    title: 'Untitled form',
    description: '',
    questions: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Tab system states - Google Forms style
  const [activeTab, setActiveTab] = useState<'questions' | 'responses'>('questions');
  const [responseData, setResponseData] = useState<ResponseData | null>(null);
  const [responseCount, setResponseCount] = useState(0);
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);

  // Check if this is an existing form or new form
  const isExistingForm = formId !== 'create';

  // Fetch existing form data if editing
  useEffect(() => {
    if (isSignedIn) {
      if (isExistingForm) {
        fetchFormData();
        fetchResponseCount();
      } else {
        // New form - start fresh
        setLoading(false);
      }
    }
  }, [isSignedIn, formId]);

  const fetchFormData = async () => {
    try {
      const response = await fetch(`/api/forms/${formId}`);
      const data = await response.json();
      
      if (data.success) {
        setFormData(data.form);
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

  const saveForm = async () => {
    if (!formData.title.trim()) {
      alert('Please add a form title');
      return;
    }

    setSaving(true);
    try {
      const url = isExistingForm ? `/api/forms/update/${formId}` : '/api/forms/create';
      const method = isExistingForm ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Form saved successfully!');
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

  // Response functions
  const handleTabChange = (tab: 'questions' | 'responses') => {
    setActiveTab(tab);
    if (tab === 'responses' && !responseData) {
      fetchResponses();
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
    return answer.answerText || 'No answer';
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please sign in to edit forms.</p>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading form..." />;
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
              <button
                onClick={addQuestion}
                className="w-full bg-white border border-dashed border-gray-300 rounded-lg p-8 text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors mb-6"
              >
                + Add Question
              </button>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Link href="/" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                ← Back to Home
              </Link>
              <button
                onClick={saveForm}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Draft'}
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
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{responseCount}</div>
                  <div className="text-sm text-gray-500">Response{responseCount === 1 ? '' : 's'}</div>
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
                    <div className="bg-gray-50 p-3 rounded-md text-sm font-mono text-gray-800 border">
                      {typeof window !== 'undefined' ? `${window.location.origin}/forms/${formId}/view` : ''}
                    </div>
                    <button 
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          navigator.clipboard.writeText(`${window.location.origin}/forms/${formId}/view`);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
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