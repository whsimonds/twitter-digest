#!/usr/bin/env node

/**
 * Twitter Daily Digest
 * 
 * Main entry point. Orchestrates:
 * 1. Fetching tweets from Twitter (via adapter)
 * 2. Processing threads
 * 3. Generating HTML
 * 4. Sending notification email
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic imports to handle ES modules
const config = (await import('./config/config.js')).default;
const { fetchAllTweets } = await import('./src/adapters/twitter.js');
const { processThreads } = await import('./src/processors/thread.js');
const { generateHtml } = await import('./src/generators/html.js');
const { sendNotification } = await import('./src/notifications/email.js');

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║       🐦 Twitter Daily Digest          ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  
  // Validate configuration
  const errors = validateConfig();
  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(e => console.error(`   - ${e}`));
    console.error('\nSet these as environment variables or in .env file.');
    process.exit(1);
  }
  
  const username = config.sources.twitter.username;
  const outputDir = config.output.directory;
  const digestUrl = process.env.DIGEST_URL || `file://${path.resolve(outputDir, 'index.html')}`;
  
  try {
    // Step 1: Fetch tweets
    console.log('Step 1/4: Fetching tweets\n');
    const tweets = await fetchAllTweets(username);
    
    if (tweets.length === 0) {
      console.log('No tweets found in the last 24 hours. Creating empty digest.\n');
    }
    
    // Step 2: Process threads
    console.log('Step 2/4: Processing threads\n');
    const processedData = processThreads(tweets);
    console.log(`   Found ${processedData.stats.threadCount} threads`);
    console.log(`   (${processedData.stats.tweetsInThreads} tweets in threads)`);
    console.log(`   ${processedData.stats.standaloneTweetCount} standalone tweets\n`);
    
    // Step 3: Generate HTML
    console.log('Step 3/4: Generating HTML\n');
    const html = generateHtml(processedData, tweets);
    
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Write HTML file
    const outputPath = path.join(outputDir, 'index.html');
    await fs.writeFile(outputPath, html, 'utf-8');
    console.log(`   ✓ Written to ${outputPath}\n`);
    
    // Step 4: Send notification email
    console.log('Step 4/4: Sending notification\n');
    
    const uniqueAuthors = new Set(tweets.map(t => t.author.id)).size;
    
    await sendNotification({
      totalTweets: tweets.length,
      uniqueAuthors,
      threadCount: processedData.stats.threadCount,
    }, digestUrl);
    
    console.log('');
    console.log('════════════════════════════════════════');
    console.log('✅ Digest complete!');
    console.log(`   ${tweets.length} tweets from ${uniqueAuthors} accounts`);
    console.log(`   View: ${digestUrl}`);
    console.log('════════════════════════════════════════');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Validate required configuration
 */
function validateConfig() {
  const errors = [];
  
  if (!config.sources.twitter.apiKey) {
    errors.push('XAPIS_KEY is required');
  }
  
  // Username only required in production mode
  if (!config.testMode.enabled && !config.sources.twitter.username) {
    errors.push('TWITTER_USERNAME is required (or enable TEST_MODE=true)');
  }
  
  return errors;
}

// Run
main();
