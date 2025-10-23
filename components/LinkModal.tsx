"use client";

import { useState, useRef, useEffect } from 'react';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string) => void;
  selectedText?: string;
}

export default function LinkModal({ isOpen, onClose, onConfirm, selectedText }: LinkModalProps) {
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (url.trim()) {
      onConfirm(url.trim());
      setUrl('');
      onClose();
    }
  };

  const handleClose = () => {
    setUrl('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-200"
      onClick={handleClose}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-200 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Add link
          </h3>
          {selectedText && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Adding link to: "<span className="font-medium text-blue-600 dark:text-blue-400">{selectedText}</span>"
            </p>
          )}
        </div>
        
        {/* Form */}
        <div className="px-6 py-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            URL
          </label>
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-all duration-200"
            placeholder="https://example.com"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
              if (e.key === 'Escape') handleClose();
            }}
            autoFocus
          />
        </div>
        
        {/* Buttons */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end space-x-3 bg-gray-50 dark:bg-gray-800 rounded-b-xl">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!url.trim()}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Add Link
          </button>
        </div>
      </div>
    </div>
  );
}