# Analytics Integration Guide

## Overview

Your social media analytics dashboard now has **complete real-time analytics integration** with all five supported platforms. The system automatically fetches live data from connected social media accounts and displays it throughout the dashboard.

---

## 🎯 What's Implemented

### Backend API Endpoints

All analytics fetching endpoints are now live in `/supabase/functions/server/index.tsx`:

1. **GET** `/make-server-a8139b1c/analytics/instagram` - Fetch Instagram analytics
2. **GET** `/make-server-a8139b1c/analytics/facebook` - Fetch Facebook analytics  
3. **GET** `/make-server-a8139b1c/analytics/twitter` - Fetch Twitter/X analytics
4. **GET** `/make-server-a8139b1c/analytics/linkedin` - Fetch LinkedIn analytics
5. **GET** `/make-server-a8139b1c/analytics/tiktok` - Fetch TikTok analytics
6. **GET** `/make-server-a8139b1c/analytics/all` - Fetch all connected platforms at once

### Frontend Integration

The dashboard components automatically fetch and display real data:

- **Dashboard Component** (`/src/app/components/dashboard.tsx`)
  - Auto-fetches analytics when accounts are connected
  - Merges real data with UI components
  - Shows live/sample data indicator
  - Refresh button for manual updates

- **Platform View Component** (`/src/app/components/platform-view.tsx`)
  - Platform-specific analytics fetching
  - Real-time metrics display
  - Automatic refresh on platform change

- **Analytics Service** (`/src/app/services/analytics-service.ts`)
  - Centralized API calling logic
  - Type-safe data handling
  - Error management

---

## 📊 Data Fetched Per Platform

### Instagram
- Follower count
- Media count (posts)
- Recent media performance (likes, comments)
- Impressions and reach (when available)
- Top 5 posts by engagement
- Engagement rate calculation

### Facebook
- Page followers
- Post count
- Recent posts (likes, comments, shares)
- Page insights
- Top 5 posts by engagement
- Engagement rate calculation

### Twitter/X
- Follower count
- Tweet count
- Recent tweets with metrics
- Impressions per tweet
- Engagement metrics (likes, retweets, replies)
- Top 5 tweets by engagement

### TikTok
- Follower count
- Video count
- Recent videos with metrics
- Views, likes, comments, shares
- Top 5 videos by engagement
- Engagement rate based on views

### LinkedIn
- Basic profile information
- ⚠️ Note: Full analytics require LinkedIn Marketing API access
- Returns basic data with note about limitations

---

## 🔄 How It Works

### 1. User Connects Account via OAuth
When a user successfully connects a social media account:
- OAuth tokens are securely stored in the KV database
- Keys format: `user:{userId}:oauth:{platform}`
- Tokens include access tokens, refresh tokens, user IDs, and usernames

### 2. Analytics Fetching Process
```
User Logs In → Session Token Created
     ↓
Dashboard Loads → Auto-fetch analytics for connected accounts
     ↓
Analytics Service → Calls backend with Bearer token
     ↓
Backend → Retrieves OAuth tokens from KV store
     ↓
Backend → Calls platform APIs with OAuth tokens
     ↓
Backend → Processes & normalizes data
     ↓
Frontend → Receives data & merges with UI
     ↓
Dashboard → Displays real-time metrics
```

### 3. Data Flow Architecture
```
┌─────────────────┐
│  Frontend       │
│  - Dashboard    │──────┐
│  - Platform View│      │
└─────────────────┘      │
                         │ Fetch Request (Bearer: session_token)
                         ↓
┌─────────────────────────────────────┐
│  Backend (Supabase Edge Function)   │
│  1. Authenticate user via JWT       │
│  2. Get OAuth tokens from KV store  │
│  3. Call platform APIs              │
│  4. Process & normalize data        │
│  5. Return JSON response            │
└─────────────────────────────────────┘
                         │
                         │ OAuth Token
                         ↓
┌──────────────────────────────────┐
│  Social Media Platform APIs      │
│  - Instagram Graph API           │
│  - Facebook Graph API            │
│  - Twitter API v2                │
│  - LinkedIn API v2               │
│  - TikTok for Business API       │
└──────────────────────────────────┘
```

---

## 🚀 Usage

### Automatic Fetching
The dashboard automatically fetches analytics when:
- Component mounts and user has connected accounts
- Connected accounts list changes
- User switches between platforms

### Manual Refresh
Users can manually refresh data by:
- Clicking the "Refresh Data" button in the dashboard header
- The button shows a loading spinner during refresh

