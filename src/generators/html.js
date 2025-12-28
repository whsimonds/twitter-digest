/**
 * HTML Generator
 * 
 * Generates a static HTML page with embedded data and Tailwind styling.
 * Includes client-side JS for view switching.
 */

import config from '../../config/config.js';

/**
 * Generate the full HTML page
 */
export function generateHtml(processedData, rawTweets) {
  const date = new Date();
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const { threads, standaloneTweets, stats } = processedData;
  
  // Unique authors
  const uniqueAuthors = new Map();
  for (const tweet of rawTweets) {
    uniqueAuthors.set(tweet.author.id, tweet.author);
  }
  
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Twitter Digest - ${dateStr}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            border: "hsl(240 3.7% 15.9%)",
            input: "hsl(240 3.7% 15.9%)",
            ring: "hsl(240 4.9% 83.9%)",
            background: "hsl(240 10% 3.9%)",
            foreground: "hsl(0 0% 98%)",
            primary: { DEFAULT: "hsl(0 0% 98%)", foreground: "hsl(240 5.9% 10%)" },
            secondary: { DEFAULT: "hsl(240 3.7% 15.9%)", foreground: "hsl(0 0% 98%)" },
            muted: { DEFAULT: "hsl(240 3.7% 15.9%)", foreground: "hsl(240 5% 64.9%)" },
            accent: { DEFAULT: "hsl(240 3.7% 15.9%)", foreground: "hsl(0 0% 98%)" },
            card: { DEFAULT: "hsl(240 10% 3.9%)", foreground: "hsl(0 0% 98%)" },
          }
        }
      }
    }
  </script>
  <style>
    .thread-line { border-left: 2px solid hsl(240 3.7% 25%); }
    .tweet-card { transition: background-color 0.15s ease; }
    .tweet-card:hover { background-color: hsl(240 3.7% 10%); }
    .view-btn.active { background-color: hsl(0 0% 98%); color: hsl(240 5.9% 10%); }
    .media-grid { display: grid; gap: 2px; border-radius: 16px; overflow: hidden; }
    .media-grid.single { grid-template-columns: 1fr; }
    .media-grid.double { grid-template-columns: 1fr 1fr; }
    .media-grid.triple { grid-template-columns: 1fr 1fr; }
    .media-grid.quad { grid-template-columns: 1fr 1fr; }
    video { max-height: 500px; }
    .collapsed { display: none; }
    .verified-badge { color: #1d9bf0; }
  </style>
</head>
<body class="bg-background text-foreground min-h-screen">
  
  <!-- Header -->
  <header class="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
    <div class="container mx-auto max-w-2xl px-4 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold">Twitter Digest</h1>
          <p class="text-sm text-muted-foreground">${dateStr}</p>
        </div>
        <div class="text-right text-sm text-muted-foreground">
          <div>${stats.totalTweets} tweets</div>
          <div>${uniqueAuthors.size} accounts</div>
        </div>
      </div>
    </div>
  </header>
  
  <!-- View Toggle -->
  <div class="sticky top-[73px] z-40 w-full border-b border-border bg-background/95 backdrop-blur">
    <div class="container mx-auto max-w-2xl px-4 py-2">
      <div class="flex gap-1 rounded-lg bg-secondary p-1">
        <button onclick="setView('time')" id="btn-time" class="view-btn active flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors">
          By Time
        </button>
        <button onclick="setView('author')" id="btn-author" class="view-btn flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors">
          By Author
        </button>
        <button onclick="setView('threads')" id="btn-threads" class="view-btn flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors">
          Threads (${stats.threadCount})
        </button>
      </div>
    </div>
  </div>
  
  <!-- Stats Banner -->
  <div class="container mx-auto max-w-2xl px-4 py-4">
    <div class="rounded-lg bg-secondary p-4 text-center">
      <div class="text-3xl font-bold">${stats.totalTweets}</div>
      <div class="text-sm text-muted-foreground">
        tweets from ${uniqueAuthors.size} accounts
        ${stats.threadCount > 0 ? ` • ${stats.threadCount} threads (${stats.tweetsInThreads} tweets)` : ''}
      </div>
    </div>
  </div>
  
  <!-- Content Container -->
  <main class="container mx-auto max-w-2xl px-4 pb-20">
    <div id="content-time">${renderTimeView(processedData)}</div>
    <div id="content-author" class="hidden">${renderAuthorView(processedData)}</div>
    <div id="content-threads" class="hidden">${renderThreadsView(processedData)}</div>
  </main>
  
  <!-- Footer -->
  <footer class="border-t border-border py-8 text-center text-sm text-muted-foreground">
    <p>Generated at ${date.toLocaleTimeString()}</p>
    <p class="mt-2 italic">Read it once. Then go do something great.</p>
  </footer>
  
  <!-- Client-side JavaScript -->
  <script>
    // View switching
    function setView(view) {
      // Hide all content
      document.getElementById('content-time').classList.add('hidden');
      document.getElementById('content-author').classList.add('hidden');
      document.getElementById('content-threads').classList.add('hidden');
      
      // Remove active from all buttons
      document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
      
      // Show selected content and activate button
      document.getElementById('content-' + view).classList.remove('hidden');
      document.getElementById('btn-' + view).classList.add('active');
    }
    
    // Thread expand/collapse
    function toggleThread(threadId) {
      const content = document.getElementById('thread-content-' + threadId);
      const button = document.getElementById('thread-toggle-' + threadId);
      
      if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        button.textContent = 'Collapse thread';
      } else {
        content.classList.add('collapsed');
        button.textContent = 'Show thread';
      }
    }
  </script>
  
