/**
 * Twitter Adapter
 * 
 * Fetches data from Twitter via xAPIs.dev
 * 
 * Endpoints used:
 * - /user?username=X         → Get user info including rest_id
 * - /followings?user=ID      → Get accounts a user follows
 * - /user-tweets?user=ID     → Get tweets from a user
 */

import config from '../../config/config.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Make authenticated request to xAPIs
 */
async function xapisRequest(endpoint, params = {}) {
  const { sources } = config;
  const url = new URL(`https://xapis.dev/api/v1/twitter${endpoint}`);
  
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
 * Get user info by username (to get rest_id)
 * Endpoint: /user?username=elonmusk
 */
export async function getUserByUsername(username) {
  try {
    const result = await xapisRequest('/user', {
      username: username,
    });
    
    // rest_id is at response.result.data.user.result.rest_id
    const userData = result?.result?.data?.user?.result || result?.data || result;
    return userData;
  } catch (error) {
    console.error(`   ⚠ Error looking up @${username}: ${error.message}`);
    return null;
  }
}

/**
 * Get list of accounts the user follows
 * Endpoint: /followings?user=44196397
 */
export async function getFollowing(restId) {
  console.log(`📋 Fetching following list...`);
  
  const following = [];
  let cursor = undefined;
  let page = 0;
  
  do {
    const result = await xapisRequest('/followings', {
      user: restId,
      count: 20,
      cursor,
    });
    
    // Debug: always log the response structure on first page
    if (page === 0) {
      console.log('   [DEBUG] Response keys:', Object.keys(result || {}));
      if (result?.result) {
        console.log('   [DEBUG] result keys:', Object.keys(result.result));
      }
      // Show a snippet of the response
      const snippet = JSON.stringify(result, null, 2);
      console.log('   [DEBUG] Response snippet:', snippet.slice(0, 500) + (snippet.length > 500 ? '...' : ''));
    }
    
    // Try multiple possible response structures
    let users = [];
    
    // Structure 1: { data: { users: [...] } }
    if (result?.data?.users) {
      users = result.data.users;
      if (page === 0) console.log('   [DEBUG] Found users in result.data.users');
    }
    // Structure 2: { users: [...] }
    else if (result?.users) {
      users = result.users;
      if (page === 0) console.log('   [DEBUG] Found users in result.users');
    }
    // Structure 3: { result: { users: [...] } }
    else if (result?.result?.users) {
      users = result.result.users;
      if (page === 0) console.log('   [DEBUG] Found users in result.result.users');
    }
    // Structure 4: Direct array of timeline instructions (like tweets endpoint)
    else if (result?.result?.timeline?.instructions) {
      if (page === 0) console.log('   [DEBUG] Found timeline instructions structure');
      for (const instruction of result.result.timeline.instructions) {
        if (instruction.entries) {
          for (const entry of instruction.entries) {
            const user = entry?.content?.itemContent?.user_results?.result;
            if (user) {
              users.push(user.legacy || user);
            }
          }
        }
      }
    }
    else {
      if (page === 0) console.log('   [DEBUG] No recognized user structure found');
    }
    
    // Log what we found on first page
    if (page === 0) {
      console.log(`   [DEBUG] First page found ${users.length} users`);
    }
    
    following.push(...users);
    
    cursor = result?.data?.next_cursor || result?.next_cursor || result?.result?.timeline?.instructions?.[0]?.entries?.find(e => e.entryId?.includes('cursor-bottom'))?.content?.value;
    page++;
    
    if (page % 5 === 0) {
      console.log(`   ...${following.length} accounts so far`);
    }
    
    await sleep(config.sources.twitter.rateLimit.delayMs);
    
  } while (cursor && cursor !== '0' && cursor !== 0 && page < 50); // Cap at 50 pages (1000 users max)
  
  console.log(`   ✓ Following ${following.length} accounts\n`);
  return following;
}

/**
 * Extract a tweet from a timeline entry
 * Handles the deeply nested xAPIs response structure
 */
function extractTweetFromEntry(entry, defaultUsername) {
  try {
    // Skip non-tweet entries (cursors, who-to-follow, promoted tweets)
    if (!entry.entryId?.startsWith('tweet-')) return null;
    if (entry.entryId?.includes('promoted')) return null;
    
    const tweetResult = entry?.content?.itemContent?.tweet_results?.result;
    if (!tweetResult) return null;
    
    // Handle TweetWithVisibilityResults wrapper
    const tweet = tweetResult.__typename === 'TweetWithVisibilityResults' 
      ? tweetResult.tweet 
      : tweetResult;
    
    if (!tweet?.legacy) return null;
    
    const legacy = tweet.legacy;
    
    // Get full text - check note_tweet for longer tweets first
    let fullText = legacy.full_text || '';
    if (tweet.note_tweet?.note_tweet_results?.result?.text) {
      fullText = tweet.note_tweet.note_tweet_results.result.text;
    }
    
    // Skip retweets (they start with "RT @")
    if (fullText.startsWith('RT @')) return null;
    
    // Get user info - try multiple paths
    const userResult = tweet.core?.user_results?.result;
    const userLegacy = userResult?.legacy;
    
    // Username can be in different places
    const username = userLegacy?.screen_name 
      || userResult?.core?.screen_name 
      || defaultUsername 
      || 'unknown';
    const displayName = userLegacy?.name 
      || userResult?.core?.name 
      || username;
    const profileImage = userLegacy?.profile_image_url_https 
      || userResult?.profile_image_url_https;
    
    // Parse the date
    const createdAt = new Date(legacy.created_at);
    
    // Extract quoted tweet if present
    let quotedTweet = null;
    const quotedResult = tweet.quoted_status_result?.result;
    if (quotedResult) {
      // Handle TweetWithVisibilityResults wrapper
      const qtTweet = quotedResult.__typename === 'TweetWithVisibilityResults' 
        ? quotedResult.tweet 
        : quotedResult;
      
      const qtLegacy = qtTweet?.legacy;
      
      // Try multiple paths for quote tweet user
      const qtUserResult = qtTweet?.core?.user_results?.result;
      const qtUserLegacy = qtUserResult?.legacy;
      
      // Extract username with fallbacks
      const qtUsername = qtUserLegacy?.screen_name 
        || qtUserResult?.core?.screen_name
        || qtUserResult?.screen_name
        || 'unknown';
      
      const qtDisplayName = qtUserLegacy?.name 
        || qtUserResult?.core?.name
        || qtUserResult?.name
        || qtUsername;
      
      const qtProfileImage = qtUserLegacy?.profile_image_url_https 
        || qtUserResult?.core?.profile_image_url_https
        || qtUserResult?.profile_image_url_https
        || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png';
      
      if (qtLegacy) {
        quotedTweet = {
          id: qtLegacy.id_str,
          text: qtLegacy.full_text || '',
          author: {
            username: qtUsername,
            displayName: qtDisplayName,
            profileImage: qtProfileImage,
            verified: qtUserResult?.is_blue_verified || false,
          },
          media: extractMedia(qtLegacy),
          url: `https://twitter.com/${qtUsername}/status/${qtLegacy.id_str}`,
        };
      }
    }
    
    return {
      id: legacy.id_str,
      text: fullText,
      createdAt: createdAt.toISOString(),
      timestamp: createdAt.getTime(),
      
      author: {
        id: userResult?.rest_id || legacy.user_id_str,
        username: username,
        displayName: displayName,
        profileImage: profileImage,
        verified: userResult?.is_blue_verified || false,
      },
      
      conversationId: legacy.conversation_id_str || legacy.id_str,
      inReplyToUserId: legacy.in_reply_to_user_id_str,
      inReplyToTweetId: legacy.in_reply_to_status_id_str,
      
      isRetweet: false,
      retweetedTweet: null,
      
      isQuote: legacy.is_quote_status || !!quotedTweet,
      quotedTweet: quotedTweet,
      
      media: extractMedia(legacy),
      
      metrics: {
        likes: legacy.favorite_count || 0,
        retweets: legacy.retweet_count || 0,
        replies: legacy.reply_count || 0,
        quotes: legacy.quote_count || 0,
        views: parseInt(tweet.views?.count || '0'),
      },
      
      url: `https://twitter.com/${username}/status/${legacy.id_str}`,
    };
  } catch (error) {
    console.error('Error extracting tweet:', error.message);
    return null;
  }
}

/**
 * Extract media from tweet legacy object
 */
function extractMedia(legacy) {
  const media = [];
  const mediaEntities = legacy.extended_entities?.media || legacy.entities?.media || [];
  
  for (const item of mediaEntities) {
    if (item.type === 'photo') {
      media.push({
        type: 'image',
        url: item.media_url_https || item.media_url,
        width: item.sizes?.large?.w,
        height: item.sizes?.large?.h,
        alt: item.ext_alt_text || '',
      });
    } else if (item.type === 'video' || item.type === 'animated_gif') {
      const variants = item.video_info?.variants || [];
      const mp4Variants = variants
        .filter(v => v.content_type === 'video/mp4')
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      
      const bestVariant = mp4Variants[0];
      if (bestVariant) {
        media.push({
          type: item.type === 'animated_gif' ? 'gif' : 'video',
          url: bestVariant.url,
          thumbnailUrl: item.media_url_https,
          width: item.sizes?.large?.w,
          height: item.sizes?.large?.h,
          duration: item.video_info?.duration_millis,
        });
      }
    }
  }
  
  return media;
}

/**
 * Get recent tweets from a user by rest_id
 * Endpoint: /user-tweets?user=44196397
 * 
 * Response structure:
 * result.timeline.instructions[].entries[].content.itemContent.tweet_results.result
 * 
 * Supports pagination via cursor parameter
 */
export async function getUserTweets(user, maxPages = 3) {
  const username = user.screen_name || user.username || user.legacy?.screen_name;
  const restId = user.rest_id || user.id_str || user.id;
  const { options } = config.sources.twitter;
  
  if (!restId) {
    console.error(`   ⚠ No rest_id for @${username}`);
    return [];
  }
  
  const allTweets = [];
  let cursor = null;
  let pageCount = 0;
  const cutoffTime = Date.now() - (options.hoursBack * 60 * 60 * 1000);
  let reachedCutoff = false;
  const pageCounts = []; // Track tweets per page
  
  try {
    while (pageCount < maxPages && !reachedCutoff) {
      pageCount++;
      
      const params = {
        user: restId,
        count: options.maxTweetsPerUser,
      };
      
      if (cursor) {
        params.cursor = cursor;
      }
      
      const result = await xapisRequest('/user-tweets', params);
      
      // Navigate the deeply nested structure
      const instructions = result?.result?.timeline?.instructions || [];
      let pageTweets = 0;
      let nextCursor = null;
      
      for (const instruction of instructions) {
        // Handle TimelineAddEntries
        if (instruction.type === 'TimelineAddEntries' && instruction.entries) {
          for (const entry of instruction.entries) {
            // Check for cursor entry
            if (entry.entryId?.startsWith('cursor-bottom')) {
              nextCursor = entry.content?.value;
              continue;
            }
            
            const tweet = extractTweetFromEntry(entry, username);
            if (tweet) {
              // Check if we've gone past our time window
              if (tweet.timestamp < cutoffTime) {
                reachedCutoff = true;
                continue;
              }
              allTweets.push(tweet);
              pageTweets++;
            }
          }
        }
        
        // Handle TimelinePinEntry (pinned tweet)
        if (instruction.type === 'TimelinePinEntry' && instruction.entry) {
          const tweet = extractTweetFromEntry(instruction.entry, username);
          if (tweet && tweet.timestamp > cutoffTime) {
            allTweets.push(tweet);
            pageTweets++;
          }
        }
      }
      
      pageCounts.push(pageTweets);
      
      // Update cursor for next page
      cursor = nextCursor;
      
      // Stop if no cursor or no new tweets found
      if (!cursor || pageTweets === 0) {
        break;
      }
      
      // Small delay between pagination requests
      if (pageCount < maxPages && cursor && !reachedCutoff) {
        await sleep(config.sources.twitter.rateLimit.delayMs);
      }
    }
    
    // Deduplicate tweets by ID
    const uniqueTweets = Array.from(
      new Map(allTweets.map(t => [t.id, t])).values()
    );
    
    // Return tweets and page info
    return { 
      tweets: uniqueTweets, 
      pageInfo: {
        pagesUsed: pageCount,
        tweetsPerPage: pageCounts,
        reachedCutoff,
        hasMore: !!cursor && !reachedCutoff,
      }
    };
      
  } catch (error) {
    console.error(`   ⚠ Error fetching @${username}: ${error.message}`);
    return { 
      tweets: allTweets, 
      pageInfo: { pagesUsed: pageCount, tweetsPerPage: pageCounts, error: error.message }
    };
  }
}

/**
 * Fetch all tweets from all followed accounts
 */
export async function fetchAllTweets(username) {
  const { testMode } = config;
  const { maxPagesPerUser } = config.sources.twitter.options;
  
  // TEST MODE: Skip following list, use test accounts
  if (testMode.enabled) {
    console.log('🧪 TEST MODE ENABLED');
    console.log(`   Max credits: ${testMode.maxCredits}`);
    console.log(`   Test accounts: ${testMode.testAccounts.join(', ')}`);
    console.log(`   Max pages per user: ${maxPagesPerUser}\n`);
    
    // Credits per account: 1 for /user lookup + maxPagesPerUser for /user-tweets pages
    const creditsPerAccount = 1 + maxPagesPerUser;
    const maxAccounts = Math.floor(testMode.maxCredits / creditsPerAccount);
    
    if (maxAccounts < 1) {
      console.log(`⚠ Need at least ${creditsPerAccount} credits per account (1 lookup + ${maxPagesPerUser} pages)`);
      console.log(`  Set TEST_MAX_CREDITS=${creditsPerAccount} or higher\n`);
      return [];
    }
    
    const accountsToFetch = testMode.testAccounts.slice(0, maxAccounts);
    
    console.log(`🐦 Fetching tweets from ${accountsToFetch.length} test accounts...`);
    console.log(`   (up to ${creditsPerAccount} credits per account: 1 lookup + ${maxPagesPerUser} pages)\n`);
    
    const allTweets = [];
    const { delayMs } = config.sources.twitter.rateLimit;
    let creditsUsed = 0;
    
    for (let i = 0; i < accountsToFetch.length; i++) {
      const screenName = accountsToFetch[i];
      
      console.log(`   [${i + 1}/${accountsToFetch.length}] @${screenName}:`);
      
      // Step 1: Look up user to get rest_id (1 credit)
      const userInfo = await getUserByUsername(screenName);
      creditsUsed++;
      
      if (!userInfo || !userInfo.rest_id) {
        console.log(`      ⚠ User not found (1 credit used)`);
        continue;
      }
      
      await sleep(delayMs);
      
      // Step 2: Get their tweets using rest_id (1 credit per page)
      const { tweets, pageInfo } = await getUserTweets(userInfo, maxPagesPerUser);
      creditsUsed += pageInfo.pagesUsed;
      
      allTweets.push(...tweets);
      
      // Display per-page breakdown
      const pageBreakdown = pageInfo.tweetsPerPage.map((count, idx) => `p${idx + 1}:${count}`).join(', ');
      console.log(`      📄 ${pageInfo.pagesUsed} page(s): [${pageBreakdown}] = ${tweets.length} tweets`);
      if (pageInfo.reachedCutoff) {
        console.log(`      ⏱ Stopped: reached ${config.sources.twitter.options.hoursBack}h cutoff`);
      } else if (pageInfo.hasMore) {
        console.log(`      📌 More tweets available (increase MAX_PAGES_PER_USER to fetch)`);
      }
      console.log(`      💳 Credits: ${1 + pageInfo.pagesUsed} (1 lookup + ${pageInfo.pagesUsed} pages)`);
      
      if (i < accountsToFetch.length - 1) {
        await sleep(delayMs);
      }
    }
    
    allTweets.sort((a, b) => b.timestamp - a.timestamp);
    
    console.log(`\n✓ Test complete: ${allTweets.length} tweets fetched`);
    console.log(`✓ Credits used: ${creditsUsed}\n`);
    
    return allTweets;
  }
  
  // PRODUCTION MODE
  
  // Check for explicit follow list first
  const followList = process.env.FOLLOW_LIST;
  let accountsToFetch = [];
  
  if (followList) {
    // Use explicit list of accounts
    accountsToFetch = followList.split(',').map(s => s.trim()).filter(Boolean);
    console.log(`📋 Using explicit follow list: ${accountsToFetch.length} accounts\n`);
  } else {
    // Fetch from Twitter following list
    console.log(`🔍 Looking up @${username}...\n`);
    
    // Step 1: Get your own rest_id (1 credit)
    const myUser = await getUserByUsername(username);
    
    if (!myUser || !myUser.rest_id) {
      console.log(`❌ Could not find user @${username}`);
      return [];
    }
    
    console.log(`   ✓ Found @${username} (rest_id: ${myUser.rest_id})\n`);
    
    await sleep(config.sources.twitter.rateLimit.delayMs);
    
    // Step 2: Get following list (uses rest_id)
    const following = await getFollowing(myUser.rest_id);
    
    if (following.length === 0) {
      console.log('No accounts found in following list.');
      console.log('💡 Tip: Set FOLLOW_LIST secret with comma-separated usernames');
      return [];
    }
    
    // Extract usernames from following list
    accountsToFetch = following.map(u => u.screen_name || u.legacy?.screen_name || u.username).filter(Boolean);
  }
  
  if (accountsToFetch.length === 0) {
    console.log('No accounts to fetch.');
    return [];
  }
  
  console.log(`🐦 Fetching tweets from ${accountsToFetch.length} accounts...\n`);
  
  const allTweets = [];
  const { delayMs } = config.sources.twitter.rateLimit;
  
  for (let i = 0; i < accountsToFetch.length; i++) {
    const screenName = accountsToFetch[i];
    
    process.stdout.write(`   [${i + 1}/${accountsToFetch.length}] @${screenName}...`);
    
    // Look up user to get rest_id
    const userInfo = await getUserByUsername(screenName);
    
    if (!userInfo || !userInfo.rest_id) {
      console.log(` not found`);
      continue;
    }
    
    await sleep(delayMs);
    
    const { tweets, pageInfo } = await getUserTweets(userInfo, maxPagesPerUser);
    allTweets.push(...tweets);
    
    const pageBreakdown = pageInfo.tweetsPerPage.join('+');
    console.log(` ${tweets.length} tweets (${pageInfo.pagesUsed} pages: ${pageBreakdown})`);
    
    await sleep(delayMs);
  }
  
  // Sort by timestamp (newest first)
  allTweets.sort((a, b) => b.timestamp - a.timestamp);
  
  console.log(`\n✓ Total: ${allTweets.length} tweets in the last ${config.sources.twitter.options.hoursBack} hours\n`);
  
  return allTweets;
}
