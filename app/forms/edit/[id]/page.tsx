'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

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

export default function EditForm() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, userId } = useAuth();
  const formId = params.id as string;

  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch form data
  useEffect(() => {
    if (isSignedIn && formId) {
      fetchFormData();
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

  const updateFormTitle = (title: string) => {
    if (formData) {
      setFormData({ ...formData, title });
    }
  };

  const updateFormDescription = (description: string) => {
    if (formData) {
      setFormData({ ...formData, description });
    }
  };

  const updateQuestion = (questionId: string, field: string, value: any) => {
    if (formData) {
      const updatedQuestions = formData.questions.map(q => 
        q.id === questionId ? { ...q, [field]: value } : q
      );
      setFormData({ ...formData, questions: updatedQuestions });
    }
  };

  const addQuestion = () => {
    if (formData) {
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
    }
  };

  const removeQuestion = (questionId: string) => {
    if (formData) {
      const updatedQuestions = formData.questions.filter(q => q.id !== questionId);
      setFormData({ ...formData, questions: updatedQuestions });
    }
  };

  const addOption = (questionId: string) => {
    if (formData) {
      const updatedQuestions = formData.questions.map(q => 
        q.id === questionId 
          ? { ...q, options: [...q.options, { id: `temp_${Date.now()}`, text: '' }] }
          : q
      );
      setFormData({ ...formData, questions: updatedQuestions });
    }
  };

  const updateOption = (questionId: string, optionId: string, text: string) => {
    if (formData) {
      const updatedQuestions = formData.questions.map(q => 
        q.id === questionId 
          ? { 
              ...q, 
              options: q.options.map(opt => 
                opt.id === optionId ? { ...opt, text } : opt
              )
            }
          : q
      );
      setFormData({ ...formData, questions: updatedQuestions });
    }
  };

  const removeOption = (questionId: string, optionId: string) => {
    if (formData) {
      const updatedQuestions = formData.questions.map(q => 
        q.id === questionId 
          ? { ...q, options: q.options.filter(opt => opt.id !== optionId) }
          : q
      );
      setFormData({ ...formData, questions: updatedQuestions });
    }
  };

  const saveForm = async () => {
    if (!formData) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/forms/update/${formId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Form updated successfully!');
        router.push('/');
      } else {
        alert('Error updating form: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving form:', error);
      alert('Error saving form');
    } finally {
      setSaving(false);
    }
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

  if (!formData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Form not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-blue-600 hover:text-blue-700">
                ← Back to Forms
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Edit Form</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={saveForm}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Form'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        
        {/* Blue header line */}
        <div className="h-3 bg-blue-600 rounded-t-lg"></div>
        
        {/* Form Title Section */}
        <div className="bg-white rounded-b-lg p-6 border-l-4 border-blue-600 mb-6 shadow-sm">
          <input
            type="text"
            value={formData.title}
            onChange={(e) => updateFormTitle(e.target.value)}
            placeholder="Form title"
            className="text-2xl font-normal text-gray-900 w-full border-none outline-none bg-transparent mb-3"
          />
          <textarea
            value={formData.description}
            onChange={(e) => updateFormDescription(e.target.value)}
            placeholder="Form description (optional)"
            className="text-gray-600 w-full border-none outline-none bg-transparent resize-none"
            rows={2}
          />
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {formData.questions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              
              {/* Question Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={question.text}
                    onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                    placeholder="Question"
                    className="text-lg font-medium text-gray-800 w-full border-none outline-none bg-transparent"
                  />
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <select
                    value={question.type}
                    onChange={(e) => updateQuestion(question.id, 'type', e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="SHORT_ANSWER">Short Answer</option>
                    <option value="PARAGRAPH">Paragraph</option>
                    <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                    <option value="CHECKBOXES">Checkboxes</option>
                  </select>
                  <button
                    onClick={() => removeQuestion(question.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Delete question"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Question Content Based on Type */}
              {question.type === 'SHORT_ANSWER' && (
                <div className="border-b border-gray-300 pb-2 w-1/2">
                  <span className="text-gray-400">Short answer text</span>
                </div>
              )}

              {question.type === 'PARAGRAPH' && (
                <div className="border border-gray-300 rounded p-3 w-full h-20">
                  <span className="text-gray-400">Long answer text</span>
                </div>
              )}

              {(question.type === 'MULTIPLE_CHOICE' || question.type === 'CHECKBOXES') && (
                <div className="space-y-3">
                  {question.options.map((option, optionIndex) => (
                    <div key={option.id} className="flex items-center space-x-3">
                      <div className={`w-4 h-4 border-2 border-gray-400 ${
                        question.type === 'MULTIPLE_CHOICE' ? 'rounded-full' : 'rounded'
                      }`}></div>
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => updateOption(question.id, option.id, e.target.value)}
                        placeholder={`Option ${optionIndex + 1}`}
                        className="flex-1 border-none outline-none bg-transparent"
                      />
                      <button
                        onClick={() => removeOption(question.id, option.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addOption(question.id)}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add option</span>
                  </button>
                </div>
              )}

              {/* Required Toggle */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={question.required}
                    onChange={(e) => updateQuestion(question.id, 'required', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Required</span>
                </label>
              </div>
            </div>
          ))}

          {/* Add Question Button */}
          <button
            onClick={addQuestion}
            className="w-full bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Question</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}