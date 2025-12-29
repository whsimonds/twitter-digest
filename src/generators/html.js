/**
 * HTML Generator
 * 
 * Generates a static HTML page with embedded data and Tailwind styling.
 * Includes client-side JS for view switching, image lightbox, and quote tweet modals.
 */

import config from '../../config/config.js';

// Global counter for unique media IDs
let mediaIdCounter = 0;

/**
 * Generate the full HTML page
 */
export function generateHtml(processedData, rawTweets) {
  // Reset counter for each generation
  mediaIdCounter = 0;
  
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
    .collapsed { display: none; }
    .verified-badge { color: #1d9bf0; }
    
    /* Lightbox styles */
    .lightbox-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }
    .lightbox-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    .lightbox-content {
      max-width: 90vw;
      max-height: 90vh;
      position: relative;
    }
    .lightbox-content img,
    .lightbox-content video {
      max-width: 90vw;
      max-height: 90vh;
      object-fit: contain;
    }
    .lightbox-close {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 101;
    }
    .lightbox-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 101;
    }
    .lightbox-nav.prev { left: 16px; }
    .lightbox-nav.next { right: 16px; }
    .lightbox-counter {
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
    }
    
    /* Quote tweet modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 90;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
      overflow-y: auto;
    }
    .modal-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    .modal-content {
      background: hsl(240 10% 6%);
      border: 1px solid hsl(240 3.7% 15.9%);
      border-radius: 16px;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
    }
    .modal-close {
      position: sticky;
      top: 0;
      right: 0;
      float: right;
      margin: 12px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: hsl(240 3.7% 15.9%);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }
    
    /* Clickable quote tweet */
    .quote-tweet-card {
      cursor: pointer;
      transition: background-color 0.15s ease;
    }
    .quote-tweet-card:hover {
      background-color: hsl(240 3.7% 12%);
    }
    
    /* Video container */
    .video-container {
      position: relative;
      background: #000;
      border-radius: 16px;
      overflow: hidden;
    }
    .video-container video {
      width: 100%;
      max-height: 500px;
      display: block;
      background: #000;
    }
    .video-container video::-webkit-media-controls {
      visibility: visible;
    }
    
    /* Media item clickable */
    .media-item {
      cursor: pointer;
      overflow: hidden;
    }
    .media-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.2s ease;
    }
    .media-item:hover img {
      transform: scale(1.02);
    }
    
    /* Quote tweet media preview grid */
    .media-grid-preview {
      display: grid;
      gap: 2px;
      height: 150px;
    }
    .media-grid-preview.single { grid-template-columns: 1fr; }
    .media-grid-preview.double { grid-template-columns: 1fr 1fr; }
    .media-grid-preview.triple { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
    .media-grid-preview.triple .media-item-preview:first-child { grid-row: span 2; }
    .media-grid-preview.quad { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
    .media-item-preview {
      overflow: hidden;
      position: relative;
    }
    .media-item-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  </style>
</head>
<body class="bg-background text-foreground min-h-screen">
  
  <!-- Lightbox Modal -->
  <div id="lightbox" class="lightbox-overlay" onclick="closeLightbox(event)">
    <button class="lightbox-close" onclick="closeLightbox(event)">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
    <button class="lightbox-nav prev" onclick="navigateLightbox(event, -1)">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </button>
    <div class="lightbox-content" id="lightbox-content"></div>
    <button class="lightbox-nav next" onclick="navigateLightbox(event, 1)">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
    <div class="lightbox-counter" id="lightbox-counter"></div>
  </div>
  
  <!-- Quote Tweet Modal -->
  <div id="quote-modal" class="modal-overlay" onclick="closeQuoteModal(event)">
    <div class="modal-content" id="quote-modal-content" onclick="event.stopPropagation()">
      <button class="modal-close" onclick="closeQuoteModal(event)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
      <div id="quote-modal-body" class="p-4"></div>
    </div>
  </div>
  
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
    // Media gallery data (populated during render)
    const mediaGalleries = {};
    
    // Current lightbox state
    let currentGallery = null;
    let currentIndex = 0;
    
    // View switching
    function setView(view) {
      document.getElementById('content-time').classList.add('hidden');
      document.getElementById('content-author').classList.add('hidden');
      document.getElementById('content-threads').classList.add('hidden');
      document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
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
    
    // Register media gallery
    function registerGallery(galleryId, items) {
      mediaGalleries[galleryId] = items;
    }
    
    // Open lightbox
    function openLightbox(galleryId, index) {
      currentGallery = galleryId;
      currentIndex = index;
      const gallery = mediaGalleries[galleryId];
      if (!gallery) return;
      
      document.getElementById('lightbox').classList.add('active');
      document.body.style.overflow = 'hidden';
      renderLightboxContent();
    }
    
    // Render current lightbox content
    function renderLightboxContent() {
      const gallery = mediaGalleries[currentGallery];
      if (!gallery) return;
      
      const item = gallery[currentIndex];
      const container = document.getElementById('lightbox-content');
      const counter = document.getElementById('lightbox-counter');
      
      if (item.type === 'image') {
        container.innerHTML = '<img src="' + item.url + '" alt="' + (item.alt || 'Image') + '">';
      } else if (item.type === 'video' || item.type === 'gif') {
        const autoplay = item.type === 'gif' ? 'autoplay loop muted playsinline' : 'controls autoplay playsinline';
        container.innerHTML = '<video ' + autoplay + ' poster="' + (item.thumbnailUrl || '') + '" style="max-width: 90vw; max-height: 90vh;">' +
                              '<source src="' + item.url + '" type="video/mp4">' +
                              '</video>';
        const video = container.querySelector('video');
        video.onerror = function() {
          // If video fails, show link to original
          container.innerHTML = '<div class="text-center p-8">' +
            '<p class="text-white mb-4">Video could not be loaded</p>' +
            '<a href="' + item.url + '" target="_blank" class="text-blue-400 hover:underline">Open video in new tab</a>' +
            '</div>';
        };
      }
      
      // Update counter
      if (gallery.length > 1) {
        counter.textContent = (currentIndex + 1) + ' / ' + gallery.length;
        counter.style.display = 'block';
      } else {
        counter.style.display = 'none';
      }
      
      // Update nav visibility
      document.querySelector('.lightbox-nav.prev').style.display = gallery.length > 1 ? 'flex' : 'none';
      document.querySelector('.lightbox-nav.next').style.display = gallery.length > 1 ? 'flex' : 'none';
    }
    
    // Close lightbox
    function closeLightbox(event) {
      if (event.target.closest('.lightbox-content') && !event.target.closest('.lightbox-close')) return;
      document.getElementById('lightbox').classList.remove('active');
      document.body.style.overflow = '';
      // Stop any playing video
      const video = document.querySelector('#lightbox-content video');
      if (video) video.pause();
    }
    
    // Navigate lightbox
    function navigateLightbox(event, direction) {
      event.stopPropagation();
      const gallery = mediaGalleries[currentGallery];
      if (!gallery) return;
      
      // Stop current video if playing
      const video = document.querySelector('#lightbox-content video');
      if (video) video.pause();
      
      currentIndex = (currentIndex + direction + gallery.length) % gallery.length;
      renderLightboxContent();
    }
    
    // Keyboard navigation for lightbox
    document.addEventListener('keydown', (e) => {
      const lightbox = document.getElementById('lightbox');
      if (!lightbox.classList.contains('active')) return;
      
      if (e.key === 'Escape') closeLightbox({target: lightbox});
      if (e.key === 'ArrowLeft') navigateLightbox({stopPropagation: () => {}}, -1);
      if (e.key === 'ArrowRight') navigateLightbox({stopPropagation: () => {}}, 1);
    });
    
    // Quote tweet modal
    function openQuoteModal(quotedData) {
      const modal = document.getElementById('quote-modal');
      const body = document.getElementById('quote-modal-body');
      
      // Parse the JSON data
      const qt = JSON.parse(decodeURIComponent(quotedData));
      
      // Build the modal content
      let mediaHtml = '';
      if (qt.media && qt.media.length > 0) {
        const galleryId = 'qt-modal-' + Date.now();
        registerGallery(galleryId, qt.media);
        mediaHtml = renderMediaHtml(qt.media, galleryId, false);
      }
      
      body.innerHTML = \`
        <div class="flex gap-3">
          <div class="flex-shrink-0">
            <img src="\${qt.author.profileImage}" alt="\${qt.author.displayName}" 
                 class="w-10 h-10 rounded-full" onerror="this.src='https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'">
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1 flex-wrap">
              <span class="font-semibold">\${escapeHtmlJS(qt.author.displayName)}</span>
              \${qt.author.verified ? '<svg class="verified-badge w-4 h-4" viewBox="0 0 22 22"><path fill="currentColor" d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>' : ''}
              <span class="text-muted-foreground">@\${qt.author.username}</span>
            </div>
            <div class="mt-2 whitespace-pre-wrap break-words">\${formatTextJS(qt.text)}</div>
            \${mediaHtml}
            <a href="\${qt.url}" target="_blank" rel="noopener" class="inline-block mt-3 text-sm text-blue-400 hover:underline">
              View on Twitter →
            </a>
          </div>
        </div>
      \`;
      
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    
    // Close quote modal
    function closeQuoteModal(event) {
      if (event.target.closest('#quote-modal-content') && !event.target.closest('.modal-close')) return;
      document.getElementById('quote-modal').classList.remove('active');
      document.body.style.overflow = '';
    }
    
    // Escape HTML for JS
    function escapeHtmlJS(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    // Format tweet text for JS
    function formatTextJS(text) {
      if (!text) return '';
      let formatted = escapeHtmlJS(text);
      formatted = formatted.replace(/(https?:\\/\\/[^\\s]+)/g, '<a href="$1" target="_blank" rel="noopener" class="text-blue-400 hover:underline">$1</a>');
      formatted = formatted.replace(/@(\\w+)/g, '<a href="https://twitter.com/$1" target="_blank" rel="noopener" class="text-blue-400 hover:underline">@$1</a>');
      formatted = formatted.replace(/#(\\w+)/g, '<a href="https://twitter.com/search?q=%23$1" target="_blank" rel="noopener" class="text-blue-400 hover:underline">#$1</a>');
      return formatted;
    }
    
    // Render media HTML for JS (quote modal)
    function renderMediaHtml(media, galleryId, small) {
      if (!media || media.length === 0) return '';
      const gridClass = media.length === 1 ? 'single' : media.length === 2 ? 'double' : media.length === 3 ? 'triple' : 'quad';
      const maxHeight = small ? 'max-h-40' : 'max-h-96';
      
      let html = '<div class="mt-3 media-grid ' + gridClass + ' rounded-xl overflow-hidden">';
      media.forEach((item, i) => {
        if (item.type === 'image') {
          html += '<div class="media-item" onclick="openLightbox(\\'' + galleryId + '\\', ' + i + ')">' +
                  '<img src="' + item.url + '" alt="' + (item.alt || 'Image') + '" class="' + maxHeight + '" loading="lazy">' +
                  '</div>';
        } else if (item.type === 'video') {
          html += '<div class="video-container relative">' +
                  '<video poster="' + (item.thumbnailUrl || '') + '" controls preload="metadata" class="w-full ' + maxHeight + '">' +
                  '<source src="' + item.url + '" type="video/mp4">' +
                  '</video></div>';
        } else if (item.type === 'gif') {
          html += '<div class="video-container relative">' +
                  '<video autoplay loop muted playsinline poster="' + (item.thumbnailUrl || '') + '" class="w-full ' + maxHeight + '">' +
                  '<source src="' + item.url + '" type="video/mp4">' +
                  '</video>' +
                  '<div class="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">GIF</div>' +
                  '</div>';
        }
      });
      html += '</div>';
      return html;
    }
    
    // Close modals with Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const quoteModal = document.getElementById('quote-modal');
        if (quoteModal.classList.contains('active')) {
          closeQuoteModal({target: quoteModal});
        }
      }
    });
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
  
  // Generate unique gallery ID for this tweet's media
  const galleryId = `gallery-${++mediaIdCounter}`;
  const galleryScript = tweet.media && tweet.media.length > 0 
    ? `<script>registerGallery('${galleryId}', ${JSON.stringify(tweet.media)});</script>` 
    : '';
  
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
          ${renderMedia(tweet.media, false, galleryId)}
          ${quoteHtml}
        </div>
      </div>
    </div>
    ${galleryScript}
  `;
}

/**
 * Render retweeted content
 */
function renderRetweetedContent(rt) {
  const galleryId = `gallery-${++mediaIdCounter}`;
  const galleryScript = rt.media && rt.media.length > 0 
    ? `<script>registerGallery('${galleryId}', ${JSON.stringify(rt.media)});</script>` 
    : '';
  
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
        ${renderMedia(rt.media, false, galleryId)}
      </div>
    </div>
    ${galleryScript}
  `;
}

/**
 * Render quoted tweet (clickable card that opens modal)
 */
function renderQuotedTweet(qt) {
  // Encode the quote tweet data for the modal
  const qtData = encodeURIComponent(JSON.stringify({
    id: qt.id,
    text: qt.text,
    author: qt.author,
    media: qt.media,
    url: qt.url
  }));
  
  // Gallery for inline preview
  const galleryId = `gallery-qt-${++mediaIdCounter}`;
  const galleryScript = qt.media && qt.media.length > 0 
    ? `<script>registerGallery('${galleryId}', ${JSON.stringify(qt.media)});</script>` 
    : '';
  
  return `
    <div class="quote-tweet-card mt-3 border border-border rounded-xl p-3" onclick="openQuoteModal('${qtData}')">
      <div class="flex items-center gap-2">
        <img src="${qt.author.profileImage}" alt="${qt.author.displayName}" 
             class="w-5 h-5 rounded-full" onerror="this.src='https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'">
        <span class="font-semibold text-sm">${escapeHtml(qt.author.displayName)}</span>
        ${qt.author.verified ? '<svg class="verified-badge w-3 h-3" viewBox="0 0 22 22"><path fill="currentColor" d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>' : ''}
        <span class="text-muted-foreground text-sm">@${qt.author.username}</span>
      </div>
      <div class="mt-1 text-sm whitespace-pre-wrap break-words line-clamp-3">${formatTweetText(qt.text)}</div>
      ${renderMediaPreview(qt.media)}
    </div>
    ${galleryScript}
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
  
  const firstGalleryId = `gallery-${++mediaIdCounter}`;
  const firstGalleryScript = firstTweet.media && firstTweet.media.length > 0 
    ? `<script>registerGallery('${firstGalleryId}', ${JSON.stringify(firstTweet.media)});</script>` 
    : '';
  
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
          ${renderMedia(firstTweet.media, false, firstGalleryId)}
        </div>
      </div>
      ${firstGalleryScript}
      
      ${restTweets.length > 0 ? `
        <!-- Toggle Button -->
        <button onclick="toggleThread('${thread.id}')" id="thread-toggle-${thread.id}" 
                class="ml-13 mt-2 text-sm text-primary hover:underline">
          ${expanded ? 'Collapse thread' : 'Show thread'}
        </button>
        
        <!-- Rest of Thread (collapsible) -->
        <div id="thread-content-${thread.id}" class="${expanded ? '' : 'collapsed'}">
          ${restTweets.map((tweet, i) => {
            const tweetGalleryId = `gallery-${++mediaIdCounter}`;
            const tweetGalleryScript = tweet.media && tweet.media.length > 0 
              ? `<script>registerGallery('${tweetGalleryId}', ${JSON.stringify(tweet.media)});</script>` 
              : '';
            return `
            <div class="flex gap-3 mt-3">
              <div class="flex-shrink-0 flex flex-col items-center">
                <div class="w-10 h-10 flex items-center justify-center">
                  ${i < restTweets.length - 1 ? '<div class="w-0.5 h-full bg-border"></div>' : '<div class="w-2 h-2 rounded-full bg-border"></div>'}
                </div>
              </div>
              <div class="flex-1 min-w-0 pt-1">
                <div class="whitespace-pre-wrap break-words">${formatTweetText(tweet.text)}</div>
                ${renderMedia(tweet.media, false, tweetGalleryId)}
              </div>
            </div>
            ${tweetGalleryScript}
          `}).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render media (images, videos, GIFs) - clickable to open lightbox
 */
function renderMedia(media, small = false, galleryId) {
  if (!media || media.length === 0) return '';
  
  const gridClass = media.length === 1 ? 'single' : 
                    media.length === 2 ? 'double' :
                    media.length === 3 ? 'triple' : 'quad';
  
  const maxHeight = small ? 'max-h-40' : 'max-h-96';
  
  const mediaHtml = media.map((item, i) => {
    if (item.type === 'image') {
      return `
        <div class="media-item" onclick="openLightbox('${galleryId}', ${i})">
          <img src="${item.url}" alt="${item.alt || 'Image'}" 
               class="${maxHeight}"
               loading="lazy">
        </div>
      `;
    } else if (item.type === 'video') {
      // Video with inline playback - click thumbnail to start, click again for lightbox
      return `
        <div class="video-container relative" id="video-${galleryId}-${i}">
          <video 
            poster="${item.thumbnailUrl}" 
            preload="metadata"
            controls
            class="w-full ${maxHeight}"
            onclick="event.stopPropagation()">
            <source src="${item.url}" type="video/mp4">
          </video>
          ${item.duration ? `<div class="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded pointer-events-none">${formatDuration(item.duration)}</div>` : ''}
        </div>
      `;
    } else if (item.type === 'gif') {
      return `
        <div class="video-container relative">
          <video autoplay loop muted playsinline poster="${item.thumbnailUrl}"
                 class="w-full ${maxHeight}">
            <source src="${item.url}" type="video/mp4">
          </video>
          <div class="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded pointer-events-none">GIF</div>
        </div>
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
 * Render media preview for quote tweets (full grid, smaller size)
 */
function renderMediaPreview(media) {
  if (!media || media.length === 0) return '';
  
  const gridClass = media.length === 1 ? 'single' : 
                    media.length === 2 ? 'double' :
                    media.length === 3 ? 'triple' : 'quad';
  
  const mediaHtml = media.map((item, i) => {
    if (item.type === 'image') {
      return `
        <div class="media-item-preview">
          <img src="${item.url}" alt="${item.alt || 'Image'}" class="w-full h-full object-cover">
        </div>
      `;
    } else if (item.type === 'video') {
      return `
        <div class="media-item-preview relative">
          <img src="${item.thumbnailUrl}" alt="Video" class="w-full h-full object-cover">
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
              <svg class="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
        </div>
      `;
    } else if (item.type === 'gif') {
      return `
        <div class="media-item-preview relative">
          <img src="${item.thumbnailUrl}" alt="GIF" class="w-full h-full object-cover">
          <div class="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded">GIF</div>
        </div>
      `;
    }
    return '';
  }).join('');
  
  return `
    <div class="mt-2 media-grid-preview ${gridClass} rounded-lg overflow-hidden">
      ${mediaHtml}
    </div>
  `;
}

/**
 * Format duration in milliseconds to MM:SS
 */
function formatDuration(ms) {
  if (!ms) return '';
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    '<a href="$1" target="_blank" rel="noopener" class="text-blue-400 hover:underline" onclick="event.stopPropagation()">$1</a>'
  );
  
  // Convert @mentions to links
  formatted = formatted.replace(
    /@(\w+)/g,
    '<a href="https://twitter.com/$1" target="_blank" rel="noopener" class="text-blue-400 hover:underline" onclick="event.stopPropagation()">@$1</a>'
  );
  
  // Convert #hashtags to links
  formatted = formatted.replace(
    /#(\w+)/g,
    '<a href="https://twitter.com/search?q=%23$1" target="_blank" rel="noopener" class="text-blue-400 hover:underline" onclick="event.stopPropagation()">#$1</a>'
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