# OAuth Setup Guide for Social Media Analytics Dashboard

Your application now supports **real OAuth authentication** for connecting social media accounts! Follow the steps below to configure each platform.

## 🔑 Required Environment Variables

You need to add API credentials for each social media platform you want to support. These are added as Supabase secrets/environment variables.

### Required Secrets:

1. **FACEBOOK_APP_ID** - For Instagram & Facebook
2. **FACEBOOK_APP_SECRET** - For Instagram & Facebook
3. **TWITTER_CLIENT_ID** - For X/Twitter
4. **TWITTER_CLIENT_SECRET** - For X/Twitter
5. **LINKEDIN_CLIENT_ID** - For LinkedIn
6. **LINKEDIN_CLIENT_SECRET** - For LinkedIn
7. **TIKTOK_CLIENT_KEY** - For TikTok
8. **TIKTOK_CLIENT_SECRET** - For TikTok (already added)

---

## 📱 Platform Setup Instructions

### 1. Instagram & Facebook (Meta)

**Step 1:** Go to [Meta for Developers](https://developers.facebook.com/)
- Log in with your Facebook account
- Click "My Apps" → "Create App"
- Select "Business" as the app type
- Fill in app details and create

**Step 2:** Configure the App
- In your app dashboard, go to "Settings" → "Basic"
- Note your **App ID** and **App Secret**
- Add these to Supabase secrets:
  - `FACEBOOK_APP_ID`
  - `FACEBOOK_APP_SECRET`

**Step 3:** Add OAuth Redirect URIs
- Go to "Products" → Add "Facebook Login" and "Instagram Basic Display"
- In Facebook Login settings, add Valid OAuth Redirect URIs:
  ```
  https://[your-supabase-project-id].supabase.co/functions/v1/make-server-a8139b1c/oauth/facebook/callback
  https://[your-supabase-project-id].supabase.co/functions/v1/make-server-a8139b1c/oauth/instagram/callback
  ```

**Step 4:** Request Permissions
- For Instagram: Add product "Instagram Basic Display"
- Configure permissions: `user_profile`, `user_media`
- For Facebook: Add permissions `pages_read_engagement`, `pages_show_list`, `read_insights`

---

### 2. X/Twitter

**Step 1:** Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
- Apply for a developer account if you don't have one
- Create a new "Project" and "App"

**Step 2:** Configure OAuth 2.0
- In your app settings, enable "OAuth 2.0"
- Set Type of App to "Web App"
- Add Callback URI:
  ```
  https://[your-supabase-project-id].supabase.co/functions/v1/make-server-a8139b1c/oauth/twitter/callback
  ```

**Step 3:** Get Credentials
- Copy your **Client ID** and **Client Secret**
- Add to Supabase secrets:
  - `TWITTER_CLIENT_ID`
  - `TWITTER_CLIENT_SECRET`

**Step 4:** Set Permissions
- Request permissions: `tweet.read`, `users.read`, `offline.access`

---

### 3. LinkedIn

**Step 1:** Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
- Click "Create App"
- Fill in app details (name, company page, logo, etc.)

**Step 2:** Configure OAuth
- In app settings, go to "Auth" tab
- Add OAuth 2.0 Redirect URL:
  ```
  https://[your-supabase-project-id].supabase.co/functions/v1/make-server-a8139b1c/oauth/linkedin/callback
  ```

**Step 3:** Get Credentials
- Copy your **Client ID** and **Client Secret**
- Add to Supabase secrets:
  - `LINKEDIN_CLIENT_ID`
  - `LINKEDIN_CLIENT_SECRET`

**Step 4:** Request Products
- Request access to "Sign In with LinkedIn" product
- Request permissions: `r_liteprofile`, `r_basicprofile`, `r_organization_social`

---

### 4. TikTok

**Step 1:** Go to [TikTok for Developers](https://developers.tiktok.com/)
- Log in and create a new app
- Choose "Web" as platform

**Step 2:** Configure OAuth
- In app settings, add Redirect URL:
  ```
  https://[your-supabase-project-id].supabase.co/functions/v1/make-server-a8139b1c/oauth/tiktok/callback
  ```

**Step 3:** Get Credentials
- Copy your **Client Key** and **Client Secret**
- Add to Supabase secrets:
  - `TIKTOK_CLIENT_KEY`
  - `TIKTOK_CLIENT_SECRET` (already added)

**Step 4:** Request Scopes
- Request access to scopes: `user.info.basic`, `video.list`

---

## 🚀 Adding Secrets to Supabase

### Method 1: Via Figma Make UI
The system will prompt you to add secrets when needed.

### Method 2: Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to "Settings" → "Edge Functions" → "Secrets"
3. Add each environment variable with its corresponding value

### Method 3: Via Supabase CLI
```bash
supabase secrets set FACEBOOK_APP_ID=your_app_id_here
supabase secrets set FACEBOOK_APP_SECRET=your_app_secret_here
supabase secrets set TWITTER_CLIENT_ID=your_client_id_here
supabase secrets set TWITTER_CLIENT_SECRET=your_client_secret_here
supabase secrets set LINKEDIN_CLIENT_ID=your_client_id_here
supabase secrets set LINKEDIN_CLIENT_SECRET=your_client_secret_here
supabase secrets set TIKTOK_CLIENT_KEY=your_client_key_here
```

---

## ✅ Testing OAuth Integration

1. **Deploy your application** - Make sure all changes are deployed
2. **Sign up/Login** - Create an account or log in
3. **Connect Social Accounts** - Click "Connect" on the onboarding screen
4. **Authorize** - You'll be redirected to each platform's OAuth page
5. **Grant Permissions** - Allow the requested permissions
6. **Success!** - You'll be redirected back to your app

---

## 🔒 Security Notes

- **Never commit API secrets to version control**
- Store all credentials in Supabase environment variables
- OAuth tokens are stored securely in your key-value database
- Each user's tokens are isolated and encrypted
- Refresh tokens are stored for platforms that support them

---

## 🐛 Troubleshooting

### "OAuth not configured" error
- Ensure you've added the required environment variables for that platform
- Restart your Supabase Edge Functions after adding new secrets

### "Invalid redirect URI" error
- Double-check that your redirect URIs match exactly in the platform's developer console
- Make sure to replace `[your-supabase-project-id]` with your actual Supabase project ID

### Popup blocked
- Allow popups from your application domain
- Check browser settings for popup blockers

### "Invalid state" error
- This is a security check - try connecting again
- Clear your browser cache and cookies

---

## 📊 What Happens After Connection

Once users connect their accounts:
1. Access tokens are securely stored in the database
2. The app can fetch real analytics data from each platform
3. Connected accounts appear in the dashboard
4. Users can disconnect accounts at any time

---

## 🔄 Next Steps: Fetch Real Data

After OAuth is working, you'll want to:
1. Create API endpoints to fetch analytics from each platform
2. Use stored access tokens to authenticate API requests
3. Parse and store metrics in your database
4. Display real data in your dashboard components

Example platforms APIs to integrate:
- **Instagram**: Instagram Graph API
- **Facebook**: Facebook Graph API
- **Twitter**: Twitter API v2
- **LinkedIn**: LinkedIn Marketing Developer Platform
- **TikTok**: TikTok for Business API

---

Need help? Check the official documentation for each platform or reach out for support!
