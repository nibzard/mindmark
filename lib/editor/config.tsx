'use client'

/**
 * Lexical Editor Configuration
 * Central configuration for the AI-native editor
 */

import * as React from 'react'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListItemNode, ListNode } from '@lexical/list'
import { CodeHighlightNode, CodeNode } from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { 
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS
} from '@lexical/markdown'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot, type EditorState } from 'lexical'

/**
 * Editor theme configuration
 * Defines styling for various editor elements
 */
export const editorTheme = {
  // Text formatting
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    underlineStrikethrough: 'underline line-through',
    code: 'bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono',
  },
  
  // Headings
  heading: {
    h1: 'text-3xl font-bold mb-4 mt-6',
    h2: 'text-2xl font-bold mb-3 mt-5',
    h3: 'text-xl font-bold mb-2 mt-4',
    h4: 'text-lg font-bold mb-2 mt-3',
    h5: 'text-base font-bold mb-1 mt-2',
    h6: 'text-sm font-bold mb-1 mt-2',
  },
  
  // Lists
  list: {
    nested: {
      listitem: 'list-none',
    },
    ol: 'list-decimal list-inside mb-4',
    ul: 'list-disc list-inside mb-4',
    listitem: 'mb-1',
  },
  
  // Code blocks
  code: 'bg-gray-100 dark:bg-gray-800 p-4 rounded-lg font-mono text-sm overflow-x-auto mb-4',
  codeHighlight: {
    atrule: 'text-blue-600',
    attr: 'text-blue-600',
    boolean: 'text-red-600',
    builtin: 'text-purple-600',
    cdata: 'text-gray-600',
    char: 'text-green-600',
    class: 'text-blue-600',
    'class-name': 'text-blue-600',
    comment: 'text-gray-500 italic',
    constant: 'text-red-600',
    deleted: 'text-red-600',
    doctype: 'text-gray-600',
    entity: 'text-red-600',
    function: 'text-purple-600',
    important: 'text-red-600',
    inserted: 'text-green-600',
    keyword: 'text-blue-600',
    namespace: 'text-blue-600',
    number: 'text-red-600',
    operator: 'text-gray-700',
    prolog: 'text-gray-600',
    property: 'text-blue-600',
    punctuation: 'text-gray-700',
    regex: 'text-green-600',
    selector: 'text-blue-600',
    string: 'text-green-600',
    symbol: 'text-red-600',
    tag: 'text-blue-600',
    url: 'text-blue-600 underline',
    variable: 'text-red-600',
  },
  
  // Quotes
  quote: 'border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4',
  
  // Links
  link: 'text-blue-600 underline hover:text-blue-800',
  
  // Paragraphs
  paragraph: 'mb-4 leading-relaxed',
}

/**
 * Editor nodes configuration
 * Defines which nodes are available in the editor
 */
export const editorNodes = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  CodeHighlightNode,
  AutoLinkNode,
  LinkNode,
]

/**
 * Initial editor state
 * Empty state with basic paragraph
 */
export const initialEditorState = JSON.stringify({
  root: {
    children: [
      {
        children: [],
        direction: null,
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
})

/**
 * Markdown transformers for import/export
 */
export const markdownTransformers = TRANSFORMERS

/**
 * Editor configuration object
 */
export const editorConfig = {
  namespace: 'MindmarkEditor',
  theme: editorTheme,
  nodes: editorNodes,
  onError: (error: Error) => {
    console.error('Lexical editor error:', error)
  },
}

/**
 * Common editor plugins
 */
export interface EditorPluginsProps {
  onChange?: (editorState: EditorState, editor: any) => void
  placeholder?: string
  contentEditable?: React.ReactElement
}

export function EditorPlugins({ onChange, placeholder = "Start writing...", contentEditable }: EditorPluginsProps) {
  return (
    <>
      <RichTextPlugin
        contentEditable={contentEditable || <ContentEditable className="focus:outline-none min-h-32 p-4" />}
        placeholder={<div className="absolute top-4 left-4 text-gray-500 pointer-events-none">{placeholder}</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <MarkdownShortcutPlugin transformers={markdownTransformers} />
      {onChange && <OnChangePlugin onChange={onChange} />}
    </>
  )
}

/**
 * Utility functions for editor state manipulation
 */
export class EditorUtils {
  /**
   * Convert editor state to markdown
   */
  static toMarkdown(editorState: EditorState): string {
    return editorState.read(() => $convertToMarkdownString(markdownTransformers))
  }

  /**
   * Convert markdown to editor state
   * Note: This function should be called within an editor update context
   */
  static fromMarkdown(markdown: string, editor: any): void {
    try {
      editor.update(() => {
        $convertFromMarkdownString(markdown, markdownTransformers)
      })
    } catch (error) {
      console.error('Failed to convert markdown to editor state:', error)
    }
  }

  /**
   * Get plain text from editor state
   */
  static toPlainText(editorState: EditorState): string {
    return editorState.read(() => {
      const root = $getRoot()
      return root.getTextContent()
    })
  }

  /**
   * Get word count from editor state
   */
  static getWordCount(editorState: EditorState): number {
    const text = this.toPlainText(editorState)
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  /**
   * Get character count from editor state
   */
  static getCharCount(editorState: EditorState): number {
    return this.toPlainText(editorState).length
  }
}