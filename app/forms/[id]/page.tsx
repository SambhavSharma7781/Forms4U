'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { ToggleLeft, ToggleRight } from "lucide-react";

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

export default function Form() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const formId = params.id as string;

  const [formData, setFormData] = useState<FormData>({
    id: '',
    title: 'Untitled form',
    description: '',
    questions: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Check if this is an existing form or new form
  const isExistingForm = formId !== 'create';

  // Fetch existing form data if editing
  useEffect(() => {
    if (isSignedIn) {
      if (isExistingForm) {
        fetchFormData();
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

  const updateFormTitle = (title: string) => {
    setFormData({ ...formData, title });
  };

  const updateFormDescription = (description: string) => {
    setFormData({ ...formData, description });
  };

  const updateQuestion = (questionId: string, field: string, value: any) => {
    const updatedQuestions = formData.questions.map(q => 
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

  const removeQuestion = (questionId: string) => {
    const updatedQuestions = formData.questions.filter(q => q.id !== questionId);
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const addOption = (questionId: string) => {
    const updatedQuestions = formData.questions.map(q => 
      q.id === questionId 
        ? { ...q, options: [...q.options, { id: `temp_${Date.now()}`, text: '' }] }
        : q
    );
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const updateOption = (questionId: string, optionId: string, text: string) => {
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
  };

  const removeOption = (questionId: string, optionId: string) => {
    const updatedQuestions = formData.questions.map(q => 
      q.id === questionId 
        ? { ...q, options: q.options.filter(opt => opt.id !== optionId) }
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
      let response;
      
      if (isExistingForm) {
        // Update existing form
        response = await fetch(`/api/forms/update/${formId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      } else {
        // Create new form
        response = await fetch('/api/forms/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      }

      const data = await response.json();
      
      if (data.success) {
        alert(`Form ${isExistingForm ? 'updated' : 'created'} successfully!`);
        router.push('/');
      } else {
        alert(`Error ${isExistingForm ? 'updating' : 'creating'} form: ` + data.error);
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
        <p>Please sign in to access forms.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
          <p className="text-gray-500 mt-4">Loading form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Form Content - Exactly like create form */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        
        {/* Form Header Card - Same as create form */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          {/* Blue header bar */}
          <div className="h-3 bg-blue-600 rounded-t-lg"></div>
          
          {/* Form header content */}
          <div className="p-8">
            {/* Form title - Google Forms style */}
            <input
              type="text"
              value={formData.title}
              onChange={(e) => updateFormTitle(e.target.value)}
              className="w-full text-3xl font-normal text-gray-900 bg-transparent border-none outline-none focus:bg-gray-50 rounded px-2 py-1 -mx-2 transition-colors"
              placeholder="Untitled form"
            />
            
            {/* Form description */}
            <textarea
              value={formData.description}
              onChange={(e) => updateFormDescription(e.target.value)}
              placeholder="Form description"
              rows={2}
              className="w-full mt-4 text-base text-gray-600 bg-transparent border-none outline-none focus:bg-gray-50 rounded px-2 py-1 -mx-2 resize-none transition-colors"
            />
          </div>
        </div>

        {/* Questions Section - Same as create form */}
        <div className="space-y-0">
          {formData.questions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-lg border border-gray-200 mb-6 group hover:shadow-sm transition-shadow">
              {/* Blue left border - Google Forms style */}
              <div className="border-l-4 border-blue-600">
                <div className="p-6">
                
                {/* Question Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={question.text}
                      onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                      placeholder="Question"
                      className="text-lg font-medium text-gray-800 w-full border-none outline-none bg-transparent focus:bg-gray-50 rounded px-2 py-1 -mx-2 transition-colors"
                    />
                  </div>
                  
                  {/* Question Type Dropdown */}
                  <div className="ml-4">
                    <select
                      value={question.type}
                      onChange={(e) => updateQuestion(question.id, 'type', e.target.value)}
                      className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="SHORT_ANSWER">Short Answer</option>
                      <option value="PARAGRAPH">Paragraph</option>
                      <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                      <option value="CHECKBOXES">Checkboxes</option>
                    </select>
                  </div>
                </div>

                {/* Question Content Based on Type */}
                {question.type === 'SHORT_ANSWER' && (
                  <div className="mt-6">
                    <input
                      type="text"
                      placeholder="Short answer text"
                      disabled
                      className="w-full border-b border-gray-300 pb-2 text-gray-400 text-sm bg-transparent outline-none"
                    />
                  </div>
                )}

                {question.type === 'PARAGRAPH' && (
                  <div className="mt-6">
                    <textarea
                      placeholder="Long answer text"
                      disabled
                      rows={3}
                      className="w-full border border-gray-300 rounded p-3 text-gray-400 text-sm bg-transparent outline-none resize-none"
                    />
                  </div>
                )}

                {question.type === 'MULTIPLE_CHOICE' && (
                  <div className="mt-6 space-y-3">
                    {question.options.map((option, optionIndex) => (
                      <div key={option.id} className="flex items-center space-x-3">
                        <div className="w-4 h-4 border-2 border-gray-400 rounded-full"></div>
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => updateOption(question.id, option.id, e.target.value)}
                          placeholder={`Option ${optionIndex + 1}`}
                          className="flex-1 border-b border-gray-300 pb-1 outline-none focus:border-blue-500"
                        />
                        {question.options.length > 1 && (
                          <button
                            onClick={() => removeOption(question.id, option.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addOption(question.id)}
                      className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Add option</span>
                    </button>
                  </div>
                )}

                {question.type === 'CHECKBOXES' && (
                  <div className="mt-6 space-y-3">
                    {question.options.map((option, optionIndex) => (
                      <div key={option.id} className="flex items-center space-x-3">
                        <div className="w-4 h-4 border-2 border-gray-400 rounded"></div>
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => updateOption(question.id, option.id, e.target.value)}
                          placeholder={`Option ${optionIndex + 1}`}
                          className="flex-1 border-b border-gray-300 pb-1 outline-none focus:border-blue-500"
                        />
                        {question.options.length > 1 && (
                          <button
                            onClick={() => removeOption(question.id, option.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addOption(question.id)}
                      className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Add option</span>
                    </button>
                  </div>
                )}

                {/* Bottom toolbar - Same as QuestionCard */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    {/* Action buttons */}
                    <button
                      onClick={() => {
                        // Duplicate question logic
                        const newQuestion = {
                          ...question,
                          id: `temp_${Date.now()}`,
                          text: question.text + ' (copy)'
                        };
                        setFormData({
                          ...formData,
                          questions: [...formData.questions, newQuestion]
                        });
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                      title="Duplicate"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button> 
                    
                    <button
                      onClick={() => removeQuestion(question.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    
                    <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Required toggle - Same as QuestionCard */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Required</span>
                    <button
                      onClick={() => updateQuestion(question.id, 'required', !question.required)}
                      className={`transition-colors ${question.required ? 'text-blue-600' : 'text-gray-400'}`}
                    >
                      {question.required ? <ToggleRight className="w-8 h-5" /> : <ToggleLeft className="w-8 h-5" />}
                    </button>
                  </div>
                </div>
                
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Question Button - Same as create form */}
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

        {/* Actions - Same as create form */}
        <div className="flex justify-between">
          <Link href="/" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
            ← Back to Home
          </Link>
          <div>
            <button
              onClick={saveForm}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}