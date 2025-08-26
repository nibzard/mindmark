'use client'

/**
 * Lexical Editor Component
 * Main AI-native editor with document integration
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot, $getSelection, $isRangeSelection, EditorState, type TextFormatType } from 'lexical'

import { 
  editorConfig, 
  EditorPlugins, 
  EditorUtils,
  initialEditorState 
} from '@/lib/editor/config'
import { createDocumentService, type DocumentService } from '@/lib/services/document'
import { createJournalService, type JournalService } from '@/lib/services/journal'
import { type Document, type LexicalEditorState } from '@/lib/types/database'

/**
 * Editor Props
 */
export interface LexicalEditorProps {
  documentId?: string
  initialContent?: LexicalEditorState
  placeholder?: string
  className?: string
  autoSave?: boolean
  autoSaveDelay?: number
  readOnly?: boolean
  onSave?: (content: LexicalEditorState) => void
  onChange?: (content: LexicalEditorState, wordCount: number, charCount: number) => void
  onFocus?: () => void
  onBlur?: () => void
}

/**
 * Editor Statistics
 */
interface EditorStats {
  wordCount: number
  charCount: number
  lastSaved?: Date
  isDirty: boolean
}

/**
 * Main Lexical Editor Component
 */
export function LexicalEditor({
  documentId,
  initialContent,
  placeholder = "Start writing your next masterpiece...",
  className = "",
  autoSave = true,
  autoSaveDelay = 2000,
  readOnly = false,
  onSave,
  onChange,
  onFocus,
  onBlur
}: LexicalEditorProps) {
  const [stats, setStats] = useState<EditorStats>({
    wordCount: 0,
    charCount: 0,
    isDirty: false
  })
  
  const documentService = useRef<DocumentService>(createDocumentService())
  const journalService = useRef<JournalService>(createJournalService())
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize editor with content
  const editorConfigWithContent = {
    ...editorConfig,
    editorState: initialContent ? JSON.stringify(initialContent) : initialEditorState,
    editable: !readOnly
  }

  /**
   * Handle editor content changes
   */
  const handleChange = useCallback((editorState: EditorState, editor: any) => {
    const content = editorState.toJSON() as LexicalEditorState
    const wordCount = EditorUtils.getWordCount(editorState)
    const charCount = EditorUtils.getCharCount(editorState)

    // Update statistics
    setStats(prev => ({
      ...prev,
      wordCount,
      charCount,
      isDirty: true
    }))

    // Call onChange callback
    onChange?.(content, wordCount, charCount)

    // Handle auto-save
    if (autoSave && documentId) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      // Set new timeout
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave(content)
      }, autoSaveDelay)
    }
  }, [documentId, autoSave, autoSaveDelay, onChange])

  /**
   * Handle auto-save
   */
  const handleAutoSave = useCallback(async (content: LexicalEditorState) => {
    if (!documentId) return

    try {
      await documentService.current.autoSave(documentId, content)
      setStats(prev => ({
        ...prev,
        lastSaved: new Date(),
        isDirty: false
      }))
    } catch (error) {
      console.error('Auto-save failed:', error)
      // Auto-save failures are non-critical, just log them
    }
  }, [documentId])

  /**
   * Manual save function
   */
  const handleSave = useCallback(async () => {
    if (!documentId) return

    const [editor] = useLexicalComposerContext()
    const editorState = editor.getEditorState()
    const content = editorState.toJSON() as LexicalEditorState

    try {
      if (onSave) {
        onSave(content)
      } else {
        await documentService.current.autoSave(documentId, content)
      }
      
      setStats(prev => ({
        ...prev,
        lastSaved: new Date(),
        isDirty: false
      }))
    } catch (error) {
      console.error('Save failed:', error)
      // Handle save error - could show toast notification
    }
  }, [documentId, onSave])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className={`lexical-editor ${className}`}>
      <LexicalComposer initialConfig={editorConfigWithContent}>
        <div className="relative">
          {/* Main Editor */}
          <div className="relative min-h-96 border border-gray-200 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700">
            <EditorPlugins
              onChange={handleChange}
              placeholder={placeholder}
              contentEditable={
                <ContentEditable 
                  className="focus:outline-none min-h-96 p-6 resize-none"
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              }
            />
          </div>

          {/* Editor Footer */}
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <span>{stats.wordCount} words</span>
              <span>{stats.charCount} characters</span>
              {stats.lastSaved && (
                <span>
                  Last saved: {stats.lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {stats.isDirty && (
                <span className="text-orange-500">Unsaved changes</span>
              )}
              {autoSave && (
                <span className="text-green-500">Auto-save enabled</span>
              )}
            </div>
          </div>
        </div>
      </LexicalComposer>
    </div>
  )
}

/**
 * Editor Toolbar Component
 * Rich text formatting controls
 */
export interface EditorToolbarProps {
  className?: string
}

export function EditorToolbar({ className = "" }: EditorToolbarProps) {
  const [editor] = useLexicalComposerContext()
  
  const formatText = useCallback((format: TextFormatType) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        selection.formatText(format)
      }
    })
  }, [editor])

  return (
    <div className={`editor-toolbar flex items-center space-x-2 p-2 border-b border-gray-200 ${className}`}>
      <button
        onClick={() => formatText('bold')}
        className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
        title="Bold"
      >
        <strong>B</strong>
      </button>
      
      <button
        onClick={() => formatText('italic')}
        className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
        title="Italic"
      >
        <em>I</em>
      </button>
      
      <button
        onClick={() => formatText('underline')}
        className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
        title="Underline"
      >
        <u>U</u>
      </button>
    </div>
  )
}

