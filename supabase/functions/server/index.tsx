import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

// Log environment setup (without exposing full keys)
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const hasServiceKey = !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const hasAnonKey = !!Deno.env.get('SUPABASE_ANON_KEY');

console.log('=== Supabase Configuration ===');
console.log('URL:', supabaseUrl);
console.log('Has Service Role Key:', hasServiceKey);
console.log('Has Anon Key:', hasAnonKey);

if (!supabaseUrl || !hasServiceKey || !hasAnonKey) {
  console.error('ERROR: Missing required environment variables!');
}

// Create Supabase client for admin operations (user creation, etc.)
const supabaseAdmin = createClient(
  supabaseUrl ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Create Supabase client with anon key for JWT verification
const supabaseClient = createClient(
  supabaseUrl ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
);

// Helper function to get authenticated user from request
async function getAuthenticatedUser(authHeader: string | undefined) {
  if (!authHeader) {
    console.error('AUTH ERROR: No authorization header provided');
    return { user: null, error: { message: 'No authorization header', code: 401 } };
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (!token || token.length === 0) {
    console.error('AUTH ERROR: No token in authorization header');
    return { user: null, error: { message: 'No token provided', code: 401 } }
  }

  console.log('AUTH: Attempting to authenticate user with token (length:', token.length, ')');
  console.log('AUTH: Token preview:', token.substring(0, 20) + '...');

  try {
    // Use admin client to verify user tokens (works for both password and OAuth users)
    console.log('AUTH: Verifying token with Supabase admin client...');
    
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error) {
      console.error('AUTH: JWT verification failed:', error.message);
      console.error('AUTH: Error details:', JSON.stringify(error));
      return { user: null, error: { message: error.message, code: 401 } };
    }

    if (!user) {
      console.error('AUTH: No user found for token');
      return { user: null, error: { message: 'Invalid token - no user found', code: 401 } };
    }

    console.log('AUTH: ✅ User authenticated successfully:', user.id);
    console.log('AUTH: User email:', user.email);
    return { user, error: null };
  } catch (err) {
    console.error('AUTH: Exception in getAuthenticatedUser:', err);
    console.error('AUTH: Exception stack:', err instanceof Error ? err.stack : 'No stack trace');
    return { user: null, error: { message: 'Authentication failed', details: String(err), code: 500 } };
  }
}

// Sign up endpoint
app.post('/make-server-a8139b1c/signup', async (c) => {
  try {
    const { name, email, password } = await c.req.json();

    if (!name || !email || !password) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    console.log('Signup attempt for email:', email);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email === email);

    if (userExists) {
      console.log('User already exists:', email);
      return c.json({ 
        error: 'A user with this email address has already been registered. Please try logging in instead.' 
      }, 400);
    }

    // Create user with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (error) {
      console.log('Signup error from Supabase:', error);
      return c.json({ error: error.message }, 400);
    }

    if (!data.user) {
      return c.json({ error: 'Failed to create user' }, 500);
    }

    console.log('User created successfully:', data.user.id);

    // Initialize user data in KV store
    await kv.set(`user:${data.user.id}:profile`, {
      id: data.user.id,
      name,
      email,
      createdAt: new Date().toISOString(),
    });

    await kv.set(`user:${data.user.id}:connectedAccounts`, []);

    console.log('User profile and data initialized in KV store');

    // Generate a session token for the newly created user
    try {
      const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
      });

      if (sessionError) {
        console.log('Failed to generate session:', sessionError);
      }

      // Use the regular client to sign in and get a proper JWT
      const supabaseUserClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      );

      const { data: signInData, error: signInError } = await supabaseUserClient.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInError && signInData.session) {
        console.log('Generated session token for new user');
        return c.json({ 
          success: true, 
          user: { 
            id: data.user.id, 
            email: data.user.email,
            name,
          },
          session: signInData.session
        });
      } else {
        console.log('Failed to auto-sign in:', signInError);
      }
    } catch (sessionErr) {
      console.log('Error generating session:', sessionErr);
    }

    // Return success without session if sign-in failed
    return c.json({ 
      success: true, 
      user: { 
        id: data.user.id, 
        email: data.user.email,
        name,
      }
    });
  } catch (err) {
    console.log('Signup error:', err);
    return c.json({ error: 'Signup failed' }, 500);
  }
});

// Login endpoint (handled by Supabase client-side, but included for completeness)
app.post('/make-server-a8139b1c/login', async (c) => {
  return c.json({ 
    message: 'Use Supabase client signInWithPassword directly' 
  });
});

// Get user profile
app.get('/make-server-a8139b1c/profile', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    console.log('Profile request - Auth header:', authHeader ? 'Present' : 'Missing');
    
    const { user, error } = await getAuthenticatedUser(authHeader);

    if (error) {
      console.log('Profile request - Auth error:', error.message, error);
      return c.json({ error: 'Unauthorized - Invalid token', details: error.message }, 401);
    }

    if (!user) {
      console.log('Profile request - No user found for token');
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }

    console.log('Profile request - User authenticated:', user.id);
    const profile = await kv.get(`user:${user.id}:profile`);

    if (!profile) {
      console.log('Profile request - Profile not found for user:', user.id);
      return c.json({ error: 'Profile not found' }, 404);
    }

    console.log('Profile request - Success for user:', user.id);
    return c.json({ profile });
  } catch (err) {
    console.log('Profile fetch error:', err);
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});

