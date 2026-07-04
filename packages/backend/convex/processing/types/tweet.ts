export type TweetMetadata = {
  tweetId?: string;
  user?: {
    name: string;
    screen_name: string;
    profile_image_url_https: string;
  };
  mediaDetails?: Array<{
    media_url_https: string;
    type: string;
  }>;
  [key: string]: unknown;
};
