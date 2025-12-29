#!/usr/bin/env node

/**
 * Twitter Daily Digest
 * 
 * Main entry point. Orchestrates:
 * 1. Fetching tweets from Twitter (via adapter)
 * 2. Filtering content (muted words, videos)
 * 3. Processing threads
 * 4. Generating HTML
 * 5. Sending notification email
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic imports to handle ES modules
const config = (await import('./config/config.js')).default;
const { fetchAllTweets } = await import('./src/adapters/twitter.js');
const { applyFilters } = await import('./src/processors/filter.js');
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
  
  // Show filtering status
  if (config.filtering.mutedWords.enabled) {
    console.log(`🔇 Muted words: REMOVING (${config.filtering.mutedWords.words.length} words loaded)`);
  }
  if (!config.filtering.videos.enabled) {
    console.log('🎬 Videos: DISABLED');
  }
  console.log('');
  
  const username = config.sources.twitter.username;
  const outputDir = config.output.directory;
  const digestUrl = process.env.DIGEST_URL || `file://${path.resolve(outputDir, 'index.html')}`;
  
  try {
    // Step 1: Fetch tweets
    console.log('Step 1/5: Fetching tweets\n');
    const rawTweets = await fetchAllTweets(username);
    
    if (rawTweets.length === 0) {
      console.log('No tweets found in the last 24 hours. Creating empty digest.\n');
    }
    
    // Step 2: Filter content
    console.log('Step 2/5: Filtering content\n');
    const { tweets, stats: filterStats } = applyFilters(rawTweets);
    
    if (filterStats.mutedWordStats.filtered > 0) {
      console.log(`   🔇 Filtered ${filterStats.mutedWordStats.filtered} tweets by muted words`);
      // Show top muted words that matched
      const topMatches = Object.entries(filterStats.mutedWordStats.mutedWordMatches)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      if (topMatches.length > 0) {
        console.log(`   Top matches: ${topMatches.map(([word, count]) => `"${word}" (${count})`).join(', ')}`);
      }
    } else if (config.filtering.mutedWords.enabled) {
      console.log('   ✓ No tweets matched muted words');
    }
    
    if (filterStats.videosDisabled) {
      console.log('   🎬 Videos removed from media');
    }
    console.log(`   ${tweets.length} tweets remaining\n`);
    
    // Step 3: Process threads
    console.log('Step 3/5: Processing threads\n');
    const processedData = processThreads(tweets);
    console.log(`   Found ${processedData.stats.threadCount} threads`);
    console.log(`   (${processedData.stats.tweetsInThreads} tweets in threads)`);
    console.log(`   ${processedData.stats.standaloneTweetCount} standalone tweets\n`);
    
    // Step 4: Generate HTML
    console.log('Step 4/5: Generating HTML\n');
    const html = generateHtml(processedData, tweets);
    
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Write HTML file
    const outputPath = path.join(outputDir, 'index.html');
    await fs.writeFile(outputPath, html, 'utf-8');
    console.log(`   ✓ Written to ${outputPath}\n`);
    
    // Step 5: Send notification email
    console.log('Step 5/5: Sending notification\n');
    
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
    if (filterStats.mutedWordStats.filtered > 0) {
      console.log(`   (${filterStats.mutedWordStats.filtered} filtered by muted words)`);
    }
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