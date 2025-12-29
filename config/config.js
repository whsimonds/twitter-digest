/**
 * Twitter Digest Configuration
 * 
 * All settings are configurable via environment variables.
 * This structure is designed to be extensible for future sources.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load muted words from file
 */
function loadMutedWords() {
  const mutedWordsPath = process.env.MUTED_WORDS_FILE || join(__dirname, 'muted-words.txt');
  
  if (!existsSync(mutedWordsPath)) {
    return [];
  }
  
  try {
    const content = readFileSync(mutedWordsPath, 'utf-8');
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#')) // Remove empty lines and comments
      .map(word => word.toLowerCase());
  } catch (error) {
    console.warn('Could not load muted words file:', error.message);
    return [];
  }
}

export default {
  // Test mode - limits API calls for credit conservation
  testMode: {
    enabled: process.env.TEST_MODE === 'true',
    maxCredits: parseInt(process.env.TEST_MAX_CREDITS || '3', 10),
    // In test mode, skip following list and use these accounts instead
    testAccounts: (process.env.TEST_ACCOUNTS || 'elonmusk,sama').split(',').map(s => s.trim()),
  },
  
  // Content filtering
  filtering: {
    // Muted words - tweets containing these words will be hidden
    mutedWords: {
      enabled: process.env.REMOVE_MUTED_WORDS === 'true',
      words: loadMutedWords(),
    },
    
    // Video handling
    videos: {
      enabled: process.env.DISABLE_VIDEOS !== 'true', // Videos enabled by default
    },
  },
  
  // Data sources (extensible for future platforms)
  sources: {
    twitter: {
      enabled: true,
      provider: process.env.TWITTER_PROVIDER || 'xapis', // 'xapis' | 'official' | 'socialdata'
      username: process.env.TWITTER_USERNAME,
      apiKey: process.env.XAPIS_KEY,
      
      options: {
        includeRetweets: process.env.INCLUDE_RETWEETS !== 'false',
        includeReplies: process.env.INCLUDE_REPLIES === 'true',
        hoursBack: parseInt(process.env.HOURS_BACK || '24', 10),
        maxTweetsPerUser: parseInt(process.env.MAX_TWEETS_PER_USER || '50', 10),
        maxPagesPerUser: parseInt(process.env.MAX_PAGES_PER_USER || '3', 10), // Each page = 1 credit
      },
      
      rateLimit: {
        requestsPerSecond: 2,
        delayMs: parseInt(process.env.RATE_LIMIT_MS || '500', 10),
      },
    },
    
    // Future sources (stubbed)
    // bluesky: { enabled: false, ... },
    // mastodon: { enabled: false, ... },
    // rss: { enabled: false, ... },
  },
  
  // Output configuration
  output: {
    format: 'web', // 'web' | 'email' | 'both'
    directory: process.env.OUTPUT_DIR || './docs',
    
    display: {
      defaultView: process.env.DEFAULT_VIEW || 'time', // 'time' | 'author' | 'threads'
      theme: process.env.THEME || 'dark', // 'dark' | 'light'
      showMetrics: process.env.SHOW_METRICS === 'true', // likes, retweets, etc.
    },
  },
  
  // Email notifications
  notifications: {
    email: {
      enabled: process.env.RESEND_KEY ? true : false,
      provider: 'resend',
      apiKey: process.env.RESEND_KEY,
      from: process.env.EMAIL_FROM || 'digest@resend.dev',
      to: process.env.EMAIL_TO,
    },
  },
  
  // API endpoints (for different providers)
  endpoints: {
    xapis: {
      base: 'https://xapis.dev/api/v1/twitter',
      following: '/user/following',
      tweets: '/user/tweets',
      user: '/user/info',
    },
  },
};