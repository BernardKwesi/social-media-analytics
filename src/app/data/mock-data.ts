export interface PlatformData {
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok';
  name: string;
  color: string;
  followers: number;
  followerGrowth: number;
  impressions: number;
  reach: number;
  posts: number;
  engagements: number;
  engagementRate: number;
  profileVisits: number;
  linkClicks: number;
  daysInactive: number;
}

export interface TimeSeriesData {
  date: string;
  followers: number;
  engagements: number;
  impressions: number;
  reach: number;
}

export interface TopPost {
  id: string;
  platform: string;
  content: string;
  imageUrl?: string;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  date: string;
}

export interface Goal {
  id: string;
  platform: string;
  metric: string;
  target: number;
  current: number;
  period: 'weekly' | 'monthly';
  status: 'on-track' | 'behind' | 'exceeded';
}

export const platformsData: PlatformData[] = [
  {
    platform: 'instagram',
    name: 'Instagram',
    color: '#E4405F',
    followers: 45280,
    followerGrowth: 8.4,
    impressions: 892000,
    reach: 654000,
    posts: 28,
    engagements: 34500,
    engagementRate: 3.87,
    profileVisits: 12400,
    linkClicks: 3200,
    daysInactive: 0,
  },
  {
    platform: 'facebook',
    name: 'Facebook',
    color: '#1877F2',
    followers: 32100,
    followerGrowth: 4.2,
    impressions: 543000,
    reach: 421000,
    posts: 22,
    engagements: 18900,
    engagementRate: 2.91,
    profileVisits: 8700,
    linkClicks: 4100,
    daysInactive: 2,
  },
  {
    platform: 'twitter',
    name: 'X (Twitter)',
    color: '#000000',
    followers: 28400,
    followerGrowth: 6.1,
    impressions: 1240000,
    reach: 892000,
    posts: 45,
    engagements: 21300,
    engagementRate: 1.72,
    profileVisits: 15600,
    linkClicks: 2800,
    daysInactive: 0,
  },
  {
    platform: 'linkedin',
    name: 'LinkedIn',
    color: '#0A66C2',
    followers: 18700,
    followerGrowth: 12.3,
    impressions: 234000,
    reach: 187000,
    posts: 16,
    engagements: 8900,
    engagementRate: 4.76,
    profileVisits: 6200,
    linkClicks: 3400,
    daysInactive: 1,
  },
  {
    platform: 'tiktok',
    name: 'TikTok',
    color: '#000000',
    followers: 62300,
    followerGrowth: 15.7,
    impressions: 1560000,
    reach: 1120000,
    posts: 12,
    engagements: 87600,
    engagementRate: 7.82,
    profileVisits: 18900,
    linkClicks: 1200,
    daysInactive: 3,
  },
];

export const generateTimeSeriesData = (platform: string, days: number): TimeSeriesData[] => {
  const data: TimeSeriesData[] = [];
  const platformData = platformsData.find(p => p.platform === platform);
  
  if (!platformData) return [];
  
  const baseFollowers = platformData.followers - (platformData.followers * platformData.followerGrowth / 100);
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const progress = (days - i) / days;
    const followers = Math.round(baseFollowers + (platformData.followers - baseFollowers) * progress);
    const engagements = Math.round((platformData.engagements / days) * (1 + Math.random() * 0.5));
    const impressions = Math.round((platformData.impressions / days) * (1 + Math.random() * 0.3));
    const reach = Math.round((platformData.reach / days) * (1 + Math.random() * 0.4));
    
    data.push({
      date: date.toISOString().split('T')[0],
      followers,
      engagements,
      impressions,
      reach,
    });
  }
  
  return data;
};

export const topPosts: TopPost[] = [
  {
    id: '1',
    platform: 'instagram',
    content: 'New product launch! Check out our latest innovation 🚀',
    engagements: 4580,
    likes: 3920,
    comments: 428,
    shares: 232,
    date: '2026-01-05',
  },
  {
    id: '2',
    platform: 'tiktok',
    content: 'Behind the scenes of our creative process 🎨',
    engagements: 12300,
    likes: 10800,
    comments: 980,
    shares: 520,
    date: '2026-01-04',
  },
  {
    id: '3',
    platform: 'linkedin',
    content: 'Insights from our latest industry report',
    engagements: 1840,
    likes: 1520,
    comments: 246,
    shares: 74,
    date: '2026-01-03',
  },
  {
    id: '4',
    platform: 'twitter',
    content: 'Quick tips for boosting productivity in 2026',
    engagements: 2150,
    likes: 1890,
    comments: 178,
    shares: 82,
    date: '2026-01-02',
  },
  {
    id: '5',
    platform: 'facebook',
    content: 'Join us for our upcoming webinar on digital transformation',
    engagements: 1620,
    likes: 1340,
    comments: 198,
    shares: 82,
    date: '2026-01-01',
  },
];

export const goals: Goal[] = [
  {
    id: '1',
    platform: 'instagram',
    metric: 'Follower Growth',
    target: 5,
    current: 8.4,
    period: 'monthly',
    status: 'exceeded',
  },
  {
    id: '2',
    platform: 'instagram',
    metric: 'Engagement Rate',
    target: 4.0,
    current: 3.87,
    period: 'monthly',
    status: 'on-track',
  },
  {
    id: '3',
    platform: 'linkedin',
    metric: 'Follower Growth',
    target: 10,
    current: 12.3,
    period: 'monthly',
    status: 'exceeded',
  },
  {
    id: '4',
    platform: 'facebook',
    metric: 'Post Frequency',
    target: 25,
    current: 22,
    period: 'monthly',
    status: 'behind',
  },
  {
    id: '5',
    platform: 'tiktok',
    metric: 'Engagement Rate',
    target: 6.0,
    current: 7.82,
    period: 'monthly',
    status: 'exceeded',
  },
  {
    id: '6',
    platform: 'twitter',
    metric: 'Impressions',
    target: 1000000,
    current: 1240000,
    period: 'monthly',
    status: 'exceeded',
  },
];

export const aiInsights = [
  {
    platform: 'instagram',
    insights: [
      'Your engagement rate increased by 15% this week. Keep posting carousel content!',
      'Best posting times: 10 AM and 6 PM on weekdays',
      'Stories are performing 23% better than feed posts',
    ],
  },
  {
    platform: 'linkedin',
    insights: [
      'Industry report content drives 3x more engagement',
      'Tuesday and Thursday posts get 40% more visibility',
      'Your follower growth rate is accelerating - consistency is paying off',
    ],
  },
  {
    platform: 'tiktok',
    insights: [
      'Behind-the-scenes content is your top performer',
      'Average watch time increased by 32% this month',
      'Consider posting during 7-9 PM for maximum reach',
    ],
  },
];
