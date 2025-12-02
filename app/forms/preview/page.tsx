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
  imageUrl?: string; // Add image URL field
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
            className={`w-full px-2 sm:px-3 py-2 sm:py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${
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
            className={`w-full px-2 sm:px-3 py-2 sm:py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${
              hasError ? 'border-red-500' : 'border-gray-300'
            }`}
            rows={4}
            placeholder="Your answer"
          />
        );

      case 'MULTIPLE_CHOICE':
        return (
          <div className="space-y-1.5 sm:space-y-2">
            {question.options.map((option) => (
              <label key={option.id} className="flex items-start sm:items-center gap-2 sm:gap-3 cursor-pointer p-1.5 sm:p-2 rounded hover:bg-gray-50 min-h-[36px]">
                <input
                  type="radio"
                  name={question.id}
                  value={option.text}
                  checked={response === option.text}
                  onChange={(e) => handleInputChange(question.id, e.target.value)}
                  className="w-4 h-4 mt-0.5 sm:mt-0 text-blue-600 border-gray-300 focus:ring-blue-500 flex-shrink-0"
                />
                <span className="text-gray-700 text-sm sm:text-base break-words flex-1 min-w-0">{option.text}</span>
              </label>
            ))}
          </div>
        );

      case 'CHECKBOXES':
        return (
          <div className="space-y-1.5 sm:space-y-2">
            {question.options.map((option) => (
              <label key={option.id} className="flex items-start sm:items-center gap-2 sm:gap-3 cursor-pointer p-1.5 sm:p-2 rounded hover:bg-gray-50 min-h-[36px]">
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
                  className="w-4 h-4 mt-0.5 sm:mt-0 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                />
                <span className="text-gray-700 text-sm sm:text-base break-words flex-1 min-w-0">{option.text}</span>
              </label>
            ))}
          </div>
        );

      case 'DROPDOWN':
        return (
          <select
            value={response as string || ''}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            className={`w-full px-2 sm:px-3 py-2 sm:py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base ${
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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Preview Not Available</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4">No form data found for preview.</p>
          <Button onClick={() => window.close()} className="text-sm sm:text-base px-3 sm:px-4 py-2">Close Preview</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="max-w-2xl mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6">
        {/* Preview Header */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-blue-800 font-medium text-xs sm:text-sm">Preview Mode</span>
            </div>
            <Button 
              onClick={() => window.close()} 
              variant="outline" 
              size="sm"
              className="border-blue-300 text-blue-700 hover:bg-blue-100 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 flex-shrink-0"
            >
              <span className="hidden xs:inline sm:inline">Close Preview</span>
              <span className="xs:hidden sm:hidden">Close</span>
            </Button>
          </div>
          <p className="text-blue-700 text-xs sm:text-sm mt-2 break-words">This is how your form will appear to respondents. Form submission is disabled in preview mode.</p>
        </div>

        {/* Form Header */}
        <div className="bg-white rounded-lg shadow-sm mb-4 sm:mb-6 overflow-hidden">
          <div className="h-2 bg-blue-600"></div>
          <div className="p-4 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 break-words">{formData.title}</h1>
            {formData.description && (
              <p className="text-sm sm:text-base text-gray-600 break-words">{formData.description}</p>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4 sm:space-y-6">
          {formData.questions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-1 break-words">
                  {index + 1}. {question.text}
                  {question.required && <span className="text-red-500 ml-1 flex-shrink-0">*</span>}
                </h3>
                
                {/* Display Question Image */}
                {question.imageUrl && (
                  <div className="mt-2 sm:mt-3">
                    <img 
                      src={question.imageUrl} 
                      alt="Question image" 
                      className="max-w-full w-full h-auto rounded-lg border border-gray-200 shadow-sm"
                      style={{ maxHeight: '300px' }}
                    />
                  </div>
                )}
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
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            className="font-medium transition-all duration-200 text-blue-600 text-sm sm:text-base px-3 sm:px-4 py-2 w-full sm:w-auto order-2 sm:order-1"
            disabled
          >
            Clear Form
          </Button>
          
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base px-3 sm:px-4 py-2 w-full sm:w-auto order-1 sm:order-2"
            disabled
          >
            <span className="hidden xs:inline sm:inline">Submit Form (Preview Only)</span>
            <span className="xs:hidden sm:hidden">Submit (Preview)</span>
          </Button>
        </div>

        <div className="mt-3 sm:mt-4 text-center">
          <p className="text-xs sm:text-sm text-gray-500 break-words px-2">
            Form submission is disabled in preview mode. Close this tab to return to editing.
          </p>
        </div>
      </div>
    </div>
  );
}