import React, { useState, useEffect, useRef } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import katex from 'katex';
import { cn } from '@/lib/utils';

export const MathNodeView = ({ node, updateAttributes, selected }: NodeViewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(node.attrs.formula);
  const containerRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (containerRef.current && !isEditing) {
      try {
        katex.render(node.attrs.formula || '?', containerRef.current, {
          throwOnError: false,
          displayMode: false,
        });
      } catch (e) {
        containerRef.current.textContent = node.attrs.formula;
      }
    }
  }, [node.attrs.formula, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
    
    // Listen for external insertions (e.g. from MathMenu)
    const handleExternalInsert = (e: any) => {
      if (isEditing) {
        const latex = e.detail;
        const start = inputRef.current?.selectionStart || 0;
        const end = inputRef.current?.selectionEnd || 0;
        const newVal = inputValue.substring(0, start) + latex + inputValue.substring(end);
        setInputValue(newVal);
        
        // Return focus to input after a short delay (menu might have stolen it)
        setTimeout(() => inputRef.current?.focus(), 10);
      }
    };

    window.addEventListener('notion-insert-math', handleExternalInsert);
    return () => window.removeEventListener('notion-insert-math', handleExternalInsert);
  }, [isEditing, inputValue]);

  const handleBlur = () => {
    setIsEditing(false);
    updateAttributes({ formula: inputValue });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue(node.attrs.formula);
    }
  };

  return (
    <NodeViewWrapper as="span" contentEditable={false} className="notion-math-node-wrapper inline-block align-middle mx-1">
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="notion-math-input h-6 px-1 text-sm bg-secondary border border-primary/50 rounded outline-none w-auto min-w-[50px] font-mono text-primary animate-in zoom-in-95 duration-200"
          style={{ width: `${Math.max(inputValue.length, 5)}ch` }}
        />
      ) : (
        <span
          ref={containerRef}
          onClick={() => setIsEditing(true)}
          className={cn(
            "notion-math-render cursor-pointer px-1.5 py-0.5 rounded transition-all duration-200 border border-transparent",
            selected ? "bg-primary/20 border-primary/40 shadow-sm" : "hover:bg-secondary/80"
          )}
          title="Click para editar fórmula"
        />
      )}
    </NodeViewWrapper>
  );
};
