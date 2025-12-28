/**
 * Twitter Adapter
 * 
 * Fetches data from Twitter via xAPIs (or other providers).
 * Handles pagination, rate limiting, and data normalization.
 */

import config from '../../config/config.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Make authenticated request to xAPIs
 */
async function xapisRequest(endpoint, params = {}) {
  const { endpoints, sources } = config;
  const url = new URL(`${endpoints.xapis.base}${endpoint}`);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      'X-API-Key': sources.twitter.apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAPIs error (${response.status}): ${error}`);
  }

  return response.json();
}

/**
 * Get list of accounts the user follows
 */
export async function getFollowing(username) {
  console.log(`📋 Fetching following list for @${username}...`);
  
  const following = [];
  let cursor = undefined;
  let page = 0;
  
  do {
    const result = await xapisRequest(config.endpoints.xapis.following, {
      username,
      cursor,
    });
    
    if (result.data?.users) {
      following.push(...result.data.users);
    }
    
    cursor = result.data?.next_cursor;
    page++;
    
    if (page % 5 === 0) {
      console.log(`   ...${following.length} accounts so far`);
    }
    
    await sleep(config.sources.twitter.rateLimit.delayMs);
    
  } while (cursor && cursor !== '0' && cursor !== 0);
  
  console.log(`   ✓ Following ${following.length} accounts\n`);
  return following;
}

/**
 * Get recent tweets from a user
 */
export async function getUserTweets(user) {
  const username = user.screen_name || user.username;
  const userId = user.id_str || user.id;
  const { options } = config.sources.twitter;
  
  try {
    const result = await xapisRequest(config.endpoints.xapis.tweets, {
      username,
      count: options.maxTweetsPerUser,
    });
    
    if (!result.data?.tweets) {
      return [];
    }
    
    const cutoffTime = Date.now() - (options.hoursBack * 60 * 60 * 1000);
    
    return result.data.tweets
      .filter(tweet => {
        const tweetTime = new Date(tweet.created_at).getTime();
        return tweetTime > cutoffTime;
      })
      .map(tweet => normalizeTweet(tweet, user));
      
  } catch (error) {
    console.error(`   ⚠ Error fetching @${username}: ${error.message}`);
    return [];
  }
}

/**
 * Normalize tweet data into consistent format
 */
function normalizeTweet(tweet, author) {
  const normalized = {
    id: tweet.id_str || tweet.id,
    text: tweet.full_text || tweet.text || '',
    createdAt: new Date(tweet.created_at).toISOString(),
    timestamp: new Date(tweet.created_at).getTime(),
    
    author: {
      id: author.id_str || author.id,
      username: author.screen_name || author.username,
      displayName: author.name || author.display_name,
      profileImage: author.profile_image_url_https || author.profile_image_url,
      verified: author.verified || author.is_blue_verified || false,
    },
    
    // Thread detection fields
    conversationId: tweet.conversation_id_str || tweet.conversation_id || tweet.id_str || tweet.id,
    inReplyToUserId: tweet.in_reply_to_user_id_str || tweet.in_reply_to_user_id,
    inReplyToTweetId: tweet.in_reply_to_status_id_str || tweet.in_reply_to_status_id,
    
    // Retweet detection
    isRetweet: !!tweet.retweeted_status || tweet.text?.startsWith('RT @'),
    retweetedTweet: tweet.retweeted_status ? normalizeRetweetedStatus(tweet.retweeted_status) : null,
    
    // Quote tweet detection
    isQuote: !!tweet.quoted_status || !!tweet.is_quote_status,
    quotedTweet: tweet.quoted_status ? normalizeRetweetedStatus(tweet.quoted_status) : null,
    
    // Media
    media: extractMedia(tweet),
    
    // Metrics (optional display)
    metrics: {
      likes: tweet.favorite_count || 0,
      retweets: tweet.retweet_count || 0,
      replies: tweet.reply_count || 0,
      quotes: tweet.quote_count || 0,
    },
    
    // URLs for linking
    url: `https://twitter.com/${author.screen_name || author.username}/status/${tweet.id_str || tweet.id}`,
  };
  
  return normalized;
}

/**
 * Normalize a retweeted/quoted status
 */