// Connect social account
app.post('/make-server-a8139b1c/connect-account', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json({ error: 'Unauthorized - Missing token' }, 401);
    }

    const { user, error } = await getAuthenticatedUser(authHeader);

    if (error || !user) {
      console.log('Auth error while connecting account:', error);
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }

    const { connectedAccounts } = await c.req.json();

    if (!Array.isArray(connectedAccounts)) {
      return c.json({ error: 'Invalid connected accounts data' }, 400);
    }

    // Store connected accounts
    await kv.set(`user:${user.id}:connectedAccounts`, connectedAccounts);

    return c.json({ success: true, connectedAccounts });
  } catch (err) {
    console.log('Connect account error:', err);
    return c.json({ error: 'Failed to connect accounts' }, 500);
  }
});

// Get connected accounts
app.get('/make-server-a8139b1c/connected-accounts', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return c.json({ error: 'Unauthorized - Missing token' }, 401);
    }

    const { user, error } = await getAuthenticatedUser(authHeader);

    if (error || !user) {
      console.log('Auth error while fetching connected accounts:', error);
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }

    const connectedAccounts = await kv.get(`user:${user.id}:connectedAccounts`) || [];

    return c.json({ connectedAccounts });
  } catch (err) {
    console.log('Fetch connected accounts error:', err);
    return c.json({ error: 'Failed to fetch connected accounts' }, 500);
  }
});

// Reset password for user (admin utility endpoint)
app.post('/make-server-a8139b1c/reset-password', async (c) => {
  try {
    const { email, newPassword } = await c.req.json();

    if (!email || !newPassword) {
      return c.json({ error: 'Missing email or password' }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400);
    }

    console.log('Password reset attempt for email:', email);

    // Find user by email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const user = existingUsers?.users?.find(u => u.email === email);

    if (!user) {
      console.log('Password reset failed: User not found for email:', email);
      return c.json({ error: 'No account found with this email address. Please sign up first.' }, 404);
    }

    console.log('Found user for password reset:', user.id);

    // Update user's password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (error) {
      console.log('Password reset error from Supabase:', error);
      return c.json({ error: error.message }, 400);
    }

    console.log('Password reset successful for user:', user.id);

    return c.json({ 
      success: true,
      message: 'Password updated successfully. You can now log in with your new password.'
    });
  } catch (err) {
    console.log('Password reset error:', err);
    return c.json({ error: 'Password reset failed' }, 500);
  }
});

// Health check
app.get('/make-server-a8139b1c/health', (c) => {
  return c.json({ status: 'ok' });
});

// Test auth endpoint - helps debug JWT issues
app.get('/make-server-a8139b1c/test-auth', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    console.log('=== Test Auth Endpoint ===');
    console.log('Auth header:', authHeader);
    
    if (!authHeader) {
      return c.json({ error: 'No auth header provided' }, 400);
    }
    
    const token = authHeader.replace('Bearer ', '');
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 50) + '...');
    
    const { user, error } = await getAuthenticatedUser(authHeader);
    
    if (error) {
      console.log('Auth error:', JSON.stringify(error));
      return c.json({ 
        success: false, 
        error: error.message,
        details: error 
      }, 401);
    }
    
    console.log('Auth success! User:', user?.id);
    return c.json({ 
      success: true, 
      userId: user?.id,
      userEmail: user?.email 
    });
  } catch (err) {
    console.error('Test auth exception:', err);
    return c.json({ error: 'Exception during auth test', details: String(err) }, 500);
  }
});

// ========================================
// OAuth Integration Routes
// ========================================

// OAuth Initiation - Instagram (via Facebook)
app.get('/make-server-a8139b1c/oauth/instagram/initiate', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    console.log('Instagram OAuth initiation - Auth header present:', !!authHeader);
    
    const { user, error } = await getAuthenticatedUser(authHeader);
    
    if (error || !user) {
      console.error('Instagram OAuth initiation - Auth failed:', error);
      return c.json({ error: error?.message || 'Unauthorized' }, 401);
    }

    console.log('Instagram OAuth initiation - User authenticated:', user.id);

    const clientId = Deno.env.get('FACEBOOK_APP_ID');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/make-server-a8139b1c/oauth/instagram/callback`;
    
    if (!clientId) {
      return c.json({ error: 'Instagram OAuth not configured' }, 500);
    }

    // Store user ID in state for callback verification
    const state = crypto.randomUUID();
    await kv.set(`oauth:state:${state}`, { userId: user.id, platform: 'instagram' }, 600); // 10 min expiry

    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user_profile,user_media&response_type=code&state=${state}`;
    
    return c.json({ authUrl, state });
  } catch (err) {
    console.log('Instagram OAuth initiation error:', err);
    return c.json({ error: 'Failed to initiate Instagram OAuth' }, 500);
  }
});

