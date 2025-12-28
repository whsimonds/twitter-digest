# Twitter Daily Digest 📰

A daily digest of everyone you follow on Twitter. No infinite scroll. No algorithm. Just a finite morning newspaper.

**Read it once. Then go do something great.**

## Features

- 🕐 **Chronological feed** - See tweets in order, not what the algorithm wants
- 🧵 **Thread detection** - Automatically groups self-reply threads with expand/collapse
- 🖼️ **Media support** - Images, videos, and GIFs embedded inline
- 🔄 **Retweets included** - See what people are sharing, with original tweet embedded
- 📱 **Multiple views** - Switch between By Time, By Author, or Threads Only
- 🌙 **Dark mode** - Easy on the eyes
- ✉️ **Email notification** - Get a ping when your digest is ready
- 🆓 **Free hosting** - Runs on GitHub Actions + GitHub Pages

## Cost

| Service | Monthly Cost |
|---------|-------------|
| [xAPIs.dev](https://xapis.dev) | $9.99 (Pro plan) |
| GitHub Actions | Free |
| GitHub Pages | Free |
| Resend (email) | Free (3,000/month) |
| **Total** | **~$10/month** |

## Quick Start

### 1. Get API Keys

1. **xAPIs.dev** - Sign up at [xapis.dev](https://xapis.dev) and get a Pro plan ($9.99/mo)
2. **Resend** (optional) - Sign up at [resend.com](https://resend.com) for email notifications

### 2. Create GitHub Repository

1. Create a new **public** repository on GitHub
2. Upload all files from this project
3. Enable GitHub Pages:
   - Go to Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main`, Folder: `/docs`
   - Save

### 3. Add Secrets

Go to Settings → Secrets and variables → Actions → New repository secret:

| Secret | Required | Description |
|--------|----------|-------------|
| `XAPIS_KEY` | ✅ Yes | Your xAPIs.dev API key |
| `TWITTER_USERNAME` | ✅ Yes | Your Twitter username (without @) |
| `DIGEST_URL` | ✅ Yes | `https://YOURUSERNAME.github.io/REPONAME/` |
| `RESEND_KEY` | ❌ No | Resend API key for email notifications |
| `EMAIL_TO` | ❌ No | Your email address |
| `EMAIL_FROM` | ❌ No | Sender address (must be verified in Resend) |

### 4. Run It

- **Manual:** Go to Actions → Generate Twitter Digest → Run workflow
- **Automatic:** Runs daily at 6 AM Eastern (11:00 UTC)

### 5. View Your Digest

Visit: `https://YOURUSERNAME.github.io/REPONAME/`

## Configuration

All settings can be configured via environment variables. See `.env.example` for the full list.

### Common Customizations

**Change schedule time:**
Edit `.github/workflows/digest.yml`:
```yaml
schedule:
  - cron: '0 11 * * *'  # 11:00 UTC = 6 AM Eastern
```
Use [crontab.guru](https://crontab.guru) to create your cron expression.

**Exclude retweets:**
Add to repository variables (Settings → Secrets → Variables):
```
INCLUDE_RETWEETS=false
```

**Change lookback period:**
```
HOURS_BACK=48  # Get tweets from last 48 hours
```

## Project Structure

```
twitter-digest/
├── config/
│   └── config.js           # Extensible configuration
├── src/
│   ├── adapters/
│   │   └── twitter.js      # Twitter API adapter (xAPIs)
│   ├── processors/
│   │   └── thread.js       # Thread detection
│   ├── generators/
│   │   └── html.js         # HTML page generator
│   └── notifications/
│       └── email.js        # Email notifications
├── docs/                   # GitHub Pages output (auto-generated)
├── .github/workflows/
│   └── digest.yml          # GitHub Actions workflow
├── index.js                # Main entry point
├── package.json
├── .env.example
└── README.md
```

## Extensibility

The architecture is designed to be extensible:

- **New data sources:** Add adapters in `src/adapters/` (e.g., Bluesky, Mastodon)
- **New output formats:** Add generators in `src/generators/` (e.g., markdown, RSS)
- **New notifications:** Add to `src/notifications/` (e.g., Slack, Discord)

## Local Development

```bash
# Clone the repo
git clone https://github.com/YOURUSERNAME/twitter-digest.git
cd twitter-digest

# Create .env file
cp .env.example .env
# Edit .env with your API keys

# Run locally
node index.js

# View the output
open docs/index.html
```

## API Usage

With ~200 accounts followed:
- ~10 credits for following list pagination
- ~200 credits for user tweets
- **Total:** ~210 credits/day × 30 = ~6,300 credits/month
- Pro plan includes 10,000 credits/month ✅

## Troubleshooting

### "No tweets found"
- Check that `TWITTER_USERNAME` is set correctly (without @)
- Verify your xAPIs.dev API key is valid
- Ensure the accounts you follow have tweeted in the last 24 hours

### Workflow not running
- Go to Actions tab and check for errors
- Make sure the repository is public (required for free GitHub Pages)
- Verify secrets are set correctly

### Email not arriving
- Check spam folder
- Verify Resend API key is correct
- If using custom domain, ensure it's verified in Resend
- For testing, use `onboarding@resend.dev` as EMAIL_FROM

## License

MIT
