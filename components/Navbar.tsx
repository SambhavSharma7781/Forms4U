"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth, UserButton, SignInButton } from "@clerk/nextjs";

// Global event system for navbar actions
const navbarEvents = {
  publishForm: [] as (() => void)[],
  toggleResponses: [] as (() => void)[],
  formStatusUpdate: [] as ((status: { published: boolean; acceptingResponses: boolean; formId: string }) => void)[],
  subscribe: (event: 'publishForm' | 'toggleResponses' | 'formStatusUpdate', callback: any) => {
    navbarEvents[event].push(callback);
  },
  unsubscribe: (event: 'publishForm' | 'toggleResponses' | 'formStatusUpdate', callback: any) => {
    const index = navbarEvents[event].indexOf(callback);
    if (index > -1) navbarEvents[event].splice(index, 1);
  },
  emit: (event: 'publishForm' | 'toggleResponses' | 'formStatusUpdate', data?: any) => {
    navbarEvents[event].forEach(callback => callback(data));
  }
};

// Global form status for navbar
let currentFormStatus = { published: false, acceptingResponses: true, formId: '', title: '' };

export { navbarEvents };

export default function Navbar() {
  const pathname = usePathname();
  const isCreatePage = pathname === "/forms/create";
  const isFormEditPage = pathname.startsWith("/forms/") && pathname !== "/forms/create" && !pathname.includes("/view");
  const isPublicFormView = pathname.includes('/forms/') && pathname.includes('/view');
  const { isSignedIn } = useAuth();
  
  // Don't render navbar on public form view pages
  if (isPublicFormView) {
    return null;
  }
  
  const [formStatus, setFormStatus] = useState({ published: false, acceptingResponses: true, formId: '', title: '' });

  // Extract form ID from URL for edit pages
  const getFormIdFromUrl = () => {
    if (isFormEditPage) {
      const parts = pathname.split('/');
      return parts[2]; // /forms/[id] -> parts[2] is the id
    }
    return '';
  };

  // Listen for form status updates
  useEffect(() => {
    const handleStatusUpdate = (status: { published: boolean; acceptingResponses: boolean; formId: string; title: string }) => {
      console.log('Navbar received status update:', JSON.stringify(status));
      setFormStatus(status);
      currentFormStatus = status;
    };

    navbarEvents.subscribe('formStatusUpdate', handleStatusUpdate);
    return () => navbarEvents.unsubscribe('formStatusUpdate', handleStatusUpdate);
  }, []);

  // Reset form status when navigating away from form pages
  useEffect(() => {
    if (!isFormEditPage && !isCreatePage) {
      setFormStatus({ published: false, acceptingResponses: true, formId: '', title: '' });
    }
  }, [isFormEditPage, isCreatePage]);

  // Get button text and actions based on page and status
  const getPublishButton = () => {
    if (isCreatePage) {
      return (
        <Button 
          onClick={() => navbarEvents.emit('publishForm')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6"
        >
          Publish Form
        </Button>
      );
    }
    
    if (isFormEditPage) {
      // Debug: Show what status we have
      console.log('getPublishButton - Current formStatus:', JSON.stringify(formStatus));
      
      if (formStatus.published === true) {
        return (
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navbarEvents.emit('toggleResponses')}
              className={`px-3 py-1 text-sm border rounded hover:bg-opacity-10 ${
                formStatus.acceptingResponses 
                  ? 'border-orange-600 text-orange-600 hover:bg-orange-50' 
                  : 'border-green-600 text-green-600 hover:bg-green-50'
              }`}
            >
              {formStatus.acceptingResponses ? 'Stop Accepting Responses' : 'Accept Responses'}
            </button>
            <button 
              onClick={() => {
                const url = `${window.location.origin}/forms/${formStatus.formId}/view`;
                navigator.clipboard.writeText(url);
                alert('Public link copied to clipboard!');
              }}
              className="px-3 py-1 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
            >
              Copy Link
            </button>
          </div>
        );
      } else if (formStatus.published === false) {
        return (
          <button 
            onClick={() => navbarEvents.emit('publishForm')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Publish Form
          </button>
        );
      } else {
        // Loading state when published status is undefined
        return null;
      }
    }
    
    return null;
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Left - Brand/Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xl font-semibold text-gray-900 hidden sm:block">
                NextForms
              </span>
            </Link>
          </div>

          {/* Right - Dynamic Actions based on page */}
          <div className="flex items-center space-x-4">
            {isCreatePage || isFormEditPage ? (
              // Form pages: Show dynamic publish controls
              getPublishButton()
            ) : (
              // Homepage: Show Search
              <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}
            
            {/* Authentication */}
            {isSignedIn ? (
              <UserButton afterSignOutUrl="/" />
            ) : (
              <SignInButton mode="modal">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </SignInButton>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}