// OAuth Callback - Instagram
app.get('/make-server-a8139b1c/oauth/instagram/callback', async (c) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const error = c.req.query('error');

    if (error) {
      return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'instagram', error: '${error}' }, '*'); window.close();</script>`);
    }

    if (!code || !state) {
      return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'instagram', error: 'Missing code or state' }, '*'); window.close();</script>`);
    }

    // Verify state and get user ID
    const stateData = await kv.get(`oauth:state:${state}`);
    if (!stateData) {
      return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'instagram', error: 'Invalid state' }, '*'); window.close();</script>`);
    }

    const { userId } = stateData;

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('FACEBOOK_APP_ID') ?? '',
        client_secret: Deno.env.get('FACEBOOK_APP_SECRET') ?? '',
        grant_type: 'authorization_code',
        redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/make-server-a8139b1c/oauth/instagram/callback`,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'instagram', error: '${tokenData.error.message}' }, '*'); window.close();</script>`);
    }

    // Get user profile
    const profileResponse = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${tokenData.access_token}`);
    const profileData = await profileResponse.json();

    // Store tokens and profile
    await kv.set(`user:${userId}:oauth:instagram`, {
      accessToken: tokenData.access_token,
      userId: profileData.id,
      username: profileData.username,
      connectedAt: new Date().toISOString(),
    });

    // Clean up state
    await kv.del(`oauth:state:${state}`);

    return c.html(`<script>window.opener.postMessage({ type: 'oauth-success', platform: 'instagram', username: '${profileData.username}' }, '*'); window.close();</script>`);
  } catch (err) {
    console.log('Instagram OAuth callback error:', err);
    return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'instagram', error: 'Callback failed' }, '*'); window.close();</script>`);
  }
});

// OAuth Initiation - Facebook
app.get('/make-server-a8139b1c/oauth/facebook/initiate', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await getAuthenticatedUser(authHeader);
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const clientId = Deno.env.get('FACEBOOK_APP_ID');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/make-server-a8139b1c/oauth/facebook/callback`;
    
    if (!clientId) {
      return c.json({ error: 'Facebook OAuth not configured' }, 500);
    }

    const state = crypto.randomUUID();
    await kv.set(`oauth:state:${state}`, { userId: user.id, platform: 'facebook' }, 600);

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=pages_read_engagement,pages_show_list,read_insights&response_type=code&state=${state}`;
    
    return c.json({ authUrl, state });
  } catch (err) {
    console.log('Facebook OAuth initiation error:', err);
    return c.json({ error: 'Failed to initiate Facebook OAuth' }, 500);
  }
});

// OAuth Callback - Facebook
app.get('/make-server-a8139b1c/oauth/facebook/callback', async (c) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const error = c.req.query('error');

    if (error) {
      return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'facebook', error: '${error}' }, '*'); window.close();</script>`);
    }

    if (!code || !state) {
      return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'facebook', error: 'Missing code or state' }, '*'); window.close();</script>`);
    }

    const stateData = await kv.get(`oauth:state:${state}`);
    if (!stateData) {
      return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'facebook', error: 'Invalid state' }, '*'); window.close();</script>`);
    }

    const { userId } = stateData;
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/make-server-a8139b1c/oauth/facebook/callback`;

    // Exchange code for access token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${Deno.env.get('FACEBOOK_APP_ID')}&client_secret=${Deno.env.get('FACEBOOK_APP_SECRET')}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;
    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'facebook', error: '${tokenData.error.message}' }, '*'); window.close();</script>`);
    }

    // Get user profile
    const profileResponse = await fetch(`https://graph.facebook.com/me?fields=id,name&access_token=${tokenData.access_token}`);
    const profileData = await profileResponse.json();

    // Store tokens and profile
    await kv.set(`user:${userId}:oauth:facebook`, {
      accessToken: tokenData.access_token,
      userId: profileData.id,
      name: profileData.name,
      connectedAt: new Date().toISOString(),
    });

    await kv.del(`oauth:state:${state}`);

    return c.html(`<script>window.opener.postMessage({ type: 'oauth-success', platform: 'facebook', username: '${profileData.name}' }, '*'); window.close();</script>`);
  } catch (err) {
    console.log('Facebook OAuth callback error:', err);
    return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'facebook', error: 'Callback failed' }, '*'); window.close();</script>`);
  }
});

// OAuth Initiation - X/Twitter
app.get('/make-server-a8139b1c/oauth/twitter/initiate', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await getAuthenticatedUser(authHeader);
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const clientId = Deno.env.get('TWITTER_CLIENT_ID');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/make-server-a8139b1c/oauth/twitter/callback`;
    
    if (!clientId) {
      return c.json({ error: 'Twitter OAuth not configured' }, 500);
    }

    const state = crypto.randomUUID();
    const codeVerifier = crypto.randomUUID() + crypto.randomUUID();
    
    await kv.set(`oauth:state:${state}`, { userId: user.id, platform: 'twitter', codeVerifier }, 600);

    const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.read%20users.read%20offline.access&state=${state}&code_challenge=challenge&code_challenge_method=plain`;
    
    return c.json({ authUrl, state });
  } catch (err) {
    console.log('Twitter OAuth initiation error:', err);
    return c.json({ error: 'Failed to initiate Twitter OAuth' }, 500);
  }
});

// OAuth Callback - X/Twitter
app.get('/make-server-a8139b1c/oauth/twitter/callback', async (c) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const error = c.req.query('error');

    if (error) {
      return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'twitter', error: '${error}' }, '*'); window.close();</script>`);
    }

    if (!code || !state) {
      return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'twitter', error: 'Missing code or state' }, '*'); window.close();</script>`);
    }

    const stateData = await kv.get(`oauth:state:${state}`);
    if (!stateData) {
      return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'twitter', error: 'Invalid state' }, '*'); window.close();</script>`);
    }

    const { userId, codeVerifier } = stateData;
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/make-server-a8139b1c/oauth/twitter/callback`;

    // Exchange code for access token
    const authString = btoa(`${Deno.env.get('TWITTER_CLIENT_ID')}:${Deno.env.get('TWITTER_CLIENT_SECRET')}`);
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authString}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: Deno.env.get('TWITTER_CLIENT_ID') ?? '',
        redirect_uri: redirectUri,
        code_verifier: 'challenge',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'twitter', error: '${tokenData.error}' }, '*'); window.close();</script>`);
    }

    // Get user profile
    const profileResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileResponse.json();

    // Store tokens and profile
    await kv.set(`user:${userId}:oauth:twitter`, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      userId: profileData.data?.id,
      username: profileData.data?.username,
      connectedAt: new Date().toISOString(),
    });

    await kv.del(`oauth:state:${state}`);

    return c.html(`<script>window.opener.postMessage({ type: 'oauth-success', platform: 'twitter', username: '@${profileData.data?.username}' }, '*'); window.close();</script>`);
  } catch (err) {
    console.log('Twitter OAuth callback error:', err);
    return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'twitter', error: 'Callback failed' }, '*'); window.close();</script>`);
  }
});

// OAuth Initiation - LinkedIn
app.get('/make-server-a8139b1c/oauth/linkedin/initiate', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await getAuthenticatedUser(authHeader);
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const clientId = Deno.env.get('LINKEDIN_CLIENT_ID');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/make-server-a8139b1c/oauth/linkedin/callback`;
    
    if (!clientId) {
      return c.json({ error: 'LinkedIn OAuth not configured' }, 500);
    }

    const state = crypto.randomUUID();
    await kv.set(`oauth:state:${state}`, { userId: user.id, platform: 'linkedin' }, 600);

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=r_liteprofile%20r_basicprofile%20r_organization_social&state=${state}`;
    
    return c.json({ authUrl, state });
  } catch (err) {
    console.log('LinkedIn OAuth initiation error:', err);
    return c.json({ error: 'Failed to initiate LinkedIn OAuth' }, 500);
  }
});

// OAuth Callback - LinkedIn
app.get('/make-server-a8139b1c/oauth/linkedin/callback', async (c) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const error = c.req.query('error');

    if (error) {
      return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'linkedin', error: '${error}' }, '*'); window.close();</script>`);
    }

    if (!code || !state) {
      return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'linkedin', error: 'Missing code or state' }, '*'); window.close();</script>`);
    }

    const stateData = await kv.get(`oauth:state:${state}`);
    if (!stateData) {
      return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'linkedin', error: 'Invalid state' }, '*'); window.close();</script>`);
    }

    const { userId } = stateData;
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/make-server-a8139b1c/oauth/linkedin/callback`;

    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: Deno.env.get('LINKEDIN_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('LINKEDIN_CLIENT_SECRET') ?? '',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'linkedin', error: '${tokenData.error_description}' }, '*'); window.close();</script>`);
    }

    // Get user profile
    const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileResponse.json();

    // Store tokens and profile
    await kv.set(`user:${userId}:oauth:linkedin`, {
      accessToken: tokenData.access_token,
      userId: profileData.id,
      name: `${profileData.localizedFirstName} ${profileData.localizedLastName}`,
      connectedAt: new Date().toISOString(),
    });

    await kv.del(`oauth:state:${state}`);

    return c.html(`<script>window.opener.postMessage({ type: 'oauth-success', platform: 'linkedin', username: '${profileData.localizedFirstName} ${profileData.localizedLastName}' }, '*'); window.close();</script>`);
  } catch (err) {
    console.log('LinkedIn OAuth callback error:', err);
    return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'linkedin', error: 'Callback failed' }, '*'); window.close();</script>`);
  }
});

// OAuth Initiation - TikTok
app.get('/make-server-a8139b1c/oauth/tiktok/initiate', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await getAuthenticatedUser(authHeader);
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const clientKey = Deno.env.get('TIKTOK_CLIENT_KEY');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/make-server-a8139b1c/oauth/tiktok/callback`;
    
    if (!clientKey) {
      return c.json({ error: 'TikTok OAuth not configured' }, 500);
    }

    const state = crypto.randomUUID();
    await kv.set(`oauth:state:${state}`, { userId: user.id, platform: 'tiktok' }, 600);

    const authUrl = `https://www.tiktok.com/v2/auth/authorize?client_key=${clientKey}&scope=user.info.basic,video.list&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    
    return c.json({ authUrl, state });
  } catch (err) {
    console.log('TikTok OAuth initiation error:', err);
    return c.json({ error: 'Failed to initiate TikTok OAuth' }, 500);
  }
});

// OAuth Callback - TikTok
app.get('/make-server-a8139b1c/oauth/tiktok/callback', async (c) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const error = c.req.query('error');

    if (error) {
      return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'tiktok', error: '${error}' }, '*'); window.close();</script>`);
    }

    if (!code || !state) {
      return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'tiktok', error: 'Missing code or state' }, '*'); window.close();</script>`);
    }

    const stateData = await kv.get(`oauth:state:${state}`);
    if (!stateData) {
      return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'tiktok', error: 'Invalid state' }, '*'); window.close();</script>`);
    }

    const { userId } = stateData;

    // Exchange code for access token
    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: Deno.env.get('TIKTOK_CLIENT_KEY') ?? '',
        client_secret: Deno.env.get('TIKTOK_CLIENT_SECRET') ?? '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/make-server-a8139b1c/oauth/tiktok/callback`,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'tiktok', error: '${tokenData.error}' }, '*'); window.close();</script>`);
    }

    // Get user profile
    const profileResponse = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileResponse.json();

    // Store tokens and profile
    await kv.set(`user:${userId}:oauth:tiktok`, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      userId: profileData.data?.user?.open_id,
      username: profileData.data?.user?.username || profileData.data?.user?.display_name,
      connectedAt: new Date().toISOString(),
    });

    await kv.del(`oauth:state:${state}`);

    return c.html(`<script>window.opener.postMessage({ type: 'oauth-success', platform: 'tiktok', username: '@${profileData.data?.user?.username || profileData.data?.user?.display_name}' }, '*'); window.close();</script>`);
  } catch (err) {
    console.log('TikTok OAuth callback error:', err);
    return c.html(`<script>window.opener.postMessage({ type: 'oauth-error', platform: 'tiktok', error: 'Callback failed' }, '*'); window.close();</script>`);
  }
});

