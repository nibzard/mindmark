'use client'

/**
 * Enhanced Editor Toolbar
 * Rich text formatting controls for the Lexical editor
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
  $createParagraphNode,
  $getRoot,
  type TextFormatType
} from 'lexical'
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  HeadingTagType
} from '@lexical/rich-text'
import {
  $createCodeNode,
  $isCodeNode
} from '@lexical/code'
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND
} from '@lexical/list'

/**
 * Toolbar Button Props
 */
interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title?: string
  className?: string
  children: React.ReactNode
}

/**
 * Toolbar Button Component
 */
function ToolbarButton({ 
  onClick, 
  active = false, 
  disabled = false, 
  title, 
  className = "", 
  children 
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        px-3 py-2 text-sm border border-gray-300 rounded 
        hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed
        ${active ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white text-gray-700'}
        ${className}
      `}
    >
      {children}
    </button>
  )
}

/**
 * Divider Component
 */
function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-300 mx-2" />
}

/**
 * Enhanced Editor Toolbar
 */
export interface EnhancedEditorToolbarProps {
  className?: string
}

export function EnhancedEditorToolbar({ className = "" }: EnhancedEditorToolbarProps) {
  const [editor] = useLexicalComposerContext()
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set())
  const [blockType, setBlockType] = useState<string>('paragraph')
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  /**
   * Update toolbar state based on selection
   */
  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    
    if ($isRangeSelection(selection)) {
      // Update text formatting state
      const formats = new Set<string>()
      if (selection.hasFormat('bold')) formats.add('bold')
      if (selection.hasFormat('italic')) formats.add('italic')
      if (selection.hasFormat('underline')) formats.add('underline')
      if (selection.hasFormat('strikethrough')) formats.add('strikethrough')
      if (selection.hasFormat('code')) formats.add('code')
      
      setActiveFormats(formats)

      // Update block type
      const anchorNode = selection.anchor.getNode()
      const topLevelElement = anchorNode.getTopLevelElement()
      
      if ($isHeadingNode(topLevelElement)) {
        setBlockType(topLevelElement.getTag())
      } else if ($isQuoteNode(topLevelElement)) {
        setBlockType('quote')
      } else if ($isCodeNode(topLevelElement)) {
        setBlockType('code')
      } else if ($isListNode(topLevelElement)) {
        setBlockType('list')
      } else {
        setBlockType('paragraph')
      }
    }
  }, [])

  /**
   * Handle text formatting
   */
  const formatText = useCallback((format: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)
  }, [editor])

  /**
   * Handle block formatting
   */
  const formatBlock = useCallback((blockType: string) => {
    if (blockType === 'paragraph') {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const paragraphNode = $createParagraphNode()
          selection.insertNodes([paragraphNode])
        }
      })
    } else if (blockType.startsWith('h')) {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const headingNode = $createHeadingNode(blockType as HeadingTagType)
          selection.insertNodes([headingNode])
        }
      })
    } else if (blockType === 'quote') {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const quoteNode = $createQuoteNode()
          selection.insertNodes([quoteNode])
        }
      })
    } else if (blockType === 'code') {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const codeNode = $createCodeNode()
          selection.insertNodes([codeNode])
        }
      })
    }
  }, [editor])

  /**
   * Handle list formatting
   */
  const formatList = useCallback((listType: 'ul' | 'ol') => {
    if (listType === 'ul') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
    } else {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
    }
  }, [editor])

  /**
   * Handle alignment
   */
  const formatAlignment = useCallback((alignment: 'left' | 'center' | 'right' | 'justify') => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment)
  }, [editor])

  /**
   * Clear formatting
   */
  const clearFormatting = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        // Remove all formatting by toggling off each format
        const formats: TextFormatType[] = ['bold', 'italic', 'underline', 'strikethrough', 'code']
        formats.forEach(format => {
          if (selection.hasFormat(format)) {
            selection.formatText(format)
          }
        })
      }
    })
  }, [editor])

  // Setup selection change listener
  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar()
        return false
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor, updateToolbar])

  return (
    <div className={`editor-toolbar flex items-center space-x-1 p-3 border-b border-gray-200 bg-gray-50 ${className}`}>
      {/* Text Formatting */}
      <div className="flex items-center space-x-1">
        <ToolbarButton
          onClick={() => formatText('bold')}
          active={activeFormats.has('bold')}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => formatText('italic')}
          active={activeFormats.has('italic')}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => formatText('underline')}
          active={activeFormats.has('underline')}
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => formatText('strikethrough')}
          active={activeFormats.has('strikethrough')}
          title="Strikethrough"
        >
          <s>S</s>
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => formatText('code')}
          active={activeFormats.has('code')}
          title="Inline Code"
        >
          <code>{'<>'}</code>
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      {/* Block Types */}
      <div className="flex items-center space-x-1">
        <select
          value={blockType}
          onChange={(e) => formatBlock(e.target.value)}
          className="px-2 py-1 text-sm border border-gray-300 rounded bg-white"
        >
          <option value="paragraph">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="h5">Heading 5</option>
          <option value="h6">Heading 6</option>
          <option value="quote">Quote</option>
          <option value="code">Code Block</option>
        </select>
      </div>

      <ToolbarDivider />

      {/* Lists */}
      <div className="flex items-center space-x-1">
        <ToolbarButton
          onClick={() => formatList('ul')}
          title="Bullet List"
        >
          <span>• List</span>
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => formatList('ol')}
          title="Numbered List"
        >
          <span>1. List</span>
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      {/* Alignment */}
      <div className="flex items-center space-x-1">
        <ToolbarButton
          onClick={() => formatAlignment('left')}
          title="Align Left"
        >
          ⫸
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => formatAlignment('center')}
          title="Align Center"
        >
          ≡
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => formatAlignment('right')}
          title="Align Right"
        >
          ⫷
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => formatAlignment('justify')}
          title="Justify"
        >
          ≣
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      {/* Utilities */}
      <div className="flex items-center space-x-1">
        <ToolbarButton
          onClick={clearFormatting}
          title="Clear Formatting"
        >
          ✕
        </ToolbarButton>
      </div>
    </div>
  )
}