function normalizeRetweetedStatus(status) {
  if (!status) return null;
  
  const user = status.user || {};
  
  return {
    id: status.id_str || status.id,
    text: status.full_text || status.text || '',
    createdAt: status.created_at ? new Date(status.created_at).toISOString() : null,
    author: {
      id: user.id_str || user.id,
      username: user.screen_name || user.username,
      displayName: user.name,
      profileImage: user.profile_image_url_https || user.profile_image_url,
      verified: user.verified || user.is_blue_verified || false,
    },
    media: extractMedia(status),
    url: `https://twitter.com/${user.screen_name || user.username}/status/${status.id_str || status.id}`,
  };
}

/**
 * Extract media from tweet
 */
function extractMedia(tweet) {
  const media = [];
  
  // Check extended_entities first (preferred), then entities
  const mediaEntities = tweet.extended_entities?.media || tweet.entities?.media || [];
  
  for (const item of mediaEntities) {
    if (item.type === 'photo') {
      media.push({
        type: 'image',
        url: item.media_url_https || item.media_url,
        width: item.sizes?.large?.w || item.original_info?.width,
        height: item.sizes?.large?.h || item.original_info?.height,
        alt: item.ext_alt_text || '',
      });
    } else if (item.type === 'video' || item.type === 'animated_gif') {
      // Find best quality MP4
      const variants = item.video_info?.variants || [];
      const mp4Variants = variants
        .filter(v => v.content_type === 'video/mp4')
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      
      const bestVariant = mp4Variants[0];
      
      if (bestVariant) {
        media.push({
          type: item.type === 'animated_gif' ? 'gif' : 'video',
          url: bestVariant.url,
          thumbnailUrl: item.media_url_https || item.media_url,
          width: item.video_info?.aspect_ratio?.[0] * 100 || item.sizes?.large?.w,
          height: item.video_info?.aspect_ratio?.[1] * 100 || item.sizes?.large?.h,
          duration: item.video_info?.duration_millis,
        });
      }
    }
  }
  
  return media;
}

/**
 * Fetch all tweets from all followed accounts
 */
export async function fetchAllTweets(username) {
  const { testMode } = config;
  
  // TEST MODE: Skip following list, use test accounts
  if (testMode.enabled) {
    console.log('🧪 TEST MODE ENABLED');
    console.log(`   Max credits: ${testMode.maxCredits}`);
    console.log(`   Test accounts: ${testMode.testAccounts.join(', ')}\n`);
    
    // Limit to maxCredits accounts (1 credit each)
    const accountsToFetch = testMode.testAccounts.slice(0, testMode.maxCredits);
    
    console.log(`🐦 Fetching tweets from ${accountsToFetch.length} test accounts...\n`);
    
    const allTweets = [];
    const { delayMs } = config.sources.twitter.rateLimit;
    
    for (let i = 0; i < accountsToFetch.length; i++) {
      const username = accountsToFetch[i];
      
      process.stdout.write(`   [${i + 1}/${accountsToFetch.length}] @${username}...`);
      
      // Create a minimal user object for the adapter
      const user = { screen_name: username, username: username };
      const tweets = await getUserTweets(user);
      allTweets.push(...tweets);
      
      console.log(` ${tweets.length} tweets (1 credit used)`);
      
      if (i < accountsToFetch.length - 1) {
        await sleep(delayMs);
      }
    }
    
    allTweets.sort((a, b) => b.timestamp - a.timestamp);
    
    console.log(`\n✓ Test complete: ${allTweets.length} tweets fetched`);
    console.log(`✓ Credits used: ${accountsToFetch.length}\n`);
    
    return allTweets;
  }
  
  // PRODUCTION MODE: Fetch full following list
  const following = await getFollowing(username);
  
  if (following.length === 0) {
    console.log('No accounts found in following list.');
    return [];
  }
  
  console.log(`🐦 Fetching tweets from ${following.length} accounts...\n`);
  
  const allTweets = [];
  const { delayMs } = config.sources.twitter.rateLimit;
  
  for (let i = 0; i < following.length; i++) {
    const user = following[i];
    const username = user.screen_name || user.username;
    
    process.stdout.write(`   [${i + 1}/${following.length}] @${username}...`);
    
    const tweets = await getUserTweets(user);
    allTweets.push(...tweets);
    
    console.log(` ${tweets.length} tweets`);
    
    await sleep(delayMs);
  }
  
  // Sort by timestamp (newest first)
  allTweets.sort((a, b) => b.timestamp - a.timestamp);
  
  console.log(`\n✓ Total: ${allTweets.length} tweets in the last ${config.sources.twitter.options.hoursBack} hours\n`);
  
  return allTweets;
}