// Get connected OAuth accounts status
app.get('/make-server-a8139b1c/oauth/status', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await getAuthenticatedUser(authHeader);
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const platforms = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok'];
    const status: Record<string, any> = {};

    for (const platform of platforms) {
      const oauthData = await kv.get(`user:${user.id}:oauth:${platform}`);
      if (oauthData) {
        status[platform] = {
          connected: true,
          username: oauthData.username || oauthData.name,
          connectedAt: oauthData.connectedAt,
        };
      } else {
        status[platform] = { connected: false };
      }
    }

    return c.json({ status });
  } catch (err) {
    console.log('OAuth status error:', err);
    return c.json({ error: 'Failed to get OAuth status' }, 500);
  }
});

// Disconnect OAuth account
app.post('/make-server-a8139b1c/oauth/disconnect', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await getAuthenticatedUser(authHeader);
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { platform } = await c.req.json();

    if (!platform) {
      return c.json({ error: 'Platform required' }, 400);
    }

    await kv.del(`user:${user.id}:oauth:${platform}`);

    return c.json({ success: true });
  } catch (err) {
    console.log('OAuth disconnect error:', err);
    return c.json({ error: 'Failed to disconnect account' }, 500);
  }
});

// ========================================
// Analytics Data Fetching Routes
// ========================================

