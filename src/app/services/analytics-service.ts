import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/server/make-server-a8139b1c`;

export interface AnalyticsData {
  platform: string;
  followers: number;
  impressions?: number;
  reach?: number;
  posts: number;
  engagements: number;
  engagementRate: number;
  topPosts?: any[];
  username?: string;
  name?: string;
  note?: string;
  error?: string;
  connected?: boolean;
}

export interface AllAnalyticsResponse {
  analytics: Record<string, AnalyticsData>;
}

/**
 * Fetch analytics for a specific platform
 */
export async function fetchPlatformAnalytics(
  platform: string,
  accessToken: string
): Promise<AnalyticsData> {
  try {
    const response = await fetch(`${API_BASE_URL}/analytics/${platform}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch ${platform} analytics`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${platform} analytics:`, error);
    throw error;
  }
}

/**
 * Fetch analytics for all connected platforms
 */
export async function fetchAllAnalytics(
  accessToken: string
): Promise<AllAnalyticsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/analytics/all`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch analytics');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching all analytics:', error);
    throw error;
  }
}

/**
 * Check OAuth connection status for all platforms
 */
export async function fetchOAuthStatus(accessToken: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/oauth/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch OAuth status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching OAuth status:', error);
    throw error;
  }
}
