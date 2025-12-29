/**
 * Content Filter Processor
 * 
 * Filters tweets based on muted words and other content rules.
 */

import config from '../../config/config.js';

/**
 * Filter tweets based on muted words
 * @param {Array} tweets - Array of tweet objects
 * @returns {Object} - { filtered: Array, stats: Object }
 */
export function filterTweets(tweets) {
  const { filtering } = config;
  const stats = {
    total: tweets.length,
    filtered: 0,
    mutedWordMatches: {},
  };
  
  // If muted words not enabled, return all tweets
  if (!filtering.mutedWords.enabled || filtering.mutedWords.words.length === 0) {
    return { filtered: tweets, stats };
  }
  
  const mutedWords = filtering.mutedWords.words;
  
  const filtered = tweets.filter(tweet => {
    // Check main tweet text
    const tweetText = (tweet.text || '').toLowerCase();
    
    // Check quoted tweet text if present
    const quotedText = tweet.quotedTweet?.text?.toLowerCase() || '';
    
    // Check retweeted tweet text if present
    const retweetedText = tweet.retweetedTweet?.text?.toLowerCase() || '';
    
    // Combine all text to check
    const allText = `${tweetText} ${quotedText} ${retweetedText}`;
    
    // Check each muted word
    for (const word of mutedWords) {
      // Match word at word boundary, allowing for common suffixes (s, ed, ing, etc.)
      // This lets "Democrat" match "Democrats", "Democratic", etc.
      const regex = new RegExp(`\\b${escapeRegex(word)}`, 'i');
      
      if (regex.test(allText)) {
        // Track which words caused filtering
        stats.mutedWordMatches[word] = (stats.mutedWordMatches[word] || 0) + 1;
        stats.filtered++;
        return false; // Filter out this tweet
      }
    }
    
    return true; // Keep this tweet
  });
  
  return { filtered, stats };
}

/**
 * Remove videos from media arrays if videos are disabled
 * @param {Array} tweets - Array of tweet objects
 * @returns {Array} - Tweets with videos removed from media
 */
export function filterVideos(tweets) {
  const { filtering } = config;
  
  // If videos are enabled, return unchanged
  if (filtering.videos.enabled) {
    return tweets;
  }
  
  return tweets.map(tweet => {
    const filtered = { ...tweet };
    
    // Filter main tweet media
    if (filtered.media) {
      filtered.media = filtered.media.filter(m => m.type === 'image');
    }
    
    // Filter quoted tweet media
    if (filtered.quotedTweet?.media) {
      filtered.quotedTweet = {
        ...filtered.quotedTweet,
        media: filtered.quotedTweet.media.filter(m => m.type === 'image'),
      };
    }
    
    // Filter retweeted tweet media
    if (filtered.retweetedTweet?.media) {
      filtered.retweetedTweet = {
        ...filtered.retweetedTweet,
        media: filtered.retweetedTweet.media.filter(m => m.type === 'image'),
      };
    }
    
    return filtered;
  });
}

/**
 * Apply all content filters
 * @param {Array} tweets - Array of tweet objects
 * @returns {Object} - { tweets: Array, stats: Object }
 */
export function applyFilters(tweets) {
  let result = tweets;
  const stats = {
    original: tweets.length,
    afterMutedWords: 0,
    mutedWordStats: {},
    videosDisabled: !config.filtering.videos.enabled,
  };
  
  // Apply muted words filter
  const { filtered, stats: mutedStats } = filterTweets(result);
  result = filtered;
  stats.afterMutedWords = result.length;
  stats.mutedWordStats = mutedStats;
  
  // Apply video filter
  result = filterVideos(result);
  
  return { tweets: result, stats };
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}