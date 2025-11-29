"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth, UserButton, SignInButton } from "@clerk/nextjs";
import SearchBar from "./SearchBar";

const navbarEvents = {
  publishForm: [] as (() => void)[],
  unpublishForm: [] as (() => void)[],
  previewForm: [] as (() => void)[],
  saveForm: [] as (() => void)[],
  toggleResponses: [] as (() => void)[],
  formStatusUpdate: [] as ((status: { published: boolean; acceptingResponses: boolean; formId: string }) => void)[],
  subscribe: (event: 'publishForm' | 'unpublishForm' | 'previewForm' | 'saveForm' | 'toggleResponses' | 'formStatusUpdate', callback: any) => {
    navbarEvents[event].push(callback);
  },
  unsubscribe: (event: 'publishForm' | 'unpublishForm' | 'previewForm' | 'saveForm' | 'toggleResponses' | 'formStatusUpdate', callback: any) => {
    const index = navbarEvents[event].indexOf(callback);
    if (index > -1) navbarEvents[event].splice(index, 1);
  },
  emit: (event: 'publishForm' | 'unpublishForm' | 'previewForm' | 'saveForm' | 'toggleResponses' | 'formStatusUpdate', data?: any) => {
    navbarEvents[event].forEach(callback => callback(data));
  }
};

let currentFormStatus = { published: false, acceptingResponses: true, formId: '', title: '' };

export { navbarEvents };

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const [formStatus, setFormStatus] = useState({ published: false, acceptingResponses: true, formId: '', title: '' });
  const [linkCopied, setLinkCopied] = useState(false);
  
  const isCreatePage = pathname === "/forms/create";
  const isFormEditPage = pathname.startsWith("/forms/") && pathname !== "/forms/create" && !pathname.includes("/view");
  const isPublicFormView = pathname.includes('/forms/') && pathname.includes('/view');
  const isAuthPage = pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up');

  // Listen for form status updates
  useEffect(() => {
    const handleStatusUpdate = (status: { published: boolean; acceptingResponses: boolean; formId: string }) => {
      setFormStatus({...status, title: ''});
      currentFormStatus = {...status, title: ''};
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
  
  // Don't render navbar on public form view pages or auth pages
  if (isPublicFormView || isAuthPage) {
    return null;
  }

  // Extract form ID from URL for edit pages
  const getFormIdFromUrl = () => {
    if (isFormEditPage) {
      const parts = pathname.split('/');
      return parts[2]; // /forms/[id] -> parts[2] is the id
    }
    return '';
  };

  const getPublishButton = () => {
    if (isCreatePage) {
      return (
        <div className="flex items-center space-x-3">
          <Button 
            onClick={() => navbarEvents.emit('saveForm')}
            variant="outline"
            className="px-4 py-1.5 text-sm border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            id="save-button-create"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16L21 8V19C21 20.1046 20.1046 21 19 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 21V13H7V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 3V8H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span id="save-text-create">Save Draft</span>
          </Button>
          <Button 
            onClick={() => navbarEvents.emit('previewForm')}
            variant="outline"
            className="px-4 py-1.5 text-sm border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
            style={{ display: 'none' }}
            id="preview-button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Preview
          </Button>
          <Button 
            onClick={() => navbarEvents.emit('publishForm')}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 text-sm rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-1.5 transform hover:scale-105"
            title="Go Live"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Go Live
          </Button>
        </div>
      );
    }
    
    if (isFormEditPage) {
      if (formStatus.published === true) {
        return (
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => navbarEvents.emit('saveForm')}
              id="save-button-edit-published"
              variant="outline"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16L21 8V19C21 20.1046 20.1046 21 19 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 21V13H7V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 3V8H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span id="save-text-edit-published">Save Changes</span>
            </Button>
            <Button
              onClick={() => {
                const url = `${window.location.origin}/forms/${formStatus.formId}/view?preview=true`;
                window.open(url, '_blank');
              }}
              style={{ display: 'none' }}
              id="preview-button-edit"
              variant="outline"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Preview
            </Button>
            <Button
              onClick={() => navbarEvents.emit('unpublishForm')}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 px-4 py-2 text-sm rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-1.5 transform hover:scale-105"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Unpublish
            </Button>
          </div>
        );
      } else if (formStatus.published === false) {
        return (
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => navbarEvents.emit('saveForm')}
              id="save-button-edit-draft"
              variant="outline"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16L21 8V19C21 20.1046 20.1046 21 19 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 21V13H7V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 3V8H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span id="save-text-edit-draft">Save Draft</span>
            </Button>
            <Button
              onClick={() => {
                const url = `${window.location.origin}/forms/${formStatus.formId}/view?preview=true`;
                window.open(url, '_blank');
              }}
              style={{ display: 'none' }}
              id="preview-button-edit"
              variant="outline"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Preview
            </Button>
            <Button
              onClick={() => navbarEvents.emit('publishForm')}
              title="Go Live"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 text-sm rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-1.5 transform hover:scale-105"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Go Live
            </Button>
          </div>
        );
      } else {
        // Loading state when published status is undefined
        return null;
      }
    }
    
    return null;
  };

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          
          {/* Left - Brand/Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">Forms4U</span>
            </Link>
          </div>

          {/* Center - Search Bar (only on homepage) */}
          <div className="flex-1 flex justify-center px-8">
            {!isCreatePage && !isFormEditPage && isSignedIn && (
              <div className="hidden md:block">
                <SearchBar />
              </div>
            )}
          </div>

          {/* Right - Dynamic Actions based on page */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            {/* Mobile Search Icon - only on homepage */}
            {!isCreatePage && !isFormEditPage && isSignedIn && (
              <button className="md:hidden p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}
            
            {isCreatePage || isFormEditPage ? (
              // Form pages: Show dynamic publish controls
              getPublishButton()
            ) : null}
            
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