// Fetch Instagram Analytics
app.get('/make-server-a8139b1c/analytics/instagram', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await getAuthenticatedUser(authHeader);
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const oauthData = await kv.get(`user:${user.id}:oauth:instagram`);
    
    if (!oauthData || !oauthData.accessToken) {
      return c.json({ error: 'Instagram not connected' }, 404);
    }

    const accessToken = oauthData.accessToken;
    const instagramUserId = oauthData.userId;

    // Fetch user profile and insights
    const profileResponse = await fetch(
      `https://graph.instagram.com/${instagramUserId}?fields=username,followers_count,media_count&access_token=${accessToken}`
    );
    const profileData = await profileResponse.json();

    if (profileData.error) {
      console.log('Instagram API error:', profileData.error);
      return c.json({ error: 'Failed to fetch Instagram data', details: profileData.error.message }, 400);
    }

    // Fetch recent media for engagement metrics
    const mediaResponse = await fetch(
      `https://graph.instagram.com/${instagramUserId}/media?fields=id,caption,media_type,media_url,timestamp,like_count,comments_count,insights.metric(impressions,reach,engagement)&limit=25&access_token=${accessToken}`
    );
    const mediaData = await mediaResponse.json();

    // Calculate metrics from recent media
    let totalImpressions = 0;
    let totalReach = 0;
    let totalEngagements = 0;
    let totalLikes = 0;
    let totalComments = 0;
    const topPosts: any[] = [];

    if (mediaData.data && Array.isArray(mediaData.data)) {
      mediaData.data.forEach((post: any) => {
        const likes = post.like_count || 0;
        const comments = post.comments_count || 0;
        const engagements = likes + comments;
        
        totalLikes += likes;
        totalComments += comments;
        totalEngagements += engagements;

        // Extract insights if available
        if (post.insights && post.insights.data) {
          post.insights.data.forEach((insight: any) => {
            if (insight.name === 'impressions') totalImpressions += insight.values[0]?.value || 0;
            if (insight.name === 'reach') totalReach += insight.values[0]?.value || 0;
          });
        }

        topPosts.push({
          id: post.id,
          content: post.caption || '',
          imageUrl: post.media_url,
          likes,
          comments,
          shares: 0,
          engagements,
          date: post.timestamp,
        });
      });

      // Sort by engagement
      topPosts.sort((a, b) => b.engagements - a.engagements);
    }

    const followers = profileData.followers_count || 0;
    const mediaCount = profileData.media_count || 0;
    const engagementRate = followers > 0 ? ((totalEngagements / (mediaData.data?.length || 1)) / followers) * 100 : 0;

    return c.json({
      platform: 'instagram',
      followers,
      impressions: totalImpressions,
      reach: totalReach,
      posts: mediaCount,
      engagements: totalEngagements,
      engagementRate: parseFloat(engagementRate.toFixed(2)),
      topPosts: topPosts.slice(0, 5),
      username: profileData.username,
    });
  } catch (err) {
    console.log('Instagram analytics fetch error:', err);
    return c.json({ error: 'Failed to fetch Instagram analytics' }, 500);
  }
});

