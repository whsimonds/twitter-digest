/**
 * Email Notifier
 * 
 * Sends a minimal notification email when the digest is ready.
 */

import config from '../../config/config.js';

/**
 * Send notification email via Resend
 */
export async function sendNotification(stats, digestUrl) {
  const { email } = config.notifications;
  
  if (!email.enabled || !email.apiKey) {
    console.log('📧 Email notifications disabled (no API key)');
    return null;
  }
  
  if (!email.to) {
    console.log('📧 Email notifications disabled (no recipient)');
    return null;
  }
  
  const date = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  
  const subject = `📰 Your Twitter Digest is ready - ${date}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                 max-width: 400px; margin: 0 auto; padding: 40px 20px; 
                 background-color: #0a0a0a; color: #fafafa;">
      
      <div style="text-align: center;">
        <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">
          Your digest is ready
        </h1>
        
        <p style="font-size: 32px; font-weight: 700; margin: 20px 0;">
          ${stats.totalTweets} tweets
        </p>
        
        <p style="color: #a1a1aa; margin: 0 0 24px;">
          from ${stats.uniqueAuthors} accounts
          ${stats.threadCount > 0 ? ` · ${stats.threadCount} threads` : ''}
        </p>
        
        <a href="${digestUrl}" 
           style="display: inline-block; background-color: #fafafa; color: #0a0a0a;
                  padding: 12px 24px; border-radius: 8px; text-decoration: none;
                  font-weight: 500; font-size: 14px;">
          Read your digest →
        </a>
        
        <p style="color: #71717a; font-size: 12px; margin-top: 32px; font-style: italic;">
          Read it once. Then go do something great.
        </p>
      </div>
      
    </body>
    </html>
  `;
  
  const text = `Your Twitter Digest is ready.

${stats.totalTweets} tweets from ${stats.uniqueAuthors} accounts${stats.threadCount > 0 ? ` · ${stats.threadCount} threads` : ''}

Read your digest: ${digestUrl}

---
Read it once. Then go do something great.`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${email.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: email.from,
        to: email.to,
        subject,
        html,
        text,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend error (${response.status}): ${error}`);
    }
    
    const result = await response.json();
    console.log(`📧 Notification email sent! ID: ${result.id}`);
    return result;
    
  } catch (error) {
    console.error(`📧 Failed to send email: ${error.message}`);
    return null;
  }
}
