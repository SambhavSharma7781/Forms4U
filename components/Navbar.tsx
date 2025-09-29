"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth, UserButton, SignInButton } from "@clerk/nextjs";

export default function Navbar() {
  const pathname = usePathname();
  const isCreatePage = pathname === "/forms/create";
  const { isSignedIn } = useAuth();

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
            {isCreatePage ? (
              // Create page: Show Publish button
              <>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                  Publish
                </Button>
              </>
            ) : (
              // Homepage: Show Search
              <>
                <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </>
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