// Fetch Facebook Analytics
app.get('/make-server-a8139b1c/analytics/facebook', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await getAuthenticatedUser(authHeader);
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const oauthData = await kv.get(`user:${user.id}:oauth:facebook`);
    
    if (!oauthData || !oauthData.accessToken) {
      return c.json({ error: 'Facebook not connected' }, 404);
    }

    const accessToken = oauthData.accessToken;

    // Get user's pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/me/accounts?access_token=${accessToken}`
    );
    const pagesData = await pagesResponse.json();

    if (pagesData.error) {
      console.log('Facebook API error:', pagesData.error);
      return c.json({ error: 'Failed to fetch Facebook data', details: pagesData.error.message }, 400);
    }

    // Use the first page or default to user profile
    const pageId = pagesData.data?.[0]?.id || oauthData.userId;
    const pageAccessToken = pagesData.data?.[0]?.access_token || accessToken;

    // Fetch page insights
    const insightsResponse = await fetch(
      `https://graph.facebook.com/${pageId}?fields=fan_count,followers_count,name&access_token=${pageAccessToken}`
    );
    const insightsData = await insightsResponse.json();

    // Fetch recent posts
    const postsResponse = await fetch(
      `https://graph.facebook.com/${pageId}/posts?fields=id,message,created_time,likes.summary(true),comments.summary(true),shares&limit=25&access_token=${pageAccessToken}`
    );
    const postsData = await postsResponse.json();

    // Calculate metrics
    let totalEngagements = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    const topPosts: any[] = [];

    if (postsData.data && Array.isArray(postsData.data)) {
      postsData.data.forEach((post: any) => {
        const likes = post.likes?.summary?.total_count || 0;
        const comments = post.comments?.summary?.total_count || 0;
        const shares = post.shares?.count || 0;
        const engagements = likes + comments + shares;

        totalLikes += likes;
        totalComments += comments;
        totalShares += shares;
        totalEngagements += engagements;

        topPosts.push({
          id: post.id,
          content: post.message || '',
          likes,
          comments,
          shares,
          engagements,
          date: post.created_time,
        });
      });

      topPosts.sort((a, b) => b.engagements - a.engagements);
    }

    const followers = insightsData.followers_count || insightsData.fan_count || 0;
    const postsCount = postsData.data?.length || 0;
    const engagementRate = followers > 0 && postsCount > 0 ? ((totalEngagements / postsCount) / followers) * 100 : 0;

    return c.json({
      platform: 'facebook',
      followers,
      posts: postsCount,
      engagements: totalEngagements,
      engagementRate: parseFloat(engagementRate.toFixed(2)),
      topPosts: topPosts.slice(0, 5),
      name: insightsData.name,
    });
  } catch (err) {
    console.log('Facebook analytics fetch error:', err);
    return c.json({ error: 'Failed to fetch Facebook analytics' }, 500);
  }
});

