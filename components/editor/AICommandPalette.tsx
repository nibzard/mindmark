'use client'

/**
 * AI Command Palette
 * Command palette for AI interactions within the editor
 */

import React, { useCallback, useEffect, useState, useRef } from 'react'
import { Command } from 'cmdk'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { 
  $getSelection, 
  $createParagraphNode, 
  $createTextNode,
  $insertNodes,
  $isRangeSelection,
  SELECTION_CHANGE_COMMAND
} from 'lexical'
import { useHotkeys } from 'react-hotkeys-hook'

import { useAI } from '@/lib/hooks/useAI'
import { 
  WRITING_PROMPTS, 
  type PromptTemplate, 
  type AIModelConfig 
} from '@/lib/types/ai'

/**
 * Command Palette Props
 */
export interface AICommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  journalId?: string
  documentId?: string
  className?: string
}

/**
 * AI Model Options
 */
const AI_MODELS: Array<{ value: AIModelConfig; label: string; description: string }> = [
  {
    value: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.7 },
    label: 'GPT-4o Mini',
    description: 'Fast and cost-effective for most tasks'
  },
  {
    value: { provider: 'openai', model: 'gpt-4o', temperature: 0.7 },
    label: 'GPT-4o',
    description: 'Most capable model for complex tasks'
  },
  {
    value: { provider: 'anthropic', model: 'claude-3-haiku-20240307', temperature: 0.7 },
    label: 'Claude 3 Haiku',
    description: 'Fast and affordable for simple tasks'
  },
  {
    value: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.7 },
    label: 'Claude 3.5 Sonnet',
    description: 'Excellent for writing and analysis'
  }
]

/**
 * Command Types
 */
type CommandType = 
  | 'prompt'
  | 'continue'
  | 'improve'
  | 'expand'
  | 'summarize'
  | 'tone'
  | 'custom'

interface Command {
  id: string
  type: CommandType
  title: string
  description: string
  shortcut?: string
  template?: PromptTemplate
}

/**
 * Available Commands
 */
const COMMANDS: Command[] = [
  {
    id: 'continue',
    type: 'continue',
    title: 'Continue Writing',
    description: 'Continue the text naturally',
    shortcut: 'Ctrl+Enter',
    template: WRITING_PROMPTS['continue-writing']
  },
  {
    id: 'improve',
    type: 'improve',
    title: 'Improve Clarity',
    description: 'Make text clearer and more concise',
    template: WRITING_PROMPTS['improve-clarity']
  },
  {
    id: 'expand',
    type: 'expand',
    title: 'Expand Ideas',
    description: 'Develop and expand on ideas',
    template: WRITING_PROMPTS['expand-ideas']
  },
  {
    id: 'summarize',
    type: 'summarize',
    title: 'Summarize',
    description: 'Create a concise summary',
    template: WRITING_PROMPTS['summarize']
  },
  {
    id: 'tone-casual',
    type: 'tone',
    title: 'Make More Casual',
    description: 'Adjust tone to be more casual',
    template: { ...WRITING_PROMPTS['change-tone'], user: WRITING_PROMPTS['change-tone'].user.replace('{{tone}}', 'casual') }
  },
  {
    id: 'tone-formal',
    type: 'tone',
    title: 'Make More Formal',
    description: 'Adjust tone to be more formal',
    template: { ...WRITING_PROMPTS['change-tone'], user: WRITING_PROMPTS['change-tone'].user.replace('{{tone}}', 'formal') }
  },
  {
    id: 'custom',
    type: 'custom',
    title: 'Custom Prompt',
    description: 'Enter your own prompt',
  }
]

/**
 * AI Command Palette Component
 */
