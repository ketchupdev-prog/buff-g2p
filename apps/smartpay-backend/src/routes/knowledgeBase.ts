/**
 * Knowledge Base API Routes
 * Location: fintech/smartpay/backend/src/routes/knowledgeBase.ts
 * Reference: PRD §4.6.3 - Educational Content System
 * 
 * Provides endpoints for financial literacy content, educational articles,
 * FAQs, and regulatory information search.
 * 
 * Security: All endpoints protected with requireAuth middleware
 * Analytics: Content views tracked for personalization
 */

import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { moderateRateLimiter } from '../middleware/rateLimiter';
import { initLanceDB } from '../lib/lancedb';
import { logWithAttribution } from '../lib/etaAttribution';
import { pool } from '../lib/db';

const router = Router();

/**
 * Educational content categories
 */
const CONTENT_CATEGORIES = [
  'basics',
  'transactions',
  'financial-services',
  'compliance',
  'safety',
  'features',
  'advanced',
] as const;

/**
 * POST /api/v1/copilot/knowledge/search
 * Search knowledge base for educational content
 * 
 * Security: Protected with requireAuth and rate limiting
 */
router.post(
  '/copilot/knowledge/search',
  requireAuth,
  moderateRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { query, limit = 3, language = 'en' } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Query parameter is required',
        });
      }

      // Log search for analytics
      await logWithAttribution({
        userId: req.userId!,
        toolName: 'knowledge_search',
        action: 'search',
        input: { query, language },
        result: 'success',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date(),
      });

      // Perform semantic search using LanceDB
      const lanceDB = await initLanceDB();
      const searchResults = await lanceDB.search(query, limit);

      // Filter by language if specified
      const filteredResults = searchResults
        .filter((result) => {
          const metadata = result.chunk.metadata as any;
          // If language is specified in metadata, filter by it
          return !metadata.language || metadata.language === language;
        })
        .map((result) => ({
          content: {
            id: result.chunk.id,
            title: extractTitle(result.chunk.content),
            topic: result.chunk.metadata.section || 'general',
            content: result.chunk.content,
            summary: extractSummary(result.chunk.content),
            level: determineLevel(result.chunk.metadata.tags || []),
            language: (result.chunk.metadata as any).language || 'en',
            tags: result.chunk.metadata.tags || [],
            relatedTopics: extractRelatedTopics(result.chunk.metadata),
            source: result.chunk.metadata.source,
            lastUpdated: result.chunk.createdAt,
          },
          score: result.score,
          relevance: `${(result.score * 100).toFixed(0)}%`,
          context: result.chunk.content.substring(0, 200) + '...',
        }));

      res.json({
        results: filteredResults,
        count: filteredResults.length,
        query,
      });
    } catch (error) {
      console.error('Knowledge search error:', error);

      await logWithAttribution({
        userId: req.userId!,
        toolName: 'knowledge_search',
        action: 'search',
        input: { query: req.body.query },
        result: 'failure',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date(),
      });

      res.status(500).json({
        error: 'Search failed',
        message: 'Failed to search knowledge base. Please try again.',
      });
    }
  }
);

/**
 * GET /api/v1/copilot/knowledge/topics/:topicId
 * Get detailed educational content for a specific topic
 */