// Fetch Twitter Analytics
app.get('/make-server-a8139b1c/analytics/twitter', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await getAuthenticatedUser(authHeader);
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const oauthData = await kv.get(`user:${user.id}:oauth:twitter`);
    
    if (!oauthData || !oauthData.accessToken) {
      return c.json({ error: 'Twitter not connected' }, 404);
    }

    const accessToken = oauthData.accessToken;
    const twitterUserId = oauthData.userId;

    // Fetch user profile with metrics
    const userResponse = await fetch(
      `https://api.twitter.com/2/users/${twitterUserId}?user.fields=public_metrics,username`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );
    const userData = await userResponse.json();

    if (userData.errors) {
      console.log('Twitter API error:', userData.errors);
      return c.json({ error: 'Failed to fetch Twitter data', details: userData.errors[0]?.message }, 400);
    }

    // Fetch recent tweets
    const tweetsResponse = await fetch(
      `https://api.twitter.com/2/users/${twitterUserId}/tweets?max_results=25&tweet.fields=created_at,public_metrics,text`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );
    const tweetsData = await tweetsResponse.json();

    // Calculate metrics
    let totalImpressions = 0;
    let totalEngagements = 0;
    let totalLikes = 0;
    let totalRetweets = 0;
    let totalReplies = 0;
    const topPosts: any[] = [];

    if (tweetsData.data && Array.isArray(tweetsData.data)) {
      tweetsData.data.forEach((tweet: any) => {
        const metrics = tweet.public_metrics || {};
        const likes = metrics.like_count || 0;
        const retweets = metrics.retweet_count || 0;
        const replies = metrics.reply_count || 0;
        const impressions = metrics.impression_count || 0;
        const engagements = likes + retweets + replies;

        totalLikes += likes;
        totalRetweets += retweets;
        totalReplies += replies;
        totalImpressions += impressions;
        totalEngagements += engagements;

        topPosts.push({
          id: tweet.id,
          content: tweet.text || '',
          likes,
          comments: replies,
          shares: retweets,
          engagements,
          date: tweet.created_at,
        });
      });

      topPosts.sort((a, b) => b.engagements - a.engagements);
    }

    const followers = userData.data?.public_metrics?.followers_count || 0;
    const tweetsCount = userData.data?.public_metrics?.tweet_count || 0;
    const engagementRate = followers > 0 && tweetsData.data?.length > 0 
      ? ((totalEngagements / tweetsData.data.length) / followers) * 100 
      : 0;

    return c.json({
      platform: 'twitter',
      followers,
      impressions: totalImpressions,
      posts: tweetsCount,
      engagements: totalEngagements,
      engagementRate: parseFloat(engagementRate.toFixed(2)),
      topPosts: topPosts.slice(0, 5),
      username: userData.data?.username,
    });
  } catch (err) {
    console.log('Twitter analytics fetch error:', err);
    return c.json({ error: 'Failed to fetch Twitter analytics' }, 500);
  }
});

// Fetch LinkedIn Analytics
app.get('/make-server-a8139b1c/analytics/linkedin', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await getAuthenticatedUser(authHeader);
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const oauthData = await kv.get(`user:${user.id}:oauth:linkedin`);
    
    if (!oauthData || !oauthData.accessToken) {
      return c.json({ error: 'LinkedIn not connected' }, 404);
    }

    const accessToken = oauthData.accessToken;

    // Fetch user profile
    const profileResponse = await fetch(
      'https://api.linkedin.com/v2/me',
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );
    const profileData = await profileResponse.json();

    if (profileData.status === 401 || profileData.status === 403) {
      return c.json({ error: 'LinkedIn token expired or invalid' }, 401);
    }

    // Note: LinkedIn's free API has limited analytics access
    // We'll return basic profile data and note that full analytics require LinkedIn Marketing API
    
    return c.json({
      platform: 'linkedin',
      followers: 0, // Requires LinkedIn Marketing API
      posts: 0,
      engagements: 0,
      engagementRate: 0,
      topPosts: [],
      name: `${profileData.localizedFirstName || ''} ${profileData.localizedLastName || ''}`.trim(),
      note: 'Full analytics require LinkedIn Marketing API access. Connect your LinkedIn company page for detailed metrics.',
    });
  } catch (err) {
    console.log('LinkedIn analytics fetch error:', err);
    return c.json({ error: 'Failed to fetch LinkedIn analytics' }, 500);
  }
});

// Fetch TikTok Analytics
app.get('/make-server-a8139b1c/analytics/tiktok', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await getAuthenticatedUser(authHeader);
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const oauthData = await kv.get(`user:${user.id}:oauth:tiktok`);
    
    if (!oauthData || !oauthData.accessToken) {
      return c.json({ error: 'TikTok not connected' }, 404);
    }

    const accessToken = oauthData.accessToken;

    // Fetch user info
    const userResponse = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,follower_count,following_count,likes_count,video_count',
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );
    const userData = await userResponse.json();

    if (userData.error) {
      console.log('TikTok API error:', userData.error);
      return c.json({ error: 'Failed to fetch TikTok data', details: userData.error.message }, 400);
    }

    // Fetch recent videos
    const videosResponse = await fetch(
      'https://open.tiktokapis.com/v2/video/list/?fields=id,title,create_time,cover_image_url,duration,like_count,comment_count,share_count,view_count',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ max_count: 20 }),
      }
    );
    const videosData = await videosResponse.json();

    // Calculate metrics
    let totalEngagements = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalViews = 0;
    const topPosts: any[] = [];

    if (videosData.data?.videos && Array.isArray(videosData.data.videos)) {
      videosData.data.videos.forEach((video: any) => {
        const likes = video.like_count || 0;
        const comments = video.comment_count || 0;
        const shares = video.share_count || 0;
        const views = video.view_count || 0;
        const engagements = likes + comments + shares;

        totalLikes += likes;
        totalComments += comments;
        totalShares += shares;
        totalViews += views;
        totalEngagements += engagements;

        topPosts.push({
          id: video.id,
          content: video.title || '',
          imageUrl: video.cover_image_url,
          likes,
          comments,
          shares,
          engagements,
          views,
          date: new Date(video.create_time * 1000).toISOString(),
        });
      });

      topPosts.sort((a, b) => b.engagements - a.engagements);
    }

    const followers = userData.data?.user?.follower_count || 0;
    const videoCount = userData.data?.user?.video_count || 0;
    const engagementRate = totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0;

    return c.json({
      platform: 'tiktok',
      followers,
      impressions: totalViews,
      reach: totalViews,
      posts: videoCount,
      engagements: totalEngagements,
      engagementRate: parseFloat(engagementRate.toFixed(2)),
      topPosts: topPosts.slice(0, 5),
      username: userData.data?.user?.display_name,
    });
  } catch (err) {
    console.log('TikTok analytics fetch error:', err);
    return c.json({ error: 'Failed to fetch TikTok analytics' }, 500);
  }
});