### Fallback Behavior
If real data fails to fetch:
- Error is logged to console
- User sees an error message banner
- Dashboard falls back to sample/mock data
- User experience remains intact

---

## 📋 API Response Format

All platform endpoints return normalized data:

```typescript
{
  platform: string,           // 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok'
  followers: number,          // Total follower count
  impressions?: number,       // Total impressions (when available)
  reach?: number,             // Total reach (when available)
  posts: number,              // Total posts/content count
  engagements: number,        // Total engagements (likes + comments + shares)
  engagementRate: number,     // Calculated engagement rate
  topPosts: Array<{           // Top 5 posts by engagement
    id: string,
    content: string,
    likes: number,
    comments: number,
    shares: number,
    engagements: number,
    date: string,
    imageUrl?: string
  }>,
  username?: string,          // Platform username
  name?: string,              // Display name
  note?: string              // Additional information (e.g., API limitations)
}
```

---

## 🔐 Security

### Authentication Flow
1. User authenticates with Supabase (JWT token)
2. Frontend sends JWT token in Authorization header
3. Backend validates JWT using Supabase client
4. Backend retrieves user-specific OAuth tokens
5. OAuth tokens never exposed to frontend

### Token Storage
- OAuth tokens stored in KV database
- Isolated per user: `user:{userId}:oauth:{platform}`
- Secure server-side access only
- Automatic cleanup on account disconnection

---

## ⚠️ Important Notes

### API Rate Limits
Be aware of platform API rate limits:
- **Instagram**: 200 calls/hour for Basic Display API
- **Facebook**: Varies by endpoint and app verification
- **Twitter**: 300 requests/15-min window (per endpoint)
- **LinkedIn**: 100,000 calls/day for developers
- **TikTok**: Varies by endpoint and verification level

### Required Scopes
Make sure your OAuth apps have the correct scopes configured:

**Instagram**: `user_profile`, `user_media`
**Facebook**: `pages_read_engagement`, `pages_show_list`, `read_insights`
**Twitter**: `tweet.read`, `users.read`, `offline.access`
**LinkedIn**: `r_liteprofile`, `r_basicprofile`, `r_organization_social`
**TikTok**: `user.info.basic`, `video.list`

### Testing Without API Credentials
If API credentials are not configured:
- Dashboard shows sample data
- Orange banner indicates "Sample Data Mode"
- All features work with mock data
- No errors or broken UI

---

## 🐛 Troubleshooting

### "Failed to fetch analytics" error
1. Check that API credentials are properly configured
2. Verify OAuth tokens are stored in KV database
3. Check platform API status
4. Review server logs for detailed error messages
5. Ensure OAuth scopes include analytics permissions

### Data not updating
1. Try clicking "Refresh Data" button
2. Check if access tokens have expired
3. Reconnect the social media account
4. Verify API rate limits haven't been exceeded

### Missing metrics
Some platforms have API limitations:
- **LinkedIn**: Limited analytics without Marketing API access
- **Instagram**: Insights require Business/Creator account
- **Facebook**: Full insights require Page admin access

### Token expiration
If tokens expire:
- User will see an error when fetching analytics
- User should disconnect and reconnect the account
- Refresh tokens are stored for platforms that support them

---

## 🎨 UI Features

### Data Status Indicators
- **Blue Banner**: "Live Data Connected" - Real analytics are being displayed
- **Orange Banner**: "Sample Data Mode" - Using mock data (API not configured)
- **Refresh Button**: Manual data refresh with loading spinner

### Metrics Display
- Real data seamlessly merges with existing UI
- All charts and graphs work with both real and mock data
- Top posts table shows actual content when available
- Engagement rates calculated from real metrics

---

## 📈 Future Enhancements

Potential improvements:
1. **Caching**: Implement data caching to reduce API calls
2. **Historical Data**: Store metrics over time in database
3. **Scheduled Sync**: Automatic periodic data refresh
4. **Webhooks**: Real-time updates via platform webhooks
5. **Advanced Analytics**: Sentiment analysis, trend prediction
6. **Export**: Download analytics data as CSV/PDF

---

## 📞 Need Help?

- Check the OAUTH_SETUP_GUIDE.md for OAuth configuration
- Review server logs for detailed error messages
- Consult platform API documentation for specific limitations
- Test with one platform at a time to isolate issues

---

**Note**: This integration is production-ready but requires proper API credentials to fetch real data. Without credentials, the dashboard gracefully falls back to sample data while maintaining full functionality.
