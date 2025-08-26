/**
 * Journal Service Tests
 * Tests for cryptographic hash chain validation and journal operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HashChain } from '../journal'
import type { HashChainEntry } from '@/lib/types/database'

describe('HashChain', () => {
  describe('hash', () => {
    it('should generate consistent SHA-256 hashes', () => {
      const content = 'test content'
      const hash1 = HashChain.hash(content)
      const hash2 = HashChain.hash(content)
      
      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64) // SHA-256 produces 64 character hex string
      expect(hash1).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should generate different hashes for different content', () => {
      const hash1 = HashChain.hash('content1')
      const hash2 = HashChain.hash('content2')
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('createEntry', () => {
    it('should create proper hash chain entry', () => {
      const content = 'test content'
      const prevHash = 'abcd1234'
      
      const entry = HashChain.createEntry(content, prevHash)
      
      expect(entry.contentHash).toBe(HashChain.hash(content))
      expect(entry.chainedHash).toBe(HashChain.hash(prevHash + entry.contentHash))
    })

    it('should handle empty previous hash', () => {
      const content = 'first entry'
      const entry = HashChain.createEntry(content, '')
      
      expect(entry.contentHash).toBe(HashChain.hash(content))
      expect(entry.chainedHash).toBe(HashChain.hash('' + entry.contentHash))
    })
  })

  describe('validateChain', () => {
    it('should validate empty chain', () => {
      expect(HashChain.validateChain([])).toBe(true)
    })

    it('should validate single entry chain', () => {
      const entries: HashChainEntry[] = [
        {
          sequence: 1,
          content_hash: 'hash1',
          prev_hash: '',
          timestamp: '2024-01-01T00:00:00Z'
        }
      ]
      
      expect(HashChain.validateChain(entries)).toBe(true)
    })

    it('should validate proper hash chain', () => {
      const entries: HashChainEntry[] = [
        {
          sequence: 1,
          content_hash: 'hash1',
          prev_hash: '',
          timestamp: '2024-01-01T00:00:00Z'
        },
        {
          sequence: 2,
          content_hash: 'hash2',
          prev_hash: 'hash1',
          timestamp: '2024-01-01T00:01:00Z'
        },
        {
          sequence: 3,
          content_hash: 'hash3',
          prev_hash: 'hash2',
          timestamp: '2024-01-01T00:02:00Z'
        }
      ]
      
      expect(HashChain.validateChain(entries)).toBe(true)
    })

    it('should reject broken hash chain', () => {
      const entries: HashChainEntry[] = [
        {
          sequence: 1,
          content_hash: 'hash1',
          prev_hash: '',
          timestamp: '2024-01-01T00:00:00Z'
        },
        {
          sequence: 2,
          content_hash: 'hash2',
          prev_hash: 'wrong_hash', // Should be 'hash1'
          timestamp: '2024-01-01T00:01:00Z'
        }
      ]
      
      expect(HashChain.validateChain(entries)).toBe(false)
    })

    it('should handle out-of-order entries', () => {
      const entries: HashChainEntry[] = [
        {
          sequence: 3,
          content_hash: 'hash3',
          prev_hash: 'hash2',
          timestamp: '2024-01-01T00:02:00Z'
        },
        {
          sequence: 1,
          content_hash: 'hash1',
          prev_hash: '',
          timestamp: '2024-01-01T00:00:00Z'
        },
        {
          sequence: 2,
          content_hash: 'hash2',
          prev_hash: 'hash1',
          timestamp: '2024-01-01T00:01:00Z'
        }
      ]
      
      expect(HashChain.validateChain(entries)).toBe(true)
    })
  })
})

describe('Journal Integration Tests', () => {
  it('should create valid hash chain in practice', () => {
    const entries: string[] = ['First entry', 'Second entry', 'Third entry']
    const chainEntries: HashChainEntry[] = []
    
    let prevHash = ''
    entries.forEach((content, index) => {
      const { contentHash } = HashChain.createEntry(content, prevHash)
      
      chainEntries.push({
        sequence: index + 1,
        content_hash: contentHash,
        prev_hash: prevHash,
        timestamp: new Date().toISOString()
      })
      
      prevHash = contentHash
    })
    
    expect(HashChain.validateChain(chainEntries)).toBe(true)
  })
})