// Fetch all connected platforms analytics
app.get('/make-server-a8139b1c/analytics/all', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await getAuthenticatedUser(authHeader);
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const platforms = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok'];
    const analyticsData: Record<string, any> = {};

    // Fetch analytics for each connected platform
    for (const platform of platforms) {
      const oauthData = await kv.get(`user:${user.id}:oauth:${platform}`);
      
      if (oauthData && oauthData.accessToken) {
        try {
          // Make internal request to platform-specific endpoint
          const url = new URL(c.req.url);
          const baseUrl = `${url.protocol}//${url.host}`;
          const response = await fetch(
            `${baseUrl}/make-server-a8139b1c/analytics/${platform}`,
            {
              headers: { 'Authorization': authHeader || '' },
            }
          );
          
          if (response.ok) {
            analyticsData[platform] = await response.json();
          } else {
            analyticsData[platform] = { error: 'Failed to fetch', connected: true };
          }
        } catch (err) {
          console.log(`Error fetching ${platform} analytics:`, err);
          analyticsData[platform] = { error: 'Failed to fetch', connected: true };
        }
      } else {
        analyticsData[platform] = { connected: false };
      }
    }

    return c.json({ analytics: analyticsData });
  } catch (err) {
    console.log('Fetch all analytics error:', err);
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});

// Update Profile endpoint
app.post('/make-server-a8139b1c/update-profile', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await getAuthenticatedUser(authHeader);

    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { name, email } = await c.req.json();

    if (!name || !email) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Update user metadata in Supabase Auth
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        email: email,
        user_metadata: { name },
      }
    );

    if (updateError) {
      console.log('Error updating user:', updateError);
      return c.json({ error: updateError.message }, 400);
    }

    // Update profile in KV store
    const profile = await kv.get(`user:${user.id}:profile`) || {};
    await kv.set(`user:${user.id}:profile`, {
      ...profile,
      name,
      email,
      updatedAt: new Date().toISOString(),
    });

    console.log('Profile updated successfully for user:', user.id);
    return c.json({ success: true });
  } catch (err) {
    console.log('Update profile error:', err);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

// Change Password endpoint
app.post('/make-server-a8139b1c/change-password', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await getAuthenticatedUser(authHeader);

    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { currentPassword, newPassword } = await c.req.json();

    if (!currentPassword || !newPassword) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400);
    }

    // Verify current password by attempting to sign in
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { error: signInError } = await supabaseUserClient.auth.signInWithPassword({
      email: user.email ?? '',
      password: currentPassword,
    });

    if (signInError) {
      return c.json({ error: 'Current password is incorrect' }, 400);
    }

    // Update password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.log('Error updating password:', updateError);
      return c.json({ error: updateError.message }, 400);
    }

    console.log('Password changed successfully for user:', user.id);
    return c.json({ success: true });
  } catch (err) {
    console.log('Change password error:', err);
    return c.json({ error: 'Failed to change password' }, 500);
  }
});

// Delete Account endpoint
app.delete('/make-server-a8139b1c/delete-account', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error } = await getAuthenticatedUser(authHeader);

    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Delete all user data from KV store
    const keys = await kv.getByPrefix(`user:${user.id}:`);
    for (const key of keys) {
      await kv.del(key);
    }

    // Delete OAuth tokens
    const platforms = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok'];
    for (const platform of platforms) {
      await kv.del(`oauth:${user.id}:${platform}`);
    }

    // Delete user from Supabase Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.log('Error deleting user from auth:', deleteError);
      return c.json({ error: deleteError.message }, 400);
    }

    console.log('Account deleted successfully for user:', user.id);
    return c.json({ success: true });
  } catch (err) {
    console.log('Delete account error:', err);
    return c.json({ error: 'Failed to delete account' }, 500);
  }
});

Deno.serve(app.fetch);