export interface LandingPageConfig {
  slug: string
  title: string
  description: string
  keywords: string[]
  
  hero: {
    badge: string
    headline: string
    subHeadline: string
    videoUrl: string
    features: Array<{
      emoji: string
      text: string
    }>
    trustIndicators: Array<{
      emoji: string
      text: string
    }>
  }
  
  keyFeatures: Array<{
    title: string
    description: string
    demoType: 'youtube' | 'twitter' | 'web' | 'pdf' | 'image'
    demoUrl?: string
  }>
  
  benefits: Array<{
    emoji: string
    title: string
    description: string
  }>
  
  useCases: Array<{
    title: string
    description: string
    steps: string[]
  }>
  
  faq: Array<{
    question: string
    answer: string
  }>
}

export const LANDING_PAGES_CONFIG: Record<string, LandingPageConfig> = {
  'twitter-bookmark': {
    slug: 'twitter-bookmark',
    title: 'Best Twitter Bookmark Tool - Save X Posts & Threads Forever',
    description: 'Never lose important Twitter posts again. SaveIt lets you bookmark Twitter threads, save X posts with one click, and find them instantly with AI-powered search.',
    keywords: [
      'twitter bookmark',
      'save twitter posts',
      'x bookmark tool',
      'twitter thread saver',
      'save x posts',
      'twitter bookmark manager',
      'x post saver',
      'twitter archive tool'
    ],
    
    hero: {
      badge: '🐦 Twitter Bookmarking Made Easy',
      headline: 'Never Lose Another Twitter Post',
      subHeadline: 'Save Twitter threads, X posts, and valuable content with one click. Find everything instantly with AI-powered search.',
      videoUrl: 'https://www.tella.tv/video/placeholder-twitter', // Will be updated later
      features: [
        { emoji: '⚡', text: 'One-click Twitter saves' },
        { emoji: '🧠', text: 'AI thread summaries' },
        { emoji: '🔍', text: 'Instant search & discovery' }
      ],
      trustIndicators: [
        { emoji: '✅', text: 'No credit card' },
        { emoji: '🛡️', text: '24/7 Support' },
        { emoji: '🆓', text: 'Free plan' }
      ]
    },
    
    keyFeatures: [
      {
        title: 'Save Twitter Threads',
        description: 'Preserve entire Twitter threads with full context and replies',
        demoType: 'twitter',
        demoUrl: 'https://twitter.com/example/status/123456789'
      },
      {
        title: 'Bookmark X Posts',
        description: 'Save individual X posts with images, videos, and links intact',
        demoType: 'twitter'
      },
      {
        title: 'AI-Powered Organization',
        description: 'Automatically categorize and summarize your saved Twitter content',
        demoType: 'web'
      }
    ],
    
    benefits: [
      {
        emoji: '📚',
        title: 'Build Your Knowledge Archive',
        description: 'Transform Twitter into your personal knowledge base with organized, searchable content'
      },
      {
        emoji: '⏰',
        title: 'Save Time Searching',
        description: 'Find that important tweet you saw months ago in seconds with AI-powered search'
      },
      {
        emoji: '🔗',
        title: 'Never Lose Context',
        description: 'Full thread preservation means you never lose the complete conversation'
      },
      {
        emoji: '📱',
        title: 'Works Everywhere',
        description: 'Save from desktop, mobile, or directly through our browser extension'
      },
      {
        emoji: '🧠',
        title: 'AI Summaries',
        description: 'Get instant summaries of long Twitter threads to save reading time'
      },
      {
        emoji: '🏷️',
        title: 'Smart Tagging',
        description: 'Automatically organize your Twitter saves with intelligent tags'
      }
    ],
    
    useCases: [
      {
        title: 'Research & Learning',
        description: 'Save educational Twitter threads and expert insights for later study',
        steps: [
          'Find valuable Twitter threads about your field',
          'Save them with one click using SaveIt',
          'Access organized knowledge whenever you need it'
        ]
      },
      {
        title: 'Content Inspiration',
        description: 'Build a library of inspiring tweets for content creation',
        steps: [
          'Bookmark tweets that inspire your content',
          'Use AI search to find relevant saved posts',
          'Create better content from your curated inspiration'
        ]
      },
      {
        title: 'Professional Networking',
        description: 'Save important conversations and insights from industry leaders',
        steps: [
          'Follow industry discussions on Twitter',
          'Save key insights and expert opinions',
          'Reference them in your work and conversations'
        ]
      }
    ],
    
    faq: [
      {
        question: 'Can I save private Twitter posts?',
        answer: 'SaveIt respects Twitter\'s privacy settings. You can only save public tweets that are visible to everyone.'
      },
      {
        question: 'Will my saved tweets be deleted if the original is removed?',
        answer: 'No! SaveIt creates a permanent copy, so your saved content remains accessible even if the original tweet is deleted.'
      },
      {
        question: 'Can I save entire Twitter threads?',
        answer: 'Yes! SaveIt automatically detects and saves complete Twitter threads, preserving the full conversation context.'
      },
      {
        question: 'How do I search through my saved Twitter content?',
        answer: 'Use our AI-powered search to find tweets by content, author, keywords, or even concepts - no need to remember exact phrases.'
      },
      {
        question: 'Is there a limit on how many tweets I can save?',
        answer: 'Free users can save up to 500 bookmarks. Pro users get unlimited saves plus advanced AI features.'
      }
    ]
  },

  'twitter-saveit-for-later': {
    slug: 'twitter-saveit-for-later',
    title: 'Save Twitter Posts for Later - X Bookmark Tool | SaveIt',
    description: 'Save Twitter posts and X content for later reading. Never lose important tweets again with SaveIt\'s powerful bookmark manager and AI search.',
    keywords: [
      'save twitter for later',
      'twitter save for later',
      'x save for later',
      'twitter read later',
      'save x posts later',
      'twitter bookmark later',
      'defer twitter reading'
    ],
    
    hero: {
      badge: '📖 Save for Later Reading',
      headline: 'Read Twitter When You Have Time',
      subHeadline: 'Save interesting Twitter posts and X content for focused reading later. Never lose valuable content in your timeline again.',
      videoUrl: 'https://www.tella.tv/video/placeholder-twitter-later',
      features: [
        { emoji: '📚', text: 'Read later queue' },
        { emoji: '🎯', text: 'Distraction-free reading' },
        { emoji: '🔄', text: 'Sync across devices' }
      ],
      trustIndicators: [
        { emoji: '✅', text: 'No credit card' },
        { emoji: '🛡️', text: '24/7 Support' },
        { emoji: '🆓', text: 'Free plan' }
      ]
    },
    
    keyFeatures: [
      {
        title: 'Quick Save for Later',
        description: 'One-click save any Twitter post to your reading queue',
        demoType: 'twitter'
      },
      {
        title: 'Distraction-Free Reading',
        description: 'Read saved content without Twitter\'s infinite scroll distractions',
        demoType: 'web'
      },
      {
        title: 'Smart Organization',
        description: 'AI automatically organizes your saved content by topics and themes',
        demoType: 'web'
      }
    ],
    
    benefits: [
      {
        emoji: '⏱️',
        title: 'Read on Your Schedule',
        description: 'Save interesting posts during busy moments and read them when you have dedicated time'
      },
      {
        emoji: '🎯',
        title: 'Focus Better',
        description: 'Read without Twitter\'s distractions - no ads, recommendations, or infinite scroll'
      },
      {
        emoji: '📱',
        title: 'Cross-Device Access',
        description: 'Save on mobile, read on desktop, or vice versa - everything syncs perfectly'
      },
      {
        emoji: '🧹',
        title: 'Declutter Your Mind',
        description: 'Stop worrying about losing interesting content - save it and read it later'
      },
      {
        emoji: '📊',
        title: 'Track Your Reading',
        description: 'See your reading progress and discover patterns in what interests you'
      },
      {
        emoji: '🔍',
        title: 'Find Old Saves',
        description: 'Powerful search helps you rediscover content you saved months ago'
      }
    ],
    
    useCases: [
      {
        title: 'Morning Twitter Triage',
        description: 'Quickly save interesting posts during your morning scroll for evening reading',
        steps: [
          'Scroll through Twitter during your commute',
          'Save interesting posts with one click',
          'Read them all during dedicated evening time'
        ]
      },
      {
        title: 'Professional Development',
        description: 'Save industry insights and expert advice for focused learning sessions',
        steps: [
          'Find valuable professional content on Twitter',
          'Save it to your professional reading queue',
          'Study it during your learning time blocks'
        ]
      },
      {
        title: 'Research Projects',
        description: 'Collect Twitter insights for research without getting distracted',
        steps: [
          'Quickly save relevant tweets while researching',
          'Continue your research flow without interruption',
          'Review all saved content in one focused session'
        ]
      }
    ],
    
    faq: [
      {
        question: 'How is this different from Twitter\'s native bookmarks?',
        answer: 'SaveIt provides better organization, search, AI summaries, and works across all devices. Plus, your saves are permanent even if tweets are deleted.'
      },
      {
        question: 'Can I organize my saved tweets by topics?',
        answer: 'Yes! SaveIt automatically suggests tags and categories, and you can create custom folders for different reading purposes.'
      },
      {
        question: 'What happens if I save too many tweets?',
        answer: 'SaveIt\'s AI helps prioritize your reading queue and can suggest which saved content is most relevant to your current interests.'
      },
      {
        question: 'Can I save tweets while offline?',
        answer: 'With our browser extension, you can save tweets for later even with poor connectivity - they\'ll sync when you\'re back online.'
      },
      {
        question: 'Is my reading progress tracked?',
        answer: 'Yes! You can see which saved tweets you\'ve read and track your reading habits to optimize your content consumption.'
      }
    ]
  },

  'youtube-bookmark': {
    slug: 'youtube-bookmark',
    title: 'YouTube Bookmark Tool - Save Videos with Timestamps | SaveIt',
    description: 'Save YouTube videos with specific timestamps, get AI summaries, and never lose educational content again. The best YouTube bookmark manager.',
    keywords: [
      'youtube bookmark',
      'save youtube videos',
      'youtube video saver',
      'youtube timestamp bookmark',
      'youtube bookmark manager',
      'save youtube with timestamp',
      'youtube video organizer'
    ],
    
    hero: {
      badge: '🎥 YouTube Video Bookmarking',
      headline: 'Never Lose Another YouTube Video',
      subHeadline: 'Save YouTube videos with timestamps, get AI summaries, and build your personal video knowledge library.',
      videoUrl: 'https://www.tella.tv/video/placeholder-youtube',
      features: [
        { emoji: '⏰', text: 'Timestamp bookmarks' },
        { emoji: '📝', text: 'AI video summaries' },
        { emoji: '🎯', text: 'Skip to key moments' }
      ],
      trustIndicators: [
        { emoji: '✅', text: 'No credit card' },
        { emoji: '🛡️', text: '24/7 Support' },
        { emoji: '🆓', text: 'Free plan' }
      ]
    },
    
    keyFeatures: [
      {
        title: 'Timestamp Bookmarking',
        description: 'Save specific moments in YouTube videos with precise timestamps',
        demoType: 'youtube',
        demoUrl: 'https://www.youtube.com/watch?v=example'
      },
      {
        title: 'AI Video Summaries',
        description: 'Get instant summaries of video content to save time',
        demoType: 'youtube'
      },
      {
        title: 'Smart Transcripts',
        description: 'Searchable transcripts with key insights highlighted',
        demoType: 'web'
      }
    ],
    
    benefits: [
      {
        emoji: '🎓',
        title: 'Learn More Efficiently',
        description: 'Save educational videos with key timestamps to review important concepts quickly'
      },
      {
        emoji: '⏱️',
        title: 'Save Time Rewatching',
        description: 'Jump directly to the most important parts without scrubbing through entire videos'
      },
      {
        emoji: '📚',
        title: 'Build Video Library',
        description: 'Create your personal collection of valuable video content organized by topics'
      },
      {
        emoji: '🔍',
        title: 'Search Video Content',
        description: 'Find specific information within your saved videos using transcript search'
      },
      {
        emoji: '📱',
        title: 'Access Anywhere',
        description: 'Your saved videos and timestamps sync across all your devices'
      },
      {
        emoji: '🧠',
        title: 'Remember Key Insights',
        description: 'AI summaries help you remember the most important points from each video'
      }
    ],
    
    useCases: [
      {
        title: 'Educational Content',
        description: 'Save tutorials, lectures, and educational videos for structured learning',
        steps: [
          'Find valuable educational YouTube content',
          'Save important timestamps and key concepts',
          'Review and study using AI summaries and bookmarks'
        ]
      },
      {
        title: 'Professional Development',
        description: 'Build a library of industry talks, tutorials, and skill-building videos',
        steps: [
          'Discover professional development videos',
          'Bookmark key insights and actionable advice',
          'Reference them when applying new skills'
        ]
      },
      {
        title: 'Research & Reference',
        description: 'Save videos for research projects with specific timestamp citations',
        steps: [
          'Find relevant video content for your research',
          'Save with precise timestamps for citations',
          'Access organized research material quickly'
        ]
      }
    ],
    
    faq: [
      {
        question: 'Can I save private YouTube videos?',
        answer: 'SaveIt can only save public YouTube videos. Private or unlisted videos require special access permissions.'
      },
      {
        question: 'What happens if a YouTube video gets deleted?',
        answer: 'SaveIt preserves video metadata and transcripts, so you retain the key information even if the original is removed.'
      },
      {
        question: 'Can I save specific timestamps in videos?',
        answer: 'Yes! SaveIt automatically detects current playback time and saves the exact timestamp for quick reference.'
      },
      {
        question: 'Does SaveIt work with YouTube playlists?',
        answer: 'You can save individual videos from playlists, and SaveIt will organize them intelligently based on content themes.'
      },
      {
        question: 'Can I get summaries of long videos?',
        answer: 'Yes! Our AI analyzes video transcripts to provide concise summaries highlighting the most important points.'
      }
    ]
  },

  'youtube-save-for-later': {
    slug: 'youtube-save-for-later',
    title: 'Save YouTube Videos for Later - Video Bookmark Manager',
    description: 'Save YouTube videos to watch later with smart organization. Never lose track of videos you want to watch with SaveIt\'s video bookmark manager.',
    keywords: [
      'save youtube for later',
      'youtube watch later',
      'youtube save later',
      'video bookmark manager',
      'youtube video queue',
      'save videos later',
      'youtube reading list'
    ],
    
    hero: {
      badge: '📺 Watch Later Made Smart',
      headline: 'Build Your Perfect YouTube Queue',
      subHeadline: 'Save YouTube videos for later with smart organization, AI summaries, and progress tracking.',
      videoUrl: 'https://www.tella.tv/video/placeholder-youtube-later',
      features: [
        { emoji: '📺', text: 'Smart watch queue' },
        { emoji: '📊', text: 'Progress tracking' },
        { emoji: '🎯', text: 'Priority sorting' }
      ],
      trustIndicators: [
        { emoji: '✅', text: 'No credit card' },
        { emoji: '🛡️', text: '24/7 Support' },
        { emoji: '🆓', text: 'Free plan' }
      ]
    },
    
    keyFeatures: [
      {
        title: 'Smart Watch Queue',
        description: 'Organize videos by priority, topic, or estimated watch time',
        demoType: 'youtube'
      },
      {
        title: 'Progress Tracking',
        description: 'Track what you\'ve watched and continue where you left off',
        demoType: 'web'
      },
      {
        title: 'Time Management',
        description: 'See total watch time and plan your viewing sessions effectively',
        demoType: 'web'
      }
    ],
    
    benefits: [
      {
        emoji: '📋',
        title: 'Organized Viewing',
        description: 'No more endless scrolling - your saved videos are organized and ready to watch'
      },
      {
        emoji: '⏰',
        title: 'Time-Aware Planning',
        description: 'See video lengths and plan your viewing time more effectively'
      },
      {
        emoji: '🎯',
        title: 'Priority Management',
        description: 'Mark videos as high priority and watch the most important content first'
      },
      {
        emoji: '📊',
        title: 'Progress Insights',
        description: 'Track your viewing habits and discover your content preferences'
      },
      {
        emoji: '🔄',
        title: 'Resume Anywhere',
        description: 'Continue watching from where you left off across all your devices'
      },
      {
        emoji: '🧹',
        title: 'Clutter-Free Experience',
        description: 'Keep your YouTube homepage clean while building your personal watch queue'
      }
    ],
    
    useCases: [
      {
        title: 'Learning Schedule',
        description: 'Plan your educational YouTube viewing with organized learning queues',
        steps: [
          'Save educational videos throughout the week',
          'Organize them by subject and priority',
          'Dedicate focused time for learning sessions'
        ]
      },
      {
        title: 'Entertainment Planning',
        description: 'Build queues of entertainment content for specific moods or occasions',
        steps: [
          'Save entertaining videos during busy periods',
          'Create mood-based playlists (relaxing, funny, inspiring)',
          'Enjoy curated content during your free time'
        ]
      },
      {
        title: 'Research Projects',
        description: 'Organize video research material for projects and presentations',
        steps: [
          'Save relevant videos while researching topics',
          'Group them by project or theme',
          'Review systematically for comprehensive understanding'
        ]
      }
    ],
    
    faq: [
      {
        question: 'How is this different from YouTube\'s Watch Later playlist?',
        answer: 'SaveIt offers better organization, AI summaries, progress tracking, time management, and cross-device sync that YouTube\'s basic Watch Later lacks.'
      },
      {
        question: 'Can I organize my saved videos by categories?',
        answer: 'Yes! Create custom categories, use AI-suggested tags, and organize videos by topic, priority, or any system that works for you.'
      },
      {
        question: 'Will I get reminded about videos I saved?',
        answer: 'SaveIt can send gentle reminders about your watch queue and suggest optimal viewing times based on video length and your schedule.'
      },
      {
        question: 'Can I save videos from YouTube mobile app?',
        answer: 'Yes! Use the share button to save videos to SaveIt, or use our browser extension when watching on mobile browsers.'
      },
      {
        question: 'Does SaveIt track my viewing progress?',
        answer: 'Yes! SaveIt remembers where you stopped watching and lets you continue from that point, plus tracks your overall viewing habits.'
      }
    ]
  },

  'save-image': {
    slug: 'save-image',
    title: 'Save Images for Later - Visual Bookmark Manager | SaveIt',
    description: 'Save images, photos, and visual content with smart organization. Build your visual inspiration library with AI-powered tagging and search.',
    keywords: [
      'save images later',
      'image bookmark manager',
      'save photos online',
      'visual bookmark tool',
      'image collection manager',
      'save pictures later',
      'photo organization tool'
    ],
    
    hero: {
      badge: '🖼️ Visual Content Made Simple',
      headline: 'Never Lose Inspiring Images Again',
      subHeadline: 'Save images, photos, and visual content with AI-powered organization. Build your perfect visual inspiration library.',
      videoUrl: 'https://www.tella.tv/video/placeholder-images',
      features: [
        { emoji: '🖼️', text: 'Image recognition & tagging' },
        { emoji: '🎨', text: 'Visual similarity search' },
        { emoji: '📁', text: 'Smart collections' }
      ],
      trustIndicators: [
        { emoji: '✅', text: 'No credit card' },
        { emoji: '🛡️', text: '24/7 Support' },
        { emoji: '🆓', text: 'Free plan' }
      ]
    },
    
    keyFeatures: [
      {
        title: 'AI Image Analysis',
        description: 'Automatically tag and categorize images based on visual content',
        demoType: 'image'
      },
      {
        title: 'Visual Similarity Search',
        description: 'Find similar images in your collection using visual search',
        demoType: 'web'
      },
      {
        title: 'Smart Collections',
        description: 'Organize images into intelligent collections based on content and themes',
        demoType: 'web'
      }
    ],
    
    benefits: [
      {
        emoji: '🎨',
        title: 'Visual Inspiration Hub',
        description: 'Build a centralized library of visual inspiration for all your creative projects'
      },
      {
        emoji: '🔍',
        title: 'Smart Image Discovery',
        description: 'Find exactly the image you need using AI-powered visual and content search'
      },
      {
        emoji: '📱',
        title: 'Save from Anywhere',
        description: 'Save images from any website, social platform, or mobile app with one click'
      },
      {
        emoji: '🏷️',
        title: 'Intelligent Organization',
        description: 'AI automatically tags images with relevant keywords, colors, and themes'
      },
      {
        emoji: '🎯',
        title: 'Context Preservation',
        description: 'Save images with their source context, so you remember where you found them'
      },
      {
        emoji: '🔄',
        title: 'Cross-Platform Access',
        description: 'Access your visual library from any device, anywhere you need inspiration'
      }
    ],
    
    useCases: [
      {
        title: 'Design Inspiration',
        description: 'Build mood boards and collect visual inspiration for design projects',
        steps: [
          'Save inspiring images from across the web',
          'Let AI organize them by style and theme',
          'Create project-specific visual mood boards'
        ]
      },
      {
        title: 'Research & Reference',
        description: 'Collect visual references for academic or professional research',
        steps: [
          'Save relevant images during research',
          'Organize by topic with source preservation',
          'Reference them in presentations and reports'
        ]
      },
      {
        title: 'Personal Memory Bank',
        description: 'Save meaningful images and photos for personal reflection',
        steps: [
          'Save images that resonate with you',
          'Build collections around interests and memories',
          'Rediscover forgotten inspiration over time'
        ]
      }
    ],
    
    faq: [
      {
        question: 'Can I save images from social media platforms?',
        answer: 'Yes! SaveIt works with most social platforms including Instagram, Pinterest, Twitter, and more - respecting copyright and usage rights.'
      },
      {
        question: 'Does SaveIt compress my saved images?',
        answer: 'SaveIt preserves image quality while optimizing storage. You can choose to save full resolution or optimized versions based on your needs.'
      },
      {
        question: 'Can I search for images by color or style?',
        answer: 'Yes! Our AI analyzes images for colors, styles, composition, and content, making it easy to find images matching specific visual criteria.'
      },
      {
        question: 'Is source attribution preserved when I save images?',
        answer: 'Absolutely! SaveIt automatically saves the source URL and context, helping you properly attribute images and remember where you found them.'
      },
      {
        question: 'Can I organize images into custom folders?',
        answer: 'Yes! Create custom collections, use AI-suggested categories, or organize images any way that works for your workflow.'
      }
    ]
  }
}