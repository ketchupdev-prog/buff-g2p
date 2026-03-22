#!/usr/bin/env ts-node
/**
 * Add Educational Content Script
 * 
 * Interactive script to add new educational content to the knowledge base.
 * 
 * Usage:
 *   npm run add-content
 *   or
 *   ts-node scripts/addEducationalContent.ts
 */

import * as readline from 'readline';
import * as fs from 'fs/promises';
import * as path from 'path';
import { initLanceDB } from '../src/lib/lancedb';

interface ContentInput {
  title: string;
  topic: string;
  content: string;
  summary: string;
  level: 'basic' | 'intermediate' | 'advanced';
  tags: string[];
  examples?: string[];
  faqs?: Array<{ question: string; answer: string }>;
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify readline question
function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   📚 Add Educational Content to Knowledge Base       ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);

  try {
    // Collect content information
    const title = await question('\n📝 Content Title: ');
    const topic = await question('🏷️  Topic (wallets/cashout/loans/etc): ');
    const level = await question('📊 Level (basic/intermediate/advanced): ') as 'basic' | 'intermediate' | 'advanced';
    
    console.log('\n💬 Content (enter text, type "END" on a new line when done):');
    const contentLines: string[] = [];
    let line = await question('');
    while (line !== 'END') {
      contentLines.push(line);
      line = await question('');
    }
    const content = contentLines.join('\n');

    const summary = await question('\n📋 Summary (brief description): ');
    
    const tagsInput = await question('🏷️  Tags (comma-separated): ');
    const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);

    // Optional: Examples
    const addExamples = await question('\n💡 Add examples? (y/n): ');
    let examples: string[] | undefined;
    if (addExamples.toLowerCase() === 'y') {
      examples = [];
      console.log('Enter examples (type "DONE" when finished):');
      let example = await question('Example: ');
      while (example !== 'DONE') {
        if (example.trim()) examples.push(example.trim());
        example = await question('Example: ');
      }
    }

    // Optional: FAQs
    const addFaqs = await question('\n❓ Add FAQs? (y/n): ');
    let faqs: Array<{ question: string; answer: string }> | undefined;
    if (addFaqs.toLowerCase() === 'y') {
      faqs = [];
      console.log('Enter FAQs (type "DONE" when finished):');
      let continueAdding = true;
      while (continueAdding) {
        const faqQuestion = await question('Question: ');
        if (faqQuestion === 'DONE') break;
        const faqAnswer = await question('Answer: ');
        if (faqAnswer === 'DONE') break;
        if (faqQuestion.trim() && faqAnswer.trim()) {
          faqs.push({ question: faqQuestion.trim(), answer: faqAnswer.trim() });
        }
        const more = await question('Add another FAQ? (y/n): ');
        continueAdding = more.toLowerCase() === 'y';
      }
    }

    // Generate ID
    const id = `topic-${topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

    const newContent: ContentInput = {
      title,
      topic,
      content,
      summary,
      level,
      tags,
      examples,
      faqs,
    };

    // Confirm
    console.log('\n📝 Content Summary:');
    console.log(JSON.stringify(newContent, null, 2));
    const confirm = await question('\n✅ Save this content? (y/n): ');

    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ Content not saved.');
      rl.close();
      return;
    }

    // Save to knowledge base
    console.log('\n💾 Saving to knowledge base...');
    
    const db = await initLanceDB();
    await db.ingest([{
      id,
      content: formatContentForDB(newContent),
      metadata: {
        source: 'Manual Entry',
        type: 'user_guide',
        section: topic,
        tags,
      },
      createdAt: new Date(),
    }]);

    console.log(`✅ Content saved successfully!`);
    console.log(`   ID: ${id}`);
    console.log(`   Title: ${title}`);
    
    // Optionally save to JSON file
    const saveToJson = await question('\n💾 Also save to JSON file? (y/n): ');
    if (saveToJson.toLowerCase() === 'y') {
      const jsonPath = path.join(__dirname, '../data/knowledge-base/custom-content.json');
      
      let existingContent = [];
      try {
        const existingData = await fs.readFile(jsonPath, 'utf-8');
        existingContent = JSON.parse(existingData);
      } catch {
        // File doesn't exist or is invalid, start fresh
      }

      existingContent.push({
        id,
        ...newContent,
        createdAt: new Date().toISOString(),
      });

      await fs.writeFile(jsonPath, JSON.stringify(existingContent, null, 2));
      console.log(`✅ Saved to ${jsonPath}`);
    }

    console.log('\n✨ Done! The content is now searchable in the copilot.\n');
  } catch (error) {
    console.error('\n❌ Error adding content:', error);
  } finally {
    rl.close();
  }
}

/**
 * Format content for database storage
 */
function formatContentForDB(content: ContentInput): string {
  let formatted = `# ${content.title}\n\n`;
  formatted += `${content.content}\n\n`;

  if (content.examples && content.examples.length > 0) {
    formatted += `## Examples\n\n`;
    content.examples.forEach(ex => {
      formatted += `• ${ex}\n`;
    });
    formatted += '\n';
  }

  if (content.faqs && content.faqs.length > 0) {
    formatted += `## Frequently Asked Questions\n\n`;
    content.faqs.forEach(faq => {
      formatted += `**Q: ${faq.question}**\n\n`;
      formatted += `A: ${faq.answer}\n\n`;
    });
  }

  return formatted;
}

// Run script
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
