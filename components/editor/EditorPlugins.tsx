'use client'

/**
 * Lexical Editor Plugins
 * Additional plugins for enhanced editor functionality
 */

import React from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin'
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin'

/**
 * Auto-save Plugin
 * Handles automatic saving of editor content
 */
export interface AutoSavePluginProps {
  onSave: (editorState: any) => void
  delay?: number
}

export function AutoSavePlugin({ onSave, delay = 2000 }: AutoSavePluginProps) {
  const [editor] = useLexicalComposerContext()
  
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout
    
    const handleEditorChange = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        const editorState = editor.getEditorState()
        onSave(editorState.toJSON())
      }, delay)
    }

    return editor.registerUpdateListener(({ editorState }) => {
      handleEditorChange()
    })
  }, [editor, onSave, delay])

  return null
}

/**
 * Focus Plugin
 * Manages editor focus events
 */
export interface FocusPluginProps {
  onFocus?: () => void
  onBlur?: () => void
}

export function FocusPlugin({ onFocus, onBlur }: FocusPluginProps) {
  const [editor] = useLexicalComposerContext()
  
  React.useEffect(() => {
    const rootElement = editor.getRootElement()
    if (!rootElement) return

    const handleFocus = () => onFocus?.()
    const handleBlur = () => onBlur?.()

    rootElement.addEventListener('focus', handleFocus)
    rootElement.addEventListener('blur', handleBlur)

    return () => {
      rootElement.removeEventListener('focus', handleFocus)
      rootElement.removeEventListener('blur', handleBlur)
    }
  }, [editor, onFocus, onBlur])

  return null
}

/**
 * Comprehensive Editor Plugins
 * Combines all necessary plugins for the editor
 */
export interface EditorPluginsProps {
  autoSave?: {
    onSave: (editorState: any) => void
    delay?: number
  }
  focus?: {
    onFocus?: () => void
    onBlur?: () => void
  }
}

export function ComprehensiveEditorPlugins({ autoSave, focus }: EditorPluginsProps) {
  return (
    <>
      {/* Rich Text Features */}
      <ListPlugin />
      <LinkPlugin />
      <CheckListPlugin />
      <TabIndentationPlugin />
      
      {/* Custom Plugins */}
      {autoSave && (
        <AutoSavePlugin 
          onSave={autoSave.onSave} 
          delay={autoSave.delay} 
        />
      )}
      
      {focus && (
        <FocusPlugin 
          onFocus={focus.onFocus} 
          onBlur={focus.onBlur} 
        />
      )}
    </>
  )
}