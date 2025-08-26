/**
 * Verification Service Tests
 * Tests for Merkle tree operations and verification logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BrowserVerificationService, type MerkleProof } from '../verification'
import { MerkleTree } from 'merkletreejs'
import { sha256 } from '@noble/hashes/sha2'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          single: vi.fn(),
          limit: vi.fn(() => ({ single: vi.fn() }))
        }))
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/client-simple', () => ({
  createSupabaseBrowserClient: () => mockSupabaseClient
}))

describe('BrowserVerificationService', () => {
  let service: BrowserVerificationService
  
  beforeEach(() => {
    service = new BrowserVerificationService()
    vi.clearAllMocks()
  })

  describe('generateMerkleTree', () => {
    it('should create Merkle tree from journal entries', async () => {
      const mockEntries = [
        { content_hash: 'hash1', sequence: 1 },
        { content_hash: 'hash2', sequence: 2 },
        { content_hash: 'hash3', sequence: 3 }
      ]

      mockSupabaseClient.from().select().eq().order.mockReturnValue({
        single: vi.fn()
      })
      
      // Mock the chain to return our test data
      const orderMock = mockSupabaseClient.from().select().eq().order()
      orderMock.single = vi.fn().mockResolvedValue({
        data: mockEntries,
        error: null
      })

      const tree = await service.generateMerkleTree('test-journal-id')
      
      expect(tree).toBeInstanceOf(MerkleTree)
      expect(tree.getLeaves()).toHaveLength(3)
    })

    it('should throw error for empty journal', async () => {
      mockSupabaseClient.from().select().eq().order().single = vi.fn().mockResolvedValue({
        data: [],
        error: null
      })

      await expect(service.generateMerkleTree('empty-journal'))
        .rejects.toThrow('No journal entries found')
    })

    it('should throw error on database error', async () => {
      mockSupabaseClient.from().select().eq().order().single = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })

      await expect(service.generateMerkleTree('error-journal'))
        .rejects.toThrow('Failed to fetch journal entries: Database error')
    })
  })

  describe('getMerkleProof', () => {
    it('should generate valid Merkle proof', async () => {
      const mockEntries = [
        { content_hash: 'a'.repeat(64), sequence: 1 },
        { content_hash: 'b'.repeat(64), sequence: 2 },
        { content_hash: 'c'.repeat(64), sequence: 3 },
        { content_hash: 'd'.repeat(64), sequence: 4 }
      ]

      mockSupabaseClient.from().select().eq().order().single = vi.fn().mockResolvedValue({
        data: mockEntries,
        error: null
      })

      const targetHash = 'b'.repeat(64)
      const proof = await service.getMerkleProof('test-journal', targetHash)

      expect(proof.leaf).toBe(targetHash)
      expect(proof.verified).toBe(true)
      expect(proof.proof).toBeInstanceOf(Array)
      expect(proof.root).toMatch(/^[a-f0-9]{64}$/)
    })
  })
})

describe('Merkle Tree Integration', () => {
  it('should create consistent trees with same data', () => {
    const data = ['entry1', 'entry2', 'entry3', 'entry4']
    const leaves = data.map(d => Buffer.from(d))

    const tree1 = new MerkleTree(leaves, sha256, { sortPairs: true })
    const tree2 = new MerkleTree(leaves, sha256, { sortPairs: true })

    expect(tree1.getRoot().toString('hex')).toBe(tree2.getRoot().toString('hex'))
  })

  it('should verify proofs correctly', () => {
    const data = ['entry1', 'entry2', 'entry3', 'entry4']
    const leaves = data.map(d => sha256(d))
    const tree = new MerkleTree(leaves, sha256, { sortPairs: true })

    const leaf = leaves[1] // 'entry2'
    const proof = tree.getProof(leaf)
    const root = tree.getRoot()

    expect(tree.verify(proof, leaf, root)).toBe(true)
  })

  it('should reject invalid proofs', () => {
    const data = ['entry1', 'entry2', 'entry3', 'entry4']
    const leaves = data.map(d => sha256(d))
    const tree = new MerkleTree(leaves, sha256, { sortPairs: true })

    const validLeaf = leaves[1]
    const invalidLeaf = sha256('fake-entry')
    const proof = tree.getProof(validLeaf)
    const root = tree.getRoot()

    expect(tree.verify(proof, invalidLeaf, root)).toBe(false)
  })
})
