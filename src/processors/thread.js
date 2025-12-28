/**
 * Thread Processor
 * 
 * Detects and groups tweet threads (self-replies).
 * A thread is when a user replies to their own tweets.
 */

/**
 * Process tweets and identify threads
 */
export function processThreads(tweets) {
  // Group tweets by conversation ID
  const conversationMap = new Map();
  
  for (const tweet of tweets) {
    const convId = tweet.conversationId;
    if (!conversationMap.has(convId)) {
      conversationMap.set(convId, []);
    }
    conversationMap.get(convId).push(tweet);
  }
  
  // Identify threads (multiple tweets from same author in same conversation)
  const threads = [];
  const standaloneTweets = [];
  
  for (const [convId, convTweets] of conversationMap) {
    // Group by author within conversation
    const authorGroups = new Map();
    
    for (const tweet of convTweets) {
      const authorId = tweet.author.id;
      if (!authorGroups.has(authorId)) {
        authorGroups.set(authorId, []);
      }
      authorGroups.get(authorId).push(tweet);
    }
    
    // Check each author group
    for (const [authorId, authorTweets] of authorGroups) {
      if (authorTweets.length > 1) {
        // This is a thread - sort chronologically (oldest first for reading order)
        authorTweets.sort((a, b) => a.timestamp - b.timestamp);
        
        // Verify it's a self-reply thread (not just multiple tweets in same timeframe)
        const isThread = authorTweets.some(t => 
          t.inReplyToUserId === authorId || 
          t.inReplyToTweetId
        );
        
        if (isThread) {
          threads.push({
            id: convId,
            author: authorTweets[0].author,
            tweets: authorTweets,
            tweetCount: authorTweets.length,
            startTime: authorTweets[0].timestamp,
            endTime: authorTweets[authorTweets.length - 1].timestamp,
            isThread: true,
          });
        } else {
          // Multiple tweets but not a thread - add as standalone
          standaloneTweets.push(...authorTweets);
        }
      } else {
        // Single tweet - standalone
        standaloneTweets.push(...authorTweets);
      }
    }
  }
  
  // Mark standalone tweets
  const processedStandalone = standaloneTweets.map(tweet => ({
    ...tweet,
    isThread: false,
    tweetCount: 1,
  }));
  
  return {
    threads,
    standaloneTweets: processedStandalone,
    stats: {
      totalTweets: tweets.length,
      threadCount: threads.length,
      tweetsInThreads: threads.reduce((sum, t) => sum + t.tweetCount, 0),
      standaloneTweetCount: processedStandalone.length,
    },
  };
}

/**
 * Flatten processed data back to a list for rendering
 * Threads become a single item with nested tweets
 */
export function flattenForDisplay(processedData, sortBy = 'time') {
  const { threads, standaloneTweets } = processedData;
  
  // Convert threads to display items (using first tweet's timestamp for sorting)
  const threadItems = threads.map(thread => ({
    type: 'thread',
    id: thread.id,
    timestamp: thread.startTime,
    author: thread.author,
    tweets: thread.tweets,
    tweetCount: thread.tweetCount,
  }));
  
  // Convert standalone tweets to display items
  const tweetItems = standaloneTweets.map(tweet => ({
    type: 'tweet',
    id: tweet.id,
    timestamp: tweet.timestamp,
    author: tweet.author,
    tweet: tweet,
    tweetCount: 1,
  }));
  
  // Combine and sort
  const allItems = [...threadItems, ...tweetItems];
  
  if (sortBy === 'time') {
    allItems.sort((a, b) => b.timestamp - a.timestamp);
  } else if (sortBy === 'author') {
    allItems.sort((a, b) => {
      const nameA = a.author.displayName.toLowerCase();
      const nameB = b.author.displayName.toLowerCase();
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      return b.timestamp - a.timestamp;
    });
  }
  
  return allItems;
}

/**
 * Group items by author for "by author" view
 */
export function groupByAuthor(processedData) {
  const { threads, standaloneTweets } = processedData;
  const authorMap = new Map();
  
  // Add threads
  for (const thread of threads) {
    const authorId = thread.author.id;
    if (!authorMap.has(authorId)) {
      authorMap.set(authorId, {
        author: thread.author,
        items: [],
        totalTweets: 0,
      });
    }
    const group = authorMap.get(authorId);
    group.items.push({ type: 'thread', data: thread });
    group.totalTweets += thread.tweetCount;
  }
  
  // Add standalone tweets
  for (const tweet of standaloneTweets) {
    const authorId = tweet.author.id;
    if (!authorMap.has(authorId)) {
      authorMap.set(authorId, {
        author: tweet.author,
        items: [],
        totalTweets: 0,
      });
    }
    const group = authorMap.get(authorId);
    group.items.push({ type: 'tweet', data: tweet });
    group.totalTweets += 1;
  }
  
  // Sort each author's items by time
  for (const group of authorMap.values()) {
    group.items.sort((a, b) => {
      const timeA = a.type === 'thread' ? a.data.startTime : a.data.timestamp;
      const timeB = b.type === 'thread' ? b.data.startTime : b.data.timestamp;
      return timeB - timeA;
    });
  }
  
  // Convert to array and sort by total tweets (most active first)
  const authors = Array.from(authorMap.values());
  authors.sort((a, b) => b.totalTweets - a.totalTweets);
  
  return authors;
}

/**
 * Get only threads for "threads only" view
 */
export function getThreadsOnly(processedData) {
  return processedData.threads
    .sort((a, b) => b.startTime - a.startTime);
}
