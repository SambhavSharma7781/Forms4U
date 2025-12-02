"use client";

import { useState, useRef, useEffect } from 'react';
import LinkModal from './LinkModal';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder, 
  className = "", 
  style = {} 
}: RichTextEditorProps) {
  const [showToolbar, setShowToolbar] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  };

  const handleFocus = () => {
    setShowToolbar(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Hide toolbar only if not clicking on it
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !relatedTarget.closest('.rich-text-toolbar')) {
      setTimeout(() => setShowToolbar(false), 150);
    }
  };

  const handleSelectionChange = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setShowToolbar(true);
    }
  };

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const addLink = () => {
    const selection = window.getSelection();
    
    if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
      const selectedText = selection.toString().trim();
      const range = selection.getRangeAt(0).cloneRange();
      
      setSelectedText(selectedText);
      setSavedRange(range);
      setShowLinkModal(true);
    }
  };    const handleLinkConfirm = (url: string) => {
    if (!savedRange) return;
    
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    // Restore selection
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
      
      // Create link
      const linkElement = document.createElement('a');
      linkElement.href = formattedUrl;
      linkElement.target = '_blank';
      linkElement.style.color = '#007bff';
      linkElement.style.textDecoration = 'underline';
      linkElement.textContent = selectedText;
      
      // Replace selected content
      savedRange.deleteContents();
      savedRange.insertNode(linkElement);
      
      // Clear selection and update content
      selection.removeAllRanges();
      onChange(editorRef.current?.innerHTML || '');
    }
    
    setShowLinkModal(false);
    setSelectedText('');
    setSavedRange(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          formatText('bold');
          break;
        case 'i':
          e.preventDefault();
          formatText('italic');
          break;
        case 'u':
          e.preventDefault();
          formatText('underline');
          break;
      }
    }
  };

  return (
    <div className="relative">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onFocus={handleFocus}
        onBlur={handleBlur}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onMouseUp={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        className={`${className} focus:outline-none rich-text-content`}
        style={style}
      />
      
      {/* Placeholder */}
      {(!value || value === '<br>' || value.replace(/<[^>]*>/g, '').trim() === '') && (
        <div 
          className="absolute top-0 left-0 pointer-events-none text-gray-500 select-none flex items-center"
          style={{...style, height: style?.minHeight || 'auto'}}
        >
          {placeholder}
        </div>
      )}

      {/* Simple Toolbar */}
      {showToolbar && (
        <div className="rich-text-toolbar border border-gray-200 rounded-lg bg-white shadow-lg p-2 flex items-center space-x-1 mt-2 animate-fade-in-up">
          
          {/* Bold */}
          <button
            onMouseDown={(e) => { e.preventDefault(); formatText('bold'); }}
            className="p-2 hover:bg-gray-100 rounded-md text-sm font-bold border border-transparent hover:border-gray-300 transition-all min-w-[32px] h-8 flex items-center justify-center"
            title="Bold (⌘B)"
          >
            B
          </button>

          {/* Italic */}
          <button
            onMouseDown={(e) => { e.preventDefault(); formatText('italic'); }}
            className="p-2 hover:bg-gray-100 rounded-md text-sm italic border border-transparent hover:border-gray-300 transition-all min-w-[32px] h-8 flex items-center justify-center"
            title="Italic (⌘I)"
          >
            I
          </button>

          {/* Underline */}
          <button
            onMouseDown={(e) => { e.preventDefault(); formatText('underline'); }}
            className="p-2 hover:bg-gray-100 rounded-md text-sm underline border border-transparent hover:border-gray-300 transition-all min-w-[32px] h-8 flex items-center justify-center"
            title="Underline (⌘U)"
          >
            U
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1"></div>

          {/* Link */}
          <button
            onMouseDown={(e) => { e.preventDefault(); addLink(); }}
            className="p-2 hover:bg-gray-100 rounded-md text-sm border border-transparent hover:border-gray-300 transition-all min-w-[32px] h-8 flex items-center justify-center"
            title="Add Link"
          >
            🔗
          </button>

          {/* Remove Formatting */}
          <button
            onMouseDown={(e) => { e.preventDefault(); formatText('removeFormat'); }}
            className="p-2 hover:bg-gray-100 rounded-md text-sm border border-transparent hover:border-gray-300 transition-all min-w-[32px] h-8 flex items-center justify-center"
            title="Remove Formatting"
          >
            🧹
          </button>

        </div>
      )}

      {/* Link Modal */}
      <LinkModal
        isOpen={showLinkModal}
        onClose={() => {
          setShowLinkModal(false);
          setSelectedText('');
          setSavedRange(null);
        }}
        onConfirm={handleLinkConfirm}
        selectedText={selectedText}
      />
    </div>
  );
}