export function AICommandPalette({
  isOpen,
  onClose,
  journalId,
  documentId,
  className = ""
}: AICommandPaletteProps) {
  const [editor] = useLexicalComposerContext()
  const [selectedModel, setSelectedModel] = useState<AIModelConfig>(AI_MODELS[0].value)
  const [customPrompt, setCustomPrompt] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  const aiHook = useAI({
    journalId,
    defaultModel: selectedModel,
    autoCapture: true
  })

  // Get selected text when palette opens
  useEffect(() => {
    if (isOpen) {
      editor.getEditorState().read(() => {
        const selection = $getSelection()
        if (selection && selection.getTextContent) {
          setSelectedText(selection.getTextContent())
        }
      })
    }
  }, [isOpen, editor])

  // Hotkey to open palette
  useHotkeys('mod+k', (e) => {
    e.preventDefault()
    if (!isOpen) {
      // Open palette logic would be handled by parent
    }
  })

  // Hotkey for continue writing
  useHotkeys('mod+enter', (e) => {
    e.preventDefault()
    handleCommand(COMMANDS.find(c => c.id === 'continue')!)
  })

  /**
   * Handle command execution
   */
  const handleCommand = useCallback(async (command: Command) => {
    if (!command.template && command.type !== 'custom') return

    let prompt = ''
    let targetText = selectedText

    if (command.type === 'custom') {
      prompt = customPrompt
      if (!prompt.trim()) return
    } else if (command.template) {
      // Get content based on command type
      if (['continue', 'improve', 'expand', 'tone'].includes(command.type)) {
        // Use selected text or get text around cursor
        if (!targetText) {
          targetText = await getCurrentParagraphText()
        }
      }

      // Replace template variables
      prompt = command.template.user.replace('{{content}}', targetText)
    }

    try {
      // Generate AI response
      const response = await aiHook.generateText(prompt, {
        modelConfig: selectedModel,
        journalId,
        selectionRange: selectedText ? [0, selectedText.length] : undefined,
        context: {
          documentId
        }
      })

      if (response) {
        // Insert AI response into editor
        insertAIResponse(response.content, command.type)
      }
    } catch (error) {
      console.error('AI command failed:', error)
      // Could show error notification here
    }

    // Close palette
    onClose()
    setCustomPrompt('')
    setSearchQuery('')
  }, [selectedText, customPrompt, selectedModel, journalId, documentId, aiHook, onClose])

  /**
   * Get current paragraph text
   */
  const getCurrentParagraphText = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      editor.getEditorState().read(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode()
          const parent = anchorNode.getParent()
          resolve(parent?.getTextContent() || '')
        } else {
          resolve('')
        }
      })
    })
  }, [editor])

  /**
   * Insert AI response into editor
   */
  const insertAIResponse = useCallback((text: string, commandType: CommandType) => {
    editor.update(() => {
      const selection = $getSelection()
      
      if (commandType === 'continue') {
        // Insert at cursor position
        if (selection) {
          const textNode = $createTextNode(text)
          selection.insertNodes([textNode])
        }
      } else if (['improve', 'tone'].includes(commandType) && selectedText) {
        // Replace selected text
        if (selection) {
          selection.insertText(text)
        }
      } else {
        // Insert as new paragraph
        const paragraphNode = $createParagraphNode()
        const textNode = $createTextNode(text)
        paragraphNode.append(textNode)
        
        if (selection) {
          selection.insertNodes([paragraphNode])
        }
      }
    })
  }, [editor, selectedText])

  /**
   * Filter commands based on search
   */
  const filteredCommands = COMMANDS.filter(command => 
    command.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    command.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-start justify-center pt-32 ${className}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Command Palette */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl mx-4">
        <Command shouldFilter={false}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold">AI Assistant</h3>
            <div className="flex items-center space-x-2">
              <select
                value={AI_MODELS.findIndex(m => m.value.model === selectedModel.model)}
                onChange={(e) => setSelectedModel(AI_MODELS[parseInt(e.target.value)].value)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                {AI_MODELS.map((model, index) => (
                  <option key={index} value={index}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search */}
          <Command.Input
            placeholder="Search commands or enter custom prompt..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="w-full p-4 border-b border-gray-200 dark:border-gray-700 focus:outline-none"
          />

          {/* Command List */}
          <Command.List className="max-h-96 overflow-y-auto">
            <Command.Empty className="p-4 text-center text-gray-500">
              No commands found.
            </Command.Empty>

            <Command.Group>
              {filteredCommands.map((command) => (
                <Command.Item
                  key={command.id}
                  onSelect={() => handleCommand(command)}
                  className="flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <div>
                    <div className="font-medium">{command.title}</div>
                    <div className="text-sm text-gray-500">{command.description}</div>
                  </div>
                  {command.shortcut && (
                    <kbd className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded">
                      {command.shortcut}
                    </kbd>
                  )}
                </Command.Item>
              ))}

              {/* Custom Prompt */}
              {searchQuery && !filteredCommands.some(c => c.type === 'custom') && (
                <Command.Item
                  onSelect={() => {
                    setCustomPrompt(searchQuery)
                    handleCommand(COMMANDS.find(c => c.id === 'custom')!)
                  }}
                  className="flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <div>
                    <div className="font-medium">Use as custom prompt</div>
                    <div className="text-sm text-gray-500">"{searchQuery}"</div>
                  </div>
                </Command.Item>
              )}
            </Command.Group>
          </Command.List>

          {/* Footer */}
          {selectedText && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Selected text: "{selectedText.substring(0, 100)}{selectedText.length > 100 ? '...' : ''}"
              </div>
            </div>
          )}
        </Command>
      </div>
    </div>
  )
}