</body>
</html>`;
}

/**
 * Render the "By Time" view
 */
function renderTimeView(processedData) {
  const { threads, standaloneTweets } = processedData;
  
  // Combine and sort by time
  const items = [];
  
  for (const thread of threads) {
    items.push({ type: 'thread', data: thread, timestamp: thread.startTime });
  }
  
  for (const tweet of standaloneTweets) {
    items.push({ type: 'tweet', data: tweet, timestamp: tweet.timestamp });
  }
  
  items.sort((a, b) => b.timestamp - a.timestamp);
  
  return items.map(item => {
    if (item.type === 'thread') {
      return renderThread(item.data);
    } else {
      return renderTweet(item.data);
    }
  }).join('');
}

/**
 * Render the "By Author" view
 */
function renderAuthorView(processedData) {
  const { threads, standaloneTweets } = processedData;
  
  // Group by author
  const authorMap = new Map();
  
  for (const thread of threads) {
    const authorId = thread.author.id;
    if (!authorMap.has(authorId)) {
      authorMap.set(authorId, { author: thread.author, items: [], count: 0 });
    }
    authorMap.get(authorId).items.push({ type: 'thread', data: thread });
    authorMap.get(authorId).count += thread.tweetCount;
  }
  
  for (const tweet of standaloneTweets) {
    const authorId = tweet.author.id;
    if (!authorMap.has(authorId)) {
      authorMap.set(authorId, { author: tweet.author, items: [], count: 0 });
    }
    authorMap.get(authorId).items.push({ type: 'tweet', data: tweet });
    authorMap.get(authorId).count += 1;
  }
  
  // Sort by tweet count
  const authors = Array.from(authorMap.values());
  authors.sort((a, b) => b.count - a.count);
  
  return authors.map(({ author, items, count }) => `
    <div class="mb-8">
      <div class="sticky top-[121px] z-30 bg-background/95 backdrop-blur border-b border-border py-3 mb-2">
        <div class="flex items-center gap-3">
          <img src="${author.profileImage}" alt="${author.displayName}" 
               class="w-10 h-10 rounded-full" onerror="this.src='https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'">
          <div class="flex-1">
            <div class="flex items-center gap-1">
              <span class="font-semibold">${escapeHtml(author.displayName)}</span>
              ${author.verified ? '<svg class="verified-badge w-4 h-4" viewBox="0 0 22 22"><path fill="currentColor" d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>' : ''}
            </div>
            <div class="text-sm text-muted-foreground">@${author.username} • ${count} tweet${count !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>
      ${items.map(item => item.type === 'thread' ? renderThread(item.data) : renderTweet(item.data)).join('')}
    </div>
  `).join('');
}

/**
 * Render the "Threads Only" view
 */
function renderThreadsView(processedData) {
  const { threads } = processedData;
  
  if (threads.length === 0) {
    return `
      <div class="text-center py-20 text-muted-foreground">
        <p>No threads in the last 24 hours.</p>
        <p class="text-sm mt-2">Threads are detected when someone replies to their own tweets.</p>
      </div>
    `;
  }
  
  const sorted = [...threads].sort((a, b) => b.startTime - a.startTime);
  return sorted.map(thread => renderThread(thread, true)).join('');
}

/**
 * Render a single tweet
 */
function renderTweet(tweet, isPartOfThread = false) {
  const time = new Date(tweet.createdAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  
  // Handle retweets
  if (tweet.isRetweet && tweet.retweetedTweet) {
    return `
      <div class="tweet-card border-b border-border py-4">
        <div class="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/>
          </svg>
          <span>${escapeHtml(tweet.author.displayName)} retweeted</span>
        </div>
        ${renderRetweetedContent(tweet.retweetedTweet)}
      </div>
    `;
  }
  
  // Handle quote tweets
  const quoteHtml = tweet.isQuote && tweet.quotedTweet ? renderQuotedTweet(tweet.quotedTweet) : '';
  
  return `
    <div class="tweet-card ${isPartOfThread ? '' : 'border-b border-border'} py-4">
      <div class="flex gap-3">
        <div class="flex-shrink-0">
          <a href="https://twitter.com/${tweet.author.username}" target="_blank" rel="noopener">
            <img src="${tweet.author.profileImage}" alt="${tweet.author.displayName}" 
                 class="w-10 h-10 rounded-full" onerror="this.src='https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'">
          </a>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1 flex-wrap">
            <a href="https://twitter.com/${tweet.author.username}" target="_blank" rel="noopener" class="font-semibold hover:underline">
              ${escapeHtml(tweet.author.displayName)}
            </a>
            ${tweet.author.verified ? '<svg class="verified-badge w-4 h-4 flex-shrink-0" viewBox="0 0 22 22"><path fill="currentColor" d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>' : ''}
            <span class="text-muted-foreground">@${tweet.author.username}</span>
            <span class="text-muted-foreground">·</span>
            <a href="${tweet.url}" target="_blank" rel="noopener" class="text-muted-foreground hover:underline">${time}</a>
          </div>
          <div class="mt-1 whitespace-pre-wrap break-words">${formatTweetText(tweet.text)}</div>
          ${renderMedia(tweet.media)}
          ${quoteHtml}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render retweeted content
 */
function renderRetweetedContent(rt) {
  return `
    <div class="flex gap-3">
      <div class="flex-shrink-0">
        <a href="https://twitter.com/${rt.author.username}" target="_blank" rel="noopener">
          <img src="${rt.author.profileImage}" alt="${rt.author.displayName}" 
               class="w-10 h-10 rounded-full" onerror="this.src='https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'">
        </a>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1 flex-wrap">
          <a href="https://twitter.com/${rt.author.username}" target="_blank" rel="noopener" class="font-semibold hover:underline">
            ${escapeHtml(rt.author.displayName)}
          </a>
          ${rt.author.verified ? '<svg class="verified-badge w-4 h-4 flex-shrink-0" viewBox="0 0 22 22"><path fill="currentColor" d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>' : ''}
          <span class="text-muted-foreground">@${rt.author.username}</span>
        </div>
        <div class="mt-1 whitespace-pre-wrap break-words">${formatTweetText(rt.text)}</div>
        ${renderMedia(rt.media)}
      </div>
    </div>
  `;
}

/**
 * Render quoted tweet
 */
function renderQuotedTweet(qt) {
  return `
    <div class="mt-3 border border-border rounded-xl p-3 hover:bg-secondary/50 transition-colors">
      <a href="${qt.url}" target="_blank" rel="noopener" class="block">
        <div class="flex items-center gap-2">
          <img src="${qt.author.profileImage}" alt="${qt.author.displayName}" 
               class="w-5 h-5 rounded-full" onerror="this.src='https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'">
          <span class="font-semibold text-sm">${escapeHtml(qt.author.displayName)}</span>
          ${qt.author.verified ? '<svg class="verified-badge w-3 h-3" viewBox="0 0 22 22"><path fill="currentColor" d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>' : ''}
          <span class="text-muted-foreground text-sm">@${qt.author.username}</span>
        </div>
        <div class="mt-1 text-sm whitespace-pre-wrap break-words">${formatTweetText(qt.text)}</div>
        ${renderMedia(qt.media, true)}
      </a>
    </div>
  `;
}

/**
 * Render a thread
 */
function renderThread(thread, expanded = false) {
  const time = new Date(thread.startTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  
  const firstTweet = thread.tweets[0];
  const restTweets = thread.tweets.slice(1);
  
  return `
    <div class="border-b border-border py-4">
      <!-- Thread Header -->
      <div class="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>Thread · ${thread.tweetCount} tweets</span>
      </div>
      
      <!-- First Tweet (always visible) -->
      <div class="flex gap-3">
        <div class="flex-shrink-0 flex flex-col items-center">
          <a href="https://twitter.com/${thread.author.username}" target="_blank" rel="noopener">
            <img src="${thread.author.profileImage}" alt="${thread.author.displayName}" 
                 class="w-10 h-10 rounded-full" onerror="this.src='https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'">
          </a>
          ${restTweets.length > 0 ? '<div class="w-0.5 flex-1 bg-border mt-2"></div>' : ''}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1 flex-wrap">
            <a href="https://twitter.com/${thread.author.username}" target="_blank" rel="noopener" class="font-semibold hover:underline">
              ${escapeHtml(thread.author.displayName)}
            </a>
            ${thread.author.verified ? '<svg class="verified-badge w-4 h-4 flex-shrink-0" viewBox="0 0 22 22"><path fill="currentColor" d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>' : ''}
            <span class="text-muted-foreground">@${thread.author.username}</span>
            <span class="text-muted-foreground">·</span>
            <span class="text-muted-foreground">${time}</span>
          </div>
          <div class="mt-1 whitespace-pre-wrap break-words">${formatTweetText(firstTweet.text)}</div>
          ${renderMedia(firstTweet.media)}
        </div>
      </div>
      
      ${restTweets.length > 0 ? `
        <!-- Toggle Button -->
        <button onclick="toggleThread('${thread.id}')" id="thread-toggle-${thread.id}" 
                class="ml-13 mt-2 text-sm text-primary hover:underline">
          ${expanded ? 'Collapse thread' : 'Show thread'}
        </button>
        
        <!-- Rest of Thread (collapsible) -->
        <div id="thread-content-${thread.id}" class="${expanded ? '' : 'collapsed'}">
          ${restTweets.map((tweet, i) => `
            <div class="flex gap-3 mt-3">
              <div class="flex-shrink-0 flex flex-col items-center">
                <div class="w-10 h-10 flex items-center justify-center">
                  ${i < restTweets.length - 1 ? '<div class="w-0.5 h-full bg-border"></div>' : '<div class="w-2 h-2 rounded-full bg-border"></div>'}
                </div>
              </div>
              <div class="flex-1 min-w-0 pt-1">
                <div class="whitespace-pre-wrap break-words">${formatTweetText(tweet.text)}</div>
                ${renderMedia(tweet.media)}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render media (images, videos, GIFs)
 */
function renderMedia(media, small = false) {
  if (!media || media.length === 0) return '';
  
  const gridClass = media.length === 1 ? 'single' : 
                    media.length === 2 ? 'double' :
                    media.length === 3 ? 'triple' : 'quad';
  
  const maxHeight = small ? 'max-h-40' : 'max-h-96';
  
  const mediaHtml = media.map((item, i) => {
    if (item.type === 'image') {
      return `
        <a href="${item.url}" target="_blank" rel="noopener" class="block">
          <img src="${item.url}" alt="${item.alt || 'Image'}" 
               class="w-full h-full object-cover ${maxHeight}"
               loading="lazy">
        </a>
      `;
    } else if (item.type === 'video') {
      return `
        <video controls preload="metadata" poster="${item.thumbnailUrl}"
               class="w-full ${maxHeight}">
          <source src="${item.url}" type="video/mp4">
          Your browser does not support video.
        </video>
      `;
    } else if (item.type === 'gif') {
      return `
        <video autoplay loop muted playsinline poster="${item.thumbnailUrl}"
               class="w-full ${maxHeight}">
          <source src="${item.url}" type="video/mp4">
        </video>
      `;
    }
    return '';
  }).join('');
  
  return `
    <div class="mt-3 media-grid ${gridClass} rounded-xl overflow-hidden">
      ${mediaHtml}
    </div>
  `;
}

/**
 * Format tweet text with links
 */
function formatTweetText(text) {
  if (!text) return '';
  
  let formatted = escapeHtml(text);
  
  // Convert URLs to links
  formatted = formatted.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener" class="text-blue-400 hover:underline">$1</a>'
  );
  
  // Convert @mentions to links
  formatted = formatted.replace(
    /@(\w+)/g,
    '<a href="https://twitter.com/$1" target="_blank" rel="noopener" class="text-blue-400 hover:underline">@$1</a>'
  );
  
  // Convert #hashtags to links
  formatted = formatted.replace(
    /#(\w+)/g,
    '<a href="https://twitter.com/search?q=%23$1" target="_blank" rel="noopener" class="text-blue-400 hover:underline">#$1</a>'
  );
  
  return formatted;
}

/**
 * Escape HTML entities
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
