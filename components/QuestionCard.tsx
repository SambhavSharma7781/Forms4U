"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  MoreVertical, 
  Copy, 
  Trash2, 
  Plus,
  ToggleLeft,
  ToggleRight
} from "lucide-react";

type QuestionType = "SHORT_ANSWER" | "PARAGRAPH" | "MULTIPLE_CHOICE" | "CHECKBOXES" | "DROPDOWN";

interface QuestionCardProps {
  id?: string;
  initialQuestion?: string;
  initialType?: QuestionType;
  initialRequired?: boolean;
  initialOptions?: string[];
  // Quiz props
  isQuiz?: boolean;
  initialPoints?: number;
  initialCorrectAnswers?: string[];
  onDelete?: () => void;
  onDuplicate?: () => void;
  onUpdate?: (data: {
    id: string;
    question: string;
    type: QuestionType;
    required: boolean;
    options: string[];
    points?: number;
    correctAnswers?: string[];
  }) => void;
}

export default function QuestionCard({
  id,
  initialQuestion = "",
  initialType = "SHORT_ANSWER",
  initialRequired = false,
  initialOptions = [],
  // Quiz props
  isQuiz = false,
  initialPoints = 1,
  initialCorrectAnswers = [],
  onDelete,
  onDuplicate,
  onUpdate
}: QuestionCardProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [questionType, setQuestionType] = useState<QuestionType>(initialType);
  const [required, setRequired] = useState(initialRequired);
  const [isEditing, setIsEditing] = useState(!initialQuestion);
  // Quiz states
  const [points, setPoints] = useState(initialPoints);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>(() => {
    // If initial correct answers are provided, use them
    if (initialCorrectAnswers.length > 0) {
      return initialCorrectAnswers;
    }
    // For text questions, initialize with one empty answer field
    if (questionType === 'SHORT_ANSWER' || questionType === 'PARAGRAPH') {
      return [''];
    }
    return [];
  });
  const [options, setOptions] = useState<string[]>(() => {
    // If initialOptions are provided, use them
    if (initialOptions.length > 0) {
      return initialOptions;
    }
    // Otherwise, create default options for types that need them
    if (questionType === "MULTIPLE_CHOICE" || questionType === "CHECKBOXES" || questionType === "DROPDOWN") {
      return ["Option 1", ""];
    }
    return [];
  });

  // Notify parent whenever data changes
  const notifyParent = () => {
    if (onUpdate && id) {
      onUpdate({
        id,
        question,
        type: questionType,
        required,
        options: options.filter(opt => opt.trim() !== ""),
        // Quiz fields
        points: isQuiz ? points : undefined,
        correctAnswers: isQuiz ? correctAnswers : undefined
      });
    }
  };

  // Notify parent when key data changes
  useEffect(() => {
    notifyParent();
  }, [question, questionType, required, options, points, correctAnswers, isQuiz]);

  // Handle options when question type changes
  useEffect(() => {
    if (questionType === "MULTIPLE_CHOICE" || questionType === "CHECKBOXES" || questionType === "DROPDOWN") {
      if (options.length === 0) {
        setOptions(["Option 1", ""]);
      }
    } else {
      if (options.length > 0) {
        setOptions([]);
      }
    }
  }, [questionType]);

  const questionTypes = [
    { value: "SHORT_ANSWER", label: "Short answer" },
    { value: "PARAGRAPH", label: "Paragraph" },
    { value: "MULTIPLE_CHOICE", label: "Multiple choice" },
    { value: "CHECKBOXES", label: "Checkboxes" },
    { value: "DROPDOWN", label: "Dropdown" }
  ];

  const handleTypeChange = (newType: QuestionType) => {
    setQuestionType(newType);
    
    // Initialize correct answers for text questions
    if ((newType === 'SHORT_ANSWER' || newType === 'PARAGRAPH') && correctAnswers.length === 0) {
      setCorrectAnswers(['']);
    }
  };

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (options.length > 1) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const renderQuestionInput = () => {
    switch (questionType) {
      case "SHORT_ANSWER":
        return (
          <div className="mt-6">
            <input
              type="text"
              placeholder="Short answer text"
              disabled
              className="w-full border-b border-gray-300 pb-2 text-gray-400 text-sm bg-transparent outline-none"
            />
          </div>
        );
      
      case "PARAGRAPH":
        return (
          <div className="mt-6">
            <textarea
              placeholder="Long answer text"
              disabled
              rows={3}
              className="w-full border border-gray-300 rounded p-3 text-gray-400 text-sm bg-transparent outline-none resize-none"
            />
          </div>
        );
      
      case "MULTIPLE_CHOICE":
        return (
          <div className="mt-6 space-y-3">
            {options.map((option, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-4 h-4 border-2 border-gray-400 rounded-full"></div>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 border-b border-gray-300 pb-1 outline-none focus:border-blue-500"
                />
                {options.length > 1 && (
                  <button
                    onClick={() => removeOption(index)}
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
              onClick={addOption}
              className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add option</span>
            </button>
          </div>
        );
      
      case "CHECKBOXES":
        return (
          <div className="mt-6 space-y-3">
            {options.map((option, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-4 h-4 border-2 border-gray-400 rounded"></div>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 border-b border-gray-300 pb-1 outline-none focus:border-blue-500"
                />
                {options.length > 1 && (
                  <button
                    onClick={() => removeOption(index)}
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
              onClick={addOption}
              className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add option</span>
            </button>
          </div>
        );
      
      case "DROPDOWN":
        return (
          <div className="mt-6">
            <select disabled className="w-full border border-gray-300 rounded p-2 text-gray-400 text-sm bg-white">
              <option>Choose</option>
            </select>
            <div className="mt-4 space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <span className="text-gray-400 text-sm">{index + 1}.</span>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 border-b border-gray-300 pb-1 outline-none focus:border-blue-500"
                  />
                  {options.length > 1 && (
                    <button
                      onClick={() => removeOption(index)}
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
                onClick={addOption}
                className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add option</span>
              </button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 mb-6 group hover:shadow-sm transition-shadow">
      {/* Blue left border - Google Forms style */}
      <div className="border-l-4 border-blue-600">
        <div className="p-6">
          
          {/* Question header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 mr-4">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Untitled question"
                className="w-full text-lg font-medium text-gray-900 bg-transparent border-none outline-none focus:bg-gray-50 rounded px-2 py-1 -mx-2 transition-colors"
                onFocus={() => setIsEditing(true)}
              />
            </div>
            
            {/* Question type selector */}
            <select
              value={questionType}
              onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
              className="border border-gray-300 rounded px-3 py-1 text-sm bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {questionTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Question input area */}
          {renderQuestionInput()}

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              {/* Action buttons */}
              <button
                onClick={onDuplicate}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                title="Duplicate"
              >
                <Copy className="w-4 h-4" />
              </button> 
              
              <button
                onClick={onDelete}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            
            {/* Required toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Required</span>
              <button
                onClick={() => setRequired(!required)}
                className={`transition-colors ${required ? 'text-blue-600' : 'text-gray-400'}`}
              >
                {required ? <ToggleRight className="w-8 h-5" /> : <ToggleLeft className="w-8 h-5" />}
              </button>
            </div>
          </div>

          {/* Quiz Configuration */}
          {isQuiz && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-blue-800">Quiz Settings</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-blue-600">Points:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={points}
                    onChange={(e) => setPoints(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-2 py-1 text-sm border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Correct Answer Configuration */}
              {(questionType === 'MULTIPLE_CHOICE' || questionType === 'CHECKBOXES') && options.length > 0 && (
                <div>
                  <p className="text-sm text-blue-700 mb-2">
                    {questionType === 'MULTIPLE_CHOICE' ? 'Select the correct answer:' : 'Select all correct answers:'}
                  </p>
                  <div className="space-y-2">
                    {options.map((option, index) => (
                      option.trim() && (
                        <label key={index} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type={questionType === 'MULTIPLE_CHOICE' ? 'radio' : 'checkbox'}
                            name={`correct-${id}`}
                            value={option}
                            checked={correctAnswers.includes(option)}
                            onChange={(e) => {
                              if (questionType === 'MULTIPLE_CHOICE') {
                                // Single selection for multiple choice
                                setCorrectAnswers([option]); // Always set to the clicked option
                              } else {
                                // Multiple selection for checkboxes
                                if (e.target.checked) {
                                  setCorrectAnswers([...correctAnswers, option]);
                                } else {
                                  setCorrectAnswers(correctAnswers.filter(ans => ans !== option));
                                }
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-blue-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-blue-800">{option}</span>
                        </label>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Text question answer input */}
              {(questionType === 'SHORT_ANSWER' || questionType === 'PARAGRAPH') && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Correct Answer(s) - Add multiple acceptable answers
                    </label>
                    <div className="space-y-2">
                      {correctAnswers.map((answer, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={answer}
                            onChange={(e) => {
                              const newAnswers = [...correctAnswers];
                              newAnswers[index] = e.target.value;
                              setCorrectAnswers(newAnswers);
                              notifyParent();
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder={`Correct answer ${index + 1}`}
                          />
                          {correctAnswers.length > 1 && (
                            <button
                              onClick={() => {
                                const newAnswers = correctAnswers.filter((_, i) => i !== index);
                                setCorrectAnswers(newAnswers);
                                notifyParent();
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-md"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          setCorrectAnswers([...correctAnswers, '']);
                          notifyParent();
                        }}
                        className="flex items-center space-x-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Add another acceptable answer</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}