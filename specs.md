# Mindmark - Product Specifications
## AI-Native Writing Platform with Process Verification

### Core Product Vision
A platform where writers create immutable process journals alongside their work, making creative thinking legible and verifiable in an AI-dominated future.

### Target Users
- **Primary**: Professional writers, journalists, researchers, content creators
- **Secondary**: Publishers, employers, educational institutions
- **Tertiary**: Anyone who needs to demonstrate authentic human involvement in creative work

### Core Features

#### 1. Process Journal System
- **Automatic Capture**: Every AI interaction logged with timestamp
- **Inline Annotations**: Non-modal notes via `//` comments or voice
- **Prompt Evolution Tracking**: Shows thinking development over time
- **Privacy Levels**: Full journal (private) → Summary (public) → Certificate (immutable)
- **Cross-references**: @mentions, source links, external events

#### 2. AI-Native Editor
- **Prompt-First Interface**: Command palette for AI interactions
- **Version Branching**: Explore multiple AI suggestions in parallel
- **Contextual AI**: AI understands full journal context
- **Multi-Model Support**: OpenAI GPT-5-mini, Claude 4 Sonnet
- **Smart Diff View**: See exactly what AI changed

#### 3. Immutability Layer
- **Hash Chain**: Each entry includes previous hash
- **Periodic Checkpoints**: Merkle roots posted every 10 entries
- **Public Witness**: Choice of Twitter, Arweave, or Ethereum L2
- **Selective Disclosure**: Prove specific entries without revealing all
- **Portable Certificates**: JSON-LD + cryptographic signatures

#### 4. Collaboration Features
- **Shared Journals**: Multiple authors, attributed entries
- **Review Annotations**: Feedback becomes part of journal
- **Team Templates**: Standardized process for organizations
- **Witness Network**: Colleagues can co-sign works

#### 5. Publishing Integration
- **Embeddable Certificates**: Add to any published work
- **Process Companions**: Public journal summaries
- **Publisher Dashboard**: Verify author submissions
- **API for Platforms**: Medium, Substack, etc. integration

### User Journeys

#### Writer Journey
1. Start new piece → Journal automatically created
2. Write with AI → Each prompt logged with optional notes
3. Review/revise → Decisions captured
4. Checkpoint → Merkle root posted publicly
5. Publish → Certificate embedded in final work
6. Share → Public summary available via link

#### Publisher Journey
1. Receive submission → Check certificate
2. View process summary → Understand creation depth
3. Verify immutability → Confirm blockchain checkpoints
4. Flag depth requirements → Set minimum journal entries
5. Award badges → "Deep Process" verification

#### Reader Journey
1. See certificate badge → Click for details
2. View process summary → Understand human involvement
3. Explore full journal → (If made public by author)
4. Build trust → Through transparency

### Key Metrics
- **Adoption**: MAU, journals created, certificates issued
- **Engagement**: Entries per journal, annotation rate
- **Trust**: Certificate views, verification checks
- **Network**: Cross-references, co-signatures
- **Retention**: Journal completion rate, return writers

### Differentiation
- **Not surveillance**: Captures thinking, not keystrokes
- **Not metrics**: Shows narrative, not numbers
- **Not defensive**: Celebrates process, doesn't hide AI
- **Not complex**: Natural workflow, invisible capture
- **Not judgmental**: No "AI detection" or plagiarism claims

### MVP Scope (v0.1)
1. Basic editor with AI integration (GPT-4)
2. Automatic journal capture
3. Simple hash chain (local verification)
4. Export certificate as JSON
5. Public summary generation
6. Single-player only

### v1.0 Features
- Multi-model AI support
- Blockchain checkpointing
- Team collaboration
- Publisher integrations
- Voice annotations
- Process analytics

### v2.0 Vision
- Real-time collaboration on journals
- AI analysis of process patterns
- Marketplace for process templates
- Educational curriculum integration
- Process-based content discovery