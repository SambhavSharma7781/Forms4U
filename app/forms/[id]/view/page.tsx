'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/LoadingSpinner';

// Types
interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  type: 'SHORT_ANSWER' | 'PARAGRAPH' | 'MULTIPLE_CHOICE' | 'CHECKBOXES' | 'DROPDOWN';
  required: boolean;
  options: Option[];
}

interface FormData {
  id: string;
  title: string;
  description: string;
  acceptingResponses: boolean;
  questions: Question[];
}

// Response data type
interface FormResponse {
  [questionId: string]: string | string[]; // string for single answer, string[] for checkboxes
}

export default function PublicFormView() {
  const params = useParams();
  const formId = params.id as string;
  
  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [responses, setResponses] = useState<FormResponse>({});
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [notFound, setNotFound] = useState(false);

  // Fetch form data on component mount
  useEffect(() => {
    fetchFormData();
  }, [formId]);

  const fetchFormData = async () => {
    try {
      const response = await fetch(`/api/forms/${formId}/public`);
      const data = await response.json();
      
      if (data.success) {
        setFormData(data.form);
      } else {
        // Form is either not published or doesn't exist
        setNotFound(true);
      }
    } catch (error) {
      // Network or other error occurred
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (questionId: string, value: string | string[]) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    // Clear error when user starts typing
    if (errors[questionId]) {
      setErrors(prev => ({
        ...prev,
        [questionId]: ''
      }));
    }
  };

  // Validate form before submission
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    // Check if user has provided any responses at all
    const hasAnyResponses = Object.keys(responses).length > 0 && 
                           Object.values(responses).some(response => {
                             if (typeof response === 'string') {
                               return response.trim() !== '';
                             } else if (Array.isArray(response)) {
                               return response.length > 0;
                             }
                             return false;
                           });

    if (!hasAnyResponses) {
      alert('Please provide at least one response before submitting the form.');
      return false;
    }
    
    // Check required fields
    formData?.questions.forEach(question => {
      if (question.required) {
        const response = responses[question.id];
        if (!response || 
            (typeof response === 'string' && response.trim() === '') ||
            (Array.isArray(response) && response.length === 0)) {
          newErrors[question.id] = 'This field is required';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      // Submit responses to API
      const response = await fetch(`/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          responses: responses
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setSubmitted(true);
      } else {
        console.error('Submission error:', result.error);
        alert('Error submitting form: ' + result.error);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error submitting form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle clear form
  const handleClearForm = () => {
    // Check if there are any responses to clear
    const hasResponses = Object.keys(responses).length > 0 && 
                        Object.values(responses).some(response => {
                          if (typeof response === 'string') {
                            return response.trim() !== '';
                          } else if (Array.isArray(response)) {
                            return response.length > 0;
                          }
                          return false;
                        });

    if (!hasResponses) {
      alert('Please fill the form first before clearing the form.');
      return;
    }

    if (confirm('Are you sure you want to clear all responses?')) {
      setResponses({});
      setErrors({});
    }
  };

  // Render question based on type
  const renderQuestion = (question: Question) => {
    const response = responses[question.id];
    const hasError = errors[question.id];

    switch (question.type) {
      case 'SHORT_ANSWER':
        return (
          <input
            type="text"
            value={response as string || ''}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Your answer"
          />
        );

      case 'PARAGRAPH':
        return (
          <textarea
            value={response as string || ''}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[100px] ${
              hasError ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Your answer"
          />
        );

      case 'MULTIPLE_CHOICE':
        return (
          <div className="space-y-2">
            {question.options.map((option) => (
              <label key={option.id} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={question.id}
                  value={option.text}
                  checked={response === option.text}
                  onChange={(e) => handleInputChange(question.id, e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        );

      case 'CHECKBOXES':
        return (
          <div className="space-y-2">
            {question.options.map((option) => (
              <label key={option.id} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(response as string[] || []).includes(option.text)}
                  onChange={(e) => {
                    const currentResponses = response as string[] || [];
                    if (e.target.checked) {
                      handleInputChange(question.id, [...currentResponses, option.text]);
                    } else {
                      handleInputChange(question.id, currentResponses.filter(r => r !== option.text));
                    }
                  }}
                  className="w-4 h-4 text-blue-600"
                />
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        );

      case 'DROPDOWN':
        return (
          <select
            value={response as string || ''}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Choose</option>
            {question.options.map((option) => (
              <option key={option.id} value={option.text}>
                {option.text}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  // Loading state
  if (loading) {
    return <LoadingSpinner message="Loading form..." />;
  }

  // Form not found or not published
  if (notFound || !formData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Form Not Available</h1>
          <p className="text-gray-600 mb-4">This form is not published or doesn't exist.</p>
          <p className="text-sm text-gray-500">Please check the URL or contact the form owner.</p>
        </div>
      </div>
    );
  }

  // Form not found
  if (!formData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Form Not Found</h2>
          <p className="text-gray-600">The form you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto py-8 px-4">
          <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
            <div className="h-2 bg-blue-600"></div>
            <div className="p-6 text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">{formData?.title}</h1>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Your response has been submitted</h2>
              <p className="text-gray-600">Thank you for filling out this form.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main form view
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Not Accepting Responses Message */}
        {!formData.acceptingResponses ? (
          <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
            <div className="h-2 bg-blue-600"></div>
            <div className="p-6 text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">{formData.title}</h1>
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">This form is no longer accepting responses</h2>
              <p className="text-gray-600">Try contacting the owner of the form if you think this is a mistake.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Form Header */}
            <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
              {/* Blue top line */}
              <div className="h-2 bg-blue-600"></div>
              <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">{formData.title}</h1>
                {formData.description && (
                  <p className="text-gray-600">{formData.description}</p>
                )}
              </div>
            </div>

            {/* Questions */}
        <div className="space-y-6">
          {formData.questions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-800 mb-1">
                  {index + 1}. {question.text}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </h3>
              </div>
              
              {renderQuestion(question)}
              
              {/* Error message */}
              {errors[question.id] && (
                <p className="mt-2 text-sm text-red-600">{errors[question.id]}</p>
              )}
            </div>
          ))}
        </div>

            {/* Action Buttons */}
            <div className="mt-8 flex justify-between items-center">
              {/* Clear Form Button */}
              <Button
                onClick={handleClearForm}
                variant="outline"
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                Clear Form
              </Button>
              
              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}