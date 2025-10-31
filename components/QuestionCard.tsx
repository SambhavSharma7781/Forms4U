"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import RichTextEditor from "@/components/RichTextEditor";
import ImageUpload from "@/components/ImageUpload";
import { 
  MoreVertical, 
  Copy, 
  Trash2, 
  Plus,
  ToggleLeft,
  ToggleRight,
  Shuffle
} from "lucide-react";

type QuestionType = "SHORT_ANSWER" | "PARAGRAPH" | "MULTIPLE_CHOICE" | "CHECKBOXES" | "DROPDOWN";

interface QuestionCardProps {
  id?: string;
  initialQuestion?: string;
  initialType?: QuestionType;
  initialRequired?: boolean;
  initialOptions?: string[];
  initialShuffleOptionsOrder?: boolean;
  initialImageUrl?: string; // Add image URL prop
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
    shuffleOptionsOrder?: boolean;
    imageUrl?: string; // Add image URL to update data
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
  initialShuffleOptionsOrder = false,
  initialImageUrl = "", // Add image URL prop with default empty string
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
  const [shuffleOptionsOrder, setShuffleOptionsOrder] = useState(initialShuffleOptionsOrder);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [imageUrl, setImageUrl] = useState(initialImageUrl); // Add image state
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
        shuffleOptionsOrder,
        imageUrl: imageUrl || undefined, // Add image URL to update data
        // Quiz fields
        points: isQuiz ? points : undefined,
        correctAnswers: isQuiz ? correctAnswers : undefined
      });
    }
  };

  // Notify parent when key data changes (including imageUrl)
  useEffect(() => {
    notifyParent();
  }, [question, questionType, required, options, shuffleOptionsOrder, imageUrl, points, correctAnswers, isQuiz]);

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

  // Image handler functions
  const handleImageUpload = (newImageUrl: string) => {
    setImageUrl(newImageUrl); // Update image state when new image is uploaded
  };

  const handleImageRemove = () => {
    setImageUrl(''); // Clear image state when image is removed
  };

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
            <div className="flex-1">
              <RichTextEditor
                value={question || ''}
                onChange={(value) => setQuestion(value)}
                placeholder="Untitled question"
                className="w-full text-lg font-medium text-gray-900 bg-transparent border-none outline-none focus:bg-gray-50 rounded px-2 py-1 -mx-2 transition-colors"
                style={{ minHeight: '32px' }}
              />
              
              {/* Image Upload Component */}
              <ImageUpload
                imageUrl={imageUrl}
                onImageUpload={handleImageUpload}
                onImageRemove={handleImageRemove}
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
              
              {/* 3-dots menu - only show for option-based questions */}
              {(questionType === "MULTIPLE_CHOICE" || questionType === "CHECKBOXES" || questionType === "DROPDOWN") && (
                <div className="relative">
                  <button 
                    onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors relative z-30"
                    title="Question Options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                
                {/* Dropdown Menu */}
                {showOptionsMenu && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowOptionsMenu(false)}
                    />
                    
                    {/* Menu Content */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-100 z-40 origin-top"
                         style={{ 
                           boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                           minWidth: '280px'
                         }}>
                      {/* Show shuffle option only for option-based questions */}
                      {(questionType === "MULTIPLE_CHOICE" || questionType === "CHECKBOXES" || questionType === "DROPDOWN") && (
                        <div className="py-2">
                          <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Question Options
                          </div>
                          
                          <button
                            onClick={() => {
                              setShuffleOptionsOrder(!shuffleOptionsOrder);
                              setShowOptionsMenu(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-all duration-150 group"
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`p-1.5 rounded-md ${shuffleOptionsOrder ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600'} transition-colors`}>
                                <Shuffle className="w-3.5 h-3.5" />
                              </div>
                              <div className="text-left">
                                <div className="font-medium">Shuffle Options Order</div>
                                <div className="text-xs text-gray-500 mt-0.5">Randomize option order for respondents</div>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${shuffleOptionsOrder ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'}`}>
                              {shuffleOptionsOrder && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </button>
                        </div>
                      )}
                      
                    </div>
                  </>
                )}
                </div>
              )}
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