"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Image from "next/image";

interface SocialCardsProps {
  url: string;
  openGraph: {
    title?: string;
    description?: string;
    siteName?: string;
    image?: {
      url?: string;
      alt?: string;
    };
  };
  twitter: {
    card?: string;
    title?: string;
    description?: string;
    site?: string;
    creator?: string;
    image?: {
      url?: string;
      alt?: string;
    };
  };
  page: {
    title?: string;
    description?: string;
  };
}

export function SocialCards({ url, openGraph, twitter, page }: SocialCardsProps) {
  const ogImageUrl = openGraph.image?.url;
  const twitterImageUrl = twitter.image?.url;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Facebook Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-600">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-background dark:bg-card rounded-lg shadow-sm border border-border max-w-md mx-auto">
            <div className="p-3 flex items-center space-x-2">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">U</span>
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">User Name</div>
                <div className="text-xs text-muted-foreground">2h • 🌍</div>
              </div>
            </div>
            
            <div className="px-3 pb-3">
              <p className="text-sm text-foreground">Check out this awesome website!</p>
            </div>
            
            <div className="border-t border-border">
              {ogImageUrl && (
                <div className="relative">
                  <Image
                    src={ogImageUrl}
                    alt="Facebook preview"
                    width={400}
                    height={210}
                    className="w-full h-52 object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div className="p-3 bg-muted/50">
                <div className="text-xs text-muted-foreground uppercase mb-1">
                  {openGraph.siteName || new URL(url).hostname}
                </div>
                <div className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                  {openGraph.title || page.title}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {openGraph.description || page.description}
                </div>
              </div>
            </div>
            
            <div className="p-3 border-t border-border">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center space-x-1 hover:text-blue-600 cursor-pointer transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span>Like</span>
                  </span>
                  <span className="flex items-center space-x-1 hover:text-blue-600 cursor-pointer transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>Comment</span>
                  </span>
                  <span className="flex items-center space-x-1 hover:text-blue-600 cursor-pointer transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    <span>Share</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Twitter/X Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            X (Twitter)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-background dark:bg-card rounded-2xl shadow-sm border border-border max-w-md mx-auto">
            <div className="p-4 flex items-start space-x-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">U</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-1">
                  <span className="font-bold text-sm text-foreground">User Name</span>
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                  </svg>
                  <span className="text-muted-foreground text-sm">@username</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground text-sm">2h</span>
                </div>
                
                <div className="mt-2">
                  <p className="text-sm text-foreground">Sharing this amazing website with you all! 🔥</p>
                </div>
                
                <div className="mt-3 border border-border rounded-2xl overflow-hidden">
                  {twitterImageUrl && (
                    <div className="relative">
                      <Image
                        src={twitterImageUrl}
                        alt="Twitter preview"
                        width={400}
                        height={200}
                        className="w-full h-48 object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">
                      {new URL(url).hostname}
                    </div>
                    <div className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                      {twitter.title || openGraph.title || page.title}
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {twitter.description || openGraph.description || page.description}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between text-muted-foreground max-w-md">
                  <div className="flex items-center space-x-1 hover:text-blue-500 cursor-pointer group transition-colors">
                    <div className="p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-950/20">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <span className="text-sm">12</span>
                  </div>
                  <div className="flex items-center space-x-1 hover:text-green-500 cursor-pointer group transition-colors">
                    <div className="p-2 rounded-full group-hover:bg-green-50 dark:group-hover:bg-green-950/20">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <span className="text-sm">8</span>
                  </div>
                  <div className="flex items-center space-x-1 hover:text-red-500 cursor-pointer group transition-colors">
                    <div className="p-2 rounded-full group-hover:bg-red-50 dark:group-hover:bg-red-950/20">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <span className="text-sm">24</span>
                  </div>
                  <div className="flex items-center space-x-1 hover:text-blue-500 cursor-pointer group transition-colors">
                    <div className="p-2 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-950/20">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}