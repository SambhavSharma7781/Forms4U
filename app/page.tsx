"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Dashboard() {
  // Temporary: Later we'll fetch from database
  const [userForms, setUserForms] = useState<any[]>([]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Start a new form section */}
        <div className="mb-12">
          <h2 className="text-lg font-medium text-gray-700 mb-4">Start a new form</h2>
          <Link href="/forms/create">
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer w-48">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">Blank form</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Owned by you section */}
        <div>
          <h2 className="text-lg font-medium text-gray-700 mb-6">Owned by you</h2>
          
          {/* Forms grid - responsive */}
          {userForms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {userForms.map((form, index) => (
                <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <h3 className="font-medium text-gray-900 mb-2">{form.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{form.description}</p>
                  <p className="text-xs text-gray-400">Modified {form.lastModified}</p>
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