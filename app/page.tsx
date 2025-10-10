"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";

interface UserForm {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  createdAt: string;
  questions: {
    id: string;
    text: string;
    type: string;
    required: boolean;
    options: {
      text: string;
    }[];
  }[];
}

export default function Dashboard() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [userForms, setUserForms] = useState<UserForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Fetch user's forms when component loads
  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn) {
        fetchUserForms();
      } else {
        setLoading(false);
      }
    }
  }, [isSignedIn, isLoaded]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  const fetchUserForms = async () => {
    try {
      const response = await fetch('/api/forms/user');
      const data = await response.json();
      
      if (data.success) {
        setUserForms(data.forms);
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setLoading(false);
    }
  };

  // Action Handlers
  const handleEditForm = (formId: string) => {
    console.log('handleEditForm called with formId:', formId);
    console.log('Navigating to:', `/forms/${formId}`);
    router.push(`/forms/${formId}`);
  };

  const handleDuplicateForm = (formId: string) => {
    // TODO: Implement form duplication
    alert('Form duplication feature coming soon!');
  };

  const handleMenuToggle = (formId: string) => {
    setOpenMenuId(openMenuId === formId ? null : formId);
  };

  const handleRenameForm = (formId: string) => {
    setOpenMenuId(null);
    // TODO: Implement rename functionality
    alert('Form rename feature coming soon!');
  };

  const handleOpenInNewTab = (formId: string) => {
    const url = `/forms/${formId}`;
    window.open(url, '_blank');
    setOpenMenuId(null);
  };

  const handleDeleteForm = async (formId: string) => {
    // Confirm before deleting
    if (confirm('Are you sure you want to delete this form?')) {
      try {
        const response = await fetch(`/api/forms/delete/${formId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          // Remove from UI
          setUserForms(userForms.filter(form => form.id !== formId));
          alert('Form deleted successfully!');
        } else {
          alert('Error deleting form');
        }
      } catch (error) {
        alert('Error deleting form');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Start a new form section */}
        <div className="mb-12">
          <h2 className="text-lg font-medium text-gray-700 mb-4">Start a new form</h2>
          <div className="w-48">
            <button 
              onClick={() => {
                console.log('New form button clicked');
                router.push('/forms/create');
              }}
              className="block w-full"
            >
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900">New form</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Owned by you section */}
        <div>
          <h2 className="text-lg font-medium text-gray-700 mb-6">Owned by you</h2>
          
          {/* Forms grid - responsive */}
          {!isLoaded || loading ? (
            <div className="py-8">
              <LoadingSpinner message="Loading your forms..." size="md" fullScreen={false} />
            </div>
          ) : !isSignedIn ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Please sign in to view your forms.</p>
            </div>
          ) : userForms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {userForms.map((form) => (
                <div key={form.id} className="w-56 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer group">
                  
                  {/* Form Preview Area - Click to Edit */}
                  <div onClick={() => handleEditForm(form.id)} className="relative">
                    
                    {/* Clean Professional Preview */}
                    <div className="h-36 bg-gray-50 overflow-hidden relative rounded-t-lg">
                      
                      {/* Blue header stripe */}
                      <div className="h-1 bg-blue-600 w-full"></div>
                      
                      {/* Preview content */}
                      <div className="p-4 bg-white h-full">
                        
                        {/* Form title */}
                        <div className="mb-3">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {form.title}
                          </h3>
                          {form.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {form.description}
                            </p>
                          )}
                        </div>

                        {/* Questions summary */}
                        <div className="space-y-2">
                          {form.questions.slice(0, 3).map((question, index) => (
                            <div key={question.id} className="flex items-start space-x-2">
                              <span className="text-xs text-gray-400 mt-0.5">{index + 1}.</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-700 truncate">
                                  {question.text || "Untitled question"}
                                  {question.required && <span className="text-red-500 ml-1">*</span>}
                                </p>
                                <div className="flex items-center mt-1">
                                  {question.type === 'SHORT_ANSWER' && (
                                    <>
                                      <div className="w-3 h-0.5 bg-gray-300 mr-2"></div>
                                      <span className="text-xs text-gray-400">Short answer</span>
                                    </>
                                  )}
                                  {question.type === 'PARAGRAPH' && (
                                    <>
                                      <div className="w-3 h-2 border border-gray-300 mr-2"></div>
                                      <span className="text-xs text-gray-400">Paragraph</span>
                                    </>
                                  )}
                                  {question.type === 'MULTIPLE_CHOICE' && (
                                    <>
                                      <div className="w-2 h-2 border border-gray-400 rounded-full mr-2"></div>
                                      <span className="text-xs text-gray-400">Multiple choice</span>
                                    </>
                                  )}
                                  {question.type === 'CHECKBOXES' && (
                                    <>
                                      <div className="w-2 h-2 border border-gray-400 mr-2"></div>
                                      <span className="text-xs text-gray-400">Checkboxes</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {form.questions.length > 3 && (
                            <div className="flex items-center space-x-2 pt-1">
                              <span className="text-xs text-gray-400">...</span>
                              <span className="text-xs text-gray-400">
                                {form.questions.length - 3} more questions
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form Info Footer - Clean Single Line Layout */}
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      {/* Left Side - Form Icon + Title */}
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                          </svg>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{form.title}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(form.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Right Side - Status + Menu (All in one line) */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          form.published 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {form.published ? 'Live' : 'Draft'}
                        </span>
                        
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMenuToggle(form.id);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" />
                            </svg>
                          </button>
                          
                          {/* Dropdown Menu */}
                          {openMenuId === form.id && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRenameForm(form.id);
                                }}
                                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Rename</span>
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenInNewTab(form.id);
                                }}
                                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                <span>Open in new tab</span>
                              </button>
                              
                              <hr className="my-1" />
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteForm(form.id);
                                }}
                                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Empty state
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No forms yet</h3>
              <p className="text-gray-600 mb-4">Create your first form to get started!</p>
              <Link href="/forms/create">
                <span className="text-blue-600 hover:text-blue-700 font-medium">Create a form →</span>
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}