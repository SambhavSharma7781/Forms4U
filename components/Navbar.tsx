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
  toggleResponses: [] as (() => void)[],
  formStatusUpdate: [] as ((status: { published: boolean; acceptingResponses: boolean; formId: string }) => void)[],
  subscribe: (event: 'publishForm' | 'unpublishForm' | 'previewForm' | 'toggleResponses' | 'formStatusUpdate', callback: any) => {
    navbarEvents[event].push(callback);
  },
  unsubscribe: (event: 'publishForm' | 'unpublishForm' | 'previewForm' | 'toggleResponses' | 'formStatusUpdate', callback: any) => {
    const index = navbarEvents[event].indexOf(callback);
    if (index > -1) navbarEvents[event].splice(index, 1);
  },
  emit: (event: 'publishForm' | 'unpublishForm' | 'previewForm' | 'toggleResponses' | 'formStatusUpdate', data?: any) => {
    navbarEvents[event].forEach(callback => callback(data));
  }
};

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
  const [linkCopied, setLinkCopied] = useState(false);

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

  const getPublishButton = () => {
    if (isCreatePage) {
      return (
        <div className="flex items-center space-x-3">
          <Button 
            onClick={() => navbarEvents.emit('previewForm')}
            variant="outline"
            className="px-4 py-1.5 text-sm border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Preview
          </Button>
          <Button 
            onClick={() => navbarEvents.emit('publishForm')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-sm rounded-md font-medium shadow-sm transition-all duration-200 hover:shadow-md flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Publish
          </Button>
        </div>
      );
    }
    
    if (isFormEditPage) {
      if (formStatus.published === true) {
        return (
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => {
                const url = `${window.location.origin}/forms/${formStatus.formId}/view?preview=true`;
                window.open(url, '_blank');
              }}
              className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-md font-medium hover:bg-gray-50 transition-all duration-200 flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Preview
            </button>
            <button 
              onClick={() => navbarEvents.emit('unpublishForm')}
              className="px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-md font-medium border border-red-200 hover:bg-red-100 transition-all duration-200 flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Unpublish
            </button>
            <button 
              onClick={() => {
                const url = `${window.location.origin}/forms/${formStatus.formId}/view`;
                navigator.clipboard.writeText(url);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }}
              className={`px-3 py-1.5 text-xs border rounded-md font-medium transition-all duration-200 flex items-center gap-1.5 ${
                linkCopied 
                  ? 'border-green-600 text-green-600 bg-green-50' 
                  : 'border-blue-600 text-blue-600 hover:bg-blue-50'
              }`}
            >
              {linkCopied ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 13C10.4295 13.5741 11.0235 14 11.7 14.29C12.3765 14.58 13.1232 14.6307 13.8337 14.4362C14.5442 14.2417 15.1889 13.8145 15.6801 13.2124C16.1712 12.6103 16.4838 11.8644 16.5762 11.0781C16.6686 10.2918 16.5357 9.49836 16.1935 8.79467C15.8512 8.09098 15.3141 7.50618 14.6441 7.12118C13.9741 6.73618 13.2013 6.56958 12.4279 6.64556C11.6545 6.72154 10.9156 7.03675 10.31 7.55" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 11C13.5705 10.4259 12.9765 10 12.3 9.71C11.6235 9.42 10.8768 9.36929 10.1663 9.56381C9.45578 9.75833 8.81109 10.1855 8.31993 10.7876C7.82877 11.3897 7.51617 12.1356 7.42378 12.9219C7.33139 13.7082 7.46432 14.5016 7.80654 15.2053C8.14876 15.909 8.68594 16.4938 9.35589 16.8788C10.0258 17.2638 10.7987 17.4304 11.5721 17.3544C12.3455 17.2785 13.0844 16.9632 13.69 16.45" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M13 7L13 1M7 1V7M1 13H7M17 13H23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Copy Link
                </>
              )}
            </button>
          </div>
        );
      } else if (formStatus.published === false) {
        return (
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => {
                const url = `${window.location.origin}/forms/${formStatus.formId}/view?preview=true`;
                window.open(url, '_blank');
              }}
              className="px-3 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-md font-medium hover:bg-gray-50 transition-all duration-200 flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Preview
            </button>
            <button 
              onClick={() => navbarEvents.emit('publishForm')}
              className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium shadow-sm transition-all duration-200 hover:shadow-md flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Publish
            </button>
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
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          
          {/* Left - Brand/Logo */}
          <div className="flex items-center flex-shrink-0">
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