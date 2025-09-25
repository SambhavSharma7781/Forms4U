"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";
import QuestionCard from "@/components/QuestionCard";

interface Question {
  id: string;
  question: string;
  type: "SHORT_ANSWER" | "PARAGRAPH" | "MULTIPLE_CHOICE" | "CHECKBOXES" | "DROPDOWN";
  required: boolean;
}

export default function CreateFormPage() {
  const [formTitle, setFormTitle] = useState("Untitled form");
  const [formDescription, setFormDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: "1",
      question: "",
      type: "SHORT_ANSWER",
      required: false
    }
  ]);

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      question: "",
      type: "SHORT_ANSWER",
      required: false
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleDeleteQuestion = (id: string) => {
    if (questions.length > 1) { // Keep at least one question
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const handleDuplicateQuestion = (id: string) => {
    const questionToDuplicate = questions.find(q => q.id === id);
    if (questionToDuplicate) {
      const newQuestion: Question = {
        ...questionToDuplicate,
        id: Date.now().toString(),
        question: questionToDuplicate.question + " (copy)"
      };
      const index = questions.findIndex(q => q.id === id);
      const newQuestions = [...questions];
      newQuestions.splice(index + 1, 0, newQuestion);
      setQuestions(newQuestions);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        
        {/* Form Header Card - Our Style */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          {/* Blue header bar - Our brand color */}
          <div className="h-3 bg-blue-600 rounded-t-lg"></div>
          
          {/* Form header content */}
          <div className="p-8">
            {/* Form title - Google Forms style */}
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full text-3xl font-normal text-gray-900 bg-transparent border-none outline-none focus:bg-gray-50 rounded px-2 py-1 -mx-2 transition-colors"
              placeholder="Untitled form"
            />
            
            {/* Form description */}
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Form description"
              rows={2}
              className="w-full mt-4 text-base text-gray-600 bg-transparent border-none outline-none focus:bg-gray-50 rounded px-2 py-1 -mx-2 resize-none transition-colors"
            />
          </div>
        </div>

        {/* Questions Section */}
        <div className="space-y-6">
          {questions.map((q) => (
            <QuestionCard 
              key={q.id}
              id={q.id}
              initialQuestion={q.question}
              initialType={q.type}
              initialRequired={q.required}
              onDelete={() => handleDeleteQuestion(q.id)}
              onDuplicate={() => handleDuplicateQuestion(q.id)}
            />
          ))}
        </div>

        {/* Add Question Button */}
        <div className="mb-6">
          <button 
            onClick={handleAddQuestion}
            className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Question</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <Link href="/">
            <Button variant="outline">← Back to Home</Button>
          </Link>
          <div>
            <Button variant="outline">Save Draft</Button>
          </div>
        </div>

      </div>
    </div>
  );
}