router.get(
  '/copilot/knowledge/topics/:topicId',
  requireAuth,
  moderateRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { topicId } = req.params;
      const { language = 'en' } = req.query;

      // Search for topic in LanceDB
      const lanceDB = await initLanceDB();
      const searchResults = await lanceDB.search(topicId, 1);

      if (searchResults.length === 0) {
        return res.status(404).json({
          error: 'Topic not found',
          message: `Educational content for topic "${topicId}" not found.`,
        });
      }

      const result = searchResults[0];
      if (!result) {
        return res.status(404).json({
          error: 'Topic not found',
          message: `Educational content for topic "${topicId}" not found.`,
        });
      }
      const chunk = result.chunk;

      // Extract detailed content
      const content = {
        id: chunk.id,
        title: extractTitle(chunk.content),
        topic: chunk.metadata.section || topicId,
        content: chunk.content,
        summary: extractSummary(chunk.content),
        level: determineLevel(chunk.metadata.tags || []),
        language: (chunk.metadata as any).language || 'en',
        tags: chunk.metadata.tags || [],
        relatedTopics: extractRelatedTopics(chunk.metadata),
        examples: extractExamples(chunk.content),
        faqs: extractFAQs(chunk.content),
        source: chunk.metadata.source,
        lastUpdated: chunk.createdAt,
      };

      // Track content view
      await logWithAttribution({
        userId: req.userId!,
        toolName: 'knowledge_view',
        action: 'view_topic',
        input: { topicId, language },
        result: 'success',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date(),
      });

      res.json(content);
    } catch (error) {
      console.error('Error fetching topic:', error);
      res.status(500).json({
        error: 'Failed to fetch topic',
        message: 'Unable to retrieve educational content.',
      });
    }
  }
);

/**
 * GET /api/v1/copilot/knowledge/topics/:topicId/related
 * Get related topics for a given topic
 */
router.get(
  '/copilot/knowledge/topics/:topicId/related',
  requireAuth,
  moderateRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { topicId } = req.params;
      const { limit = 5 } = req.query;

      // Search for related topics using LanceDB
      const lanceDB = await initLanceDB();
      const searchResults = await lanceDB.search(topicId, Number(limit) + 1);

      // Filter out the original topic and format results
      const relatedTopics = searchResults
        .filter((result) => result.chunk.id !== topicId)
        .slice(0, Number(limit))
        .map((result) => ({
          id: result.chunk.id,
          title: extractTitle(result.chunk.content),
          summary: extractSummary(result.chunk.content),
          relevance: result.score,
        }));

      res.json({
        topicId,
        relatedTopics,
        count: relatedTopics.length,
      });
    } catch (error) {
      console.error('Error fetching related topics:', error);
      res.status(500).json({
        error: 'Failed to fetch related topics',
        message: 'Unable to retrieve related content.',
      });
    }
  }
);

/**
 * GET /api/v1/copilot/knowledge/topics
 * List all available topics
 */
router.get(
  '/copilot/knowledge/topics',
  requireAuth,
  moderateRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { language = 'en' } = req.query;

      // This is a placeholder - in production, you'd maintain a topics registry
      const topics = [
        { id: 'topic-wallet-basics', title: 'What is a Digital Wallet?', category: 'basics' },
        { id: 'topic-cashout', title: 'How to Cash Out Safely', category: 'transactions' },
        { id: 'topic-loans', title: 'Voucher-Backed Loans', category: 'financial-services' },
        { id: 'topic-proof-of-life', title: 'Proof of Life Verification', category: 'compliance' },
        { id: 'topic-fees', title: 'Understanding Transaction Fees', category: 'basics' },
        { id: 'topic-open-banking', title: 'Open Banking Explained', category: 'advanced' },
        { id: 'topic-security', title: 'Security & Privacy', category: 'safety' },
        { id: 'topic-ussd', title: 'USSD Banking', category: 'features' },
      ];

      res.json({
        topics,
        count: topics.length,
        language,
      });
    } catch (error) {
      console.error('Error listing topics:', error);
      res.status(500).json({
        error: 'Failed to list topics',
        message: 'Unable to retrieve topics list.',
      });
    }
  }
);

/**
 * POST /api/v1/copilot/knowledge/track
 * Track content views for analytics and personalization
 */
router.post(
  '/copilot/knowledge/track',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { contentId, action, timestamp } = req.body;

      if (!contentId || !action) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'contentId and action are required',
        });
      }

      // Store tracking data in database
      await pool.query(
        `INSERT INTO content_views (user_id, content_id, action, viewed_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, content_id, viewed_at) DO NOTHING`,
        [req.userId, contentId, action, timestamp || new Date()]
      );

      res.json({ success: true });
    } catch (error) {
      console.warn('Failed to track content view:', error);
      // Don't fail the request if tracking fails
      res.json({ success: false, message: 'Tracking failed but content was delivered' });
    }
  }
);

