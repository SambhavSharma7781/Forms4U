'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  type: string;
  required: boolean;
  options: Option[];
}

interface PreviewFormData {
  title: string;
  description: string;
  questions: Question[];
}

interface FormResponse {
  [questionId: string]: string | string[];
}

export default function FormPreview() {
  const [formData, setFormData] = useState<PreviewFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<FormResponse>({});
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    // Get preview data from sessionStorage
    const previewData = sessionStorage.getItem('previewFormData');
    if (previewData) {
      setFormData(JSON.parse(previewData));
    } else {
      // If no preview data, show error
      setFormData(null);
    }
    setLoading(false);
  }, []);

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
            className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? 'border-red-500' : 'border-gray-300'
            }`}
            rows={4}
            placeholder="Your answer"
          />
        );

      case 'MULTIPLE_CHOICE':
        return (
          <div className="space-y-2">
            {question.options.map((option) => (
              <label key={option.id} className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-gray-50">
                <input
                  type="radio"
                  name={question.id}
                  value={option.text}
                  checked={response === option.text}
                  onChange={(e) => handleInputChange(question.id, e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-gray-700">{option.text}</span>
              </label>
            ))}
          </div>
        );

      case 'CHECKBOXES':
        return (
          <div className="space-y-2">
            {question.options.map((option) => (
              <label key={option.id} className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-gray-50">
                <input
                  type="checkbox"
                  value={option.text}
                  checked={Array.isArray(response) && response.includes(option.text)}
                  onChange={(e) => {
                    const currentResponses = Array.isArray(response) ? response : [];
                    if (e.target.checked) {
                      handleInputChange(question.id, [...currentResponses, option.text]);
                    } else {
                      handleInputChange(question.id, currentResponses.filter(r => r !== option.text));
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">{option.text}</span>
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
            <option value="">Choose an option</option>
            {question.options.map((option) => (
              <option key={option.id} value={option.text}>
                {option.text}
              </option>
            ))}
          </select>
        );

      default:
        return <p className="text-gray-500 italic">Question type not supported in preview</p>;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!formData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Preview Not Available</h2>
          <p className="text-gray-600 mb-4">No form data found for preview.</p>
          <Button onClick={() => window.close()}>Close Preview</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Preview Header */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-blue-800 font-medium">Preview Mode</span>
            </div>
            <Button 
              onClick={() => window.close()} 
              variant="outline" 
              size="sm"
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              Close Preview
            </Button>
          </div>
          <p className="text-blue-700 text-sm mt-2">This is how your form will appear to respondents. Form submission is disabled in preview mode.</p>
        </div>

        {/* Form Header */}
        <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
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

        {/* Preview Submit Button (Disabled) */}
        <div className="mt-8 flex justify-between items-center">
          <Button
            variant="outline"
            className="text-gray-600 border-gray-300"
            disabled
          >
            Clear Form
          </Button>
          
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled
          >
            Submit Form (Preview Only)
          </Button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Form submission is disabled in preview mode. Close this tab to return to editing.
          </p>
        </div>
      </div>
    </div>
  );
}