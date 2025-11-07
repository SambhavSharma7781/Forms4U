"use client";

import React, { useState, useEffect } from 'react';

interface RichTextToolbarProps {
  isVisible: boolean;
  onFormat: (command: string, value?: string, savedRange?: Range, savedText?: string) => void;
}

export default function RichTextToolbar({ isVisible, onFormat }: RichTextToolbarProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);
  const [selectedText, setSelectedText] = useState('');

  // Save selection when toolbar becomes visible
  useEffect(() => {
    if (isVisible) {
      // Immediate check for selection
      const selection = window.getSelection();
      
      if (selection && selection.rangeCount > 0) {
        const selectedText = selection.toString().trim();
        
        if (selectedText !== '') {
          const range = selection.getRangeAt(0);
          setSavedSelection(range.cloneRange());
          setSelectedText(selectedText);
        } else {
          setSavedSelection(null);
          setSelectedText('');
        }
      } else {
        setSavedSelection(null);
        setSelectedText('');
      }
    } else {
      // Reset when toolbar is hidden
      setSavedSelection(null);
      setSelectedText('');
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const handleBold = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFormat('bold');
  };

  const handleItalic = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFormat('italic');
  };

  const handleUnderline = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFormat('underline');
  };

  const handleLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (showLinkInput) {
      if (linkUrl) {
        // Add proper URL format if missing protocol
        let formattedUrl = linkUrl;
        if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
          formattedUrl = 'https://' + linkUrl;
        }
        
        // Pass saved selection data to format function
        onFormat('createLink', formattedUrl, savedSelection || undefined, selectedText || undefined);
        setLinkUrl('');
        setSavedSelection(null);
        setSelectedText('');
      }
      setShowLinkInput(false);
    } else {
      if (selectedText) {
        // Text is selected, show input
        setShowLinkInput(true);
      } else {
        // No text selected, show input for URL
        setShowLinkInput(true);
      }
    }
  };

  const handleRemoveFormatting = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFormat('removeFormat');
  };

  return (
    <div 
      className="border border-gray-200 rounded-lg bg-white shadow-lg p-2 flex items-center space-x-1 mt-2 animate-fade-in-up"
      onMouseDown={(e) => {
        // Prevent selection loss when clicking toolbar
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Bold */}
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleBold(e);
        }}
        className="p-2 hover:bg-gray-100 rounded-md text-sm font-bold border border-transparent hover:border-gray-300 transition-all min-w-[32px] h-8 flex items-center justify-center"
        title="Bold (⌘B)"
      >
        B
      </button>

      {/* Italic */}
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleItalic(e);
        }}
        className="p-2 hover:bg-gray-100 rounded-md text-sm italic border border-transparent hover:border-gray-300 transition-all min-w-[32px] h-8 flex items-center justify-center"
        title="Italic (⌘I)"
      >
        I
      </button>

      {/* Underline */}
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleUnderline(e);
        }}
        className="p-2 hover:bg-gray-100 rounded-md text-sm underline border border-transparent hover:border-gray-300 transition-all min-w-[32px] h-8 flex items-center justify-center"
        title="Underline (⌘U)"
      >
        U
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1"></div>

      {/* Link */}
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleLink(e);
        }}
        className={`p-2 hover:bg-gray-100 rounded-md text-sm border border-transparent hover:border-gray-300 transition-all min-w-[32px] h-8 flex items-center justify-center ${
          showLinkInput ? 'bg-blue-50 border-blue-300' : selectedText ? 'bg-green-50 border-green-300' : ''
        }`}
        title={selectedText ? `Add Link to "${selectedText}"` : "Insert Link"}
      >
        🔗
      </button>

      {/* Remove Formatting */}
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleRemoveFormatting(e);
        }}
        className="p-2 hover:bg-gray-100 rounded-md text-sm border border-transparent hover:border-gray-300 transition-all min-w-[32px] h-8 flex items-center justify-center"
        title="Remove Formatting"
      >
        🧹
      </button>

      {/* Link Input */}
      {showLinkInput && (
        <div className="flex items-center space-x-2 ml-2 pl-2 border-l border-gray-300">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder={selectedText ? `Enter URL for "${selectedText}"` : "https://example.com"}
            className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (linkUrl) {
                  // Add proper URL format if missing protocol
                  let formattedUrl = linkUrl;
                  if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
                    formattedUrl = 'https://' + linkUrl;
                  }
                  
                  // Pass saved selection data to format function
                  onFormat('createLink', formattedUrl, savedSelection || undefined, selectedText || undefined);
                  setLinkUrl('');
                  setSavedSelection(null);
                  setSelectedText('');
                }
                setShowLinkInput(false);
              }
              if (e.key === 'Escape') {
                setShowLinkInput(false);
                setLinkUrl('');
                setSavedSelection(null);
                setSelectedText('');
              }
            }}
            autoFocus
          />
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (linkUrl) {
                // Add proper URL format if missing protocol
                let formattedUrl = linkUrl;
                if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
                  formattedUrl = 'https://' + linkUrl;
                }
                
                // Pass saved selection data to format function
                onFormat('createLink', formattedUrl, savedSelection || undefined, selectedText || undefined);
                setLinkUrl('');
                setSavedSelection(null);
                setSelectedText('');
              }
              setShowLinkInput(false);
            }}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}