/**
 * Helper Functions
 */

/**
 * Extract title from content (first line or H1)
 */
function extractTitle(content: string): string {
  const lines = content.split('\n');
  const firstLine = lines[0]?.trim() || 'Untitled';
  
  // Remove markdown heading markers
  return firstLine.replace(/^#+\s*/, '');
}

/**
 * Extract summary (first paragraph or first 150 chars)
 */
function extractSummary(content: string): string {
  const paragraphs = content.split('\n\n');
  const firstParagraph = paragraphs[1] || paragraphs[0] || content;
  
  if (firstParagraph.length <= 150) {
    return firstParagraph;
  }
  
  return firstParagraph.substring(0, 147) + '...';
}

/**
 * Determine difficulty level based on tags
 */
function determineLevel(tags: string[]): 'basic' | 'intermediate' | 'advanced' {
  const lowerTags = tags.map((t) => t.toLowerCase());
  
  if (lowerTags.some((t) => ['advanced', 'technical', 'complex'].includes(t))) {
    return 'advanced';
  }
  
  if (lowerTags.some((t) => ['intermediate', 'moderate'].includes(t))) {
    return 'intermediate';
  }
  
  return 'basic';
}

/**
 * Extract related topics from metadata
 */
function extractRelatedTopics(metadata: any): string[] {
  if (metadata.relatedTopics && Array.isArray(metadata.relatedTopics)) {
    return metadata.relatedTopics;
  }
  
  // Fallback: use tags as related topics
  return (metadata.tags || []).slice(0, 3).map((tag: string) => `topic-${tag}`);
}

/**
 * Extract examples from content
 */
function extractExamples(content: string): string[] | undefined {
  const examples: string[] = [];
  const lines = content.split('\n');
  
  let inExamplesSection = false;
  for (const line of lines) {
    if (line.toLowerCase().includes('example')) {
      inExamplesSection = true;
      continue;
    }
    
    if (inExamplesSection && line.trim().startsWith('•')) {
      examples.push(line.trim().replace(/^•\s*/, ''));
    }
    
    if (inExamplesSection && line.trim().length === 0) {
      inExamplesSection = false;
    }
  }
  
  return examples.length > 0 ? examples : undefined;
}

/**
 * Extract FAQs from content
 */
function extractFAQs(content: string): Array<{ question: string; answer: string }> | undefined {
  const faqs: Array<{ question: string; answer: string }> = [];
  const lines = content.split('\n');
  
  let currentQuestion: string | null = null;
  let currentAnswer = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Detect question
    if (trimmedLine.startsWith('Q:') || trimmedLine.toLowerCase().startsWith('question:')) {
      // Save previous Q&A if exists
      if (currentQuestion && currentAnswer) {
        faqs.push({ question: currentQuestion, answer: currentAnswer.trim() });
      }
      
      currentQuestion = trimmedLine.replace(/^Q:\s*/i, '').replace(/^Question:\s*/i, '');
      currentAnswer = '';
      continue;
    }
    
    // Detect answer
    if (currentQuestion && (trimmedLine.startsWith('A:') || trimmedLine.toLowerCase().startsWith('answer:'))) {
      currentAnswer = trimmedLine.replace(/^A:\s*/i, '').replace(/^Answer:\s*/i, '');
      continue;
    }
    
    // Continue answer
    if (currentQuestion && currentAnswer && trimmedLine.length > 0) {
      currentAnswer += ' ' + trimmedLine;
    }
    
    // End of FAQ section
    if (currentQuestion && currentAnswer && trimmedLine.length === 0) {
      faqs.push({ question: currentQuestion, answer: currentAnswer.trim() });
      currentQuestion = null;
      currentAnswer = '';
    }
  }
  
  // Save last Q&A if exists
  if (currentQuestion && currentAnswer) {
    faqs.push({ question: currentQuestion, answer: currentAnswer.trim() });
  }
  
  return faqs.length > 0 ? faqs : undefined;
}

export default router;
