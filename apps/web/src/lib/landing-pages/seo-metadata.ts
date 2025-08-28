import { Metadata } from 'next'
import { LandingPageConfig } from './landing-page-config'

export function generateLandingPageMetadata(
  config: LandingPageConfig,
  baseUrl: string = 'https://saveit.now'
): Metadata {
  const url = `${baseUrl}/${config.slug}`

  return {
    title: config.title,
    description: config.description,
    keywords: config.keywords,
    
    authors: [
      {
        name: 'SaveIt Team',
        url: 'https://saveit.now',
      },
    ],
    
    creator: 'SaveIt',
    publisher: 'SaveIt',
    
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url,
      title: config.title,
      description: config.description,
      siteName: 'SaveIt',
    },
    
    twitter: {
      card: 'summary_large_image',
      site: '@saveit_now',
      creator: '@melvynxdev',
      title: config.title,
      description: config.description,
    },
    
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    
    alternates: {
      canonical: url,
    },
    
    other: {
      'application-name': 'SaveIt',
      'apple-mobile-web-app-title': 'SaveIt',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
      'format-detection': 'telephone=no',
      'mobile-web-app-capable': 'yes',
      'msapplication-config': '/browserconfig.xml',
      'msapplication-TileColor': '#2B5797',
      'msapplication-tap-highlight': 'no',
      'theme-color': '#000000',
    },
  }
}

export function generateStructuredData(config: LandingPageConfig, baseUrl: string = 'https://saveit.now') {
  const url = `${baseUrl}/${config.slug}`
  
  // FAQ Structured Data
  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: config.faq.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
  
  // WebSite Structured Data
  const websiteStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SaveIt',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/app?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
  
  // Organization Structured Data
  const organizationStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SaveIt',
    url: baseUrl,
    logo: `${baseUrl}/images/logo.png`,
    sameAs: [
      'https://twitter.com/saveit_now',
      'https://github.com/melvynx/saveit.now',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      email: 'support@saveit.now',
    },
  }
  
  // WebPage Structured Data
  const webPageStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: config.title,
    description: config.description,
    url,
    inLanguage: 'en-US',
    isPartOf: {
      '@type': 'WebSite',
      name: 'SaveIt',
      url: baseUrl,
    },
    about: {
      '@type': 'Thing',
      name: config.hero.badge.replace(/[^\w\s]/g, ''),
      description: config.description,
    },
    mainEntity: {
      '@type': 'SoftwareApplication',
      name: 'SaveIt',
      description: config.description,
      applicationCategory: 'Productivity',
      operatingSystem: 'Web, iOS, Chrome Extension, Firefox Extension',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '1250',
        bestRating: '5',
        worstRating: '1',
      },
    },
  }
  
  return {
    faq: faqStructuredData,
    website: websiteStructuredData,
    organization: organizationStructuredData,
    webpage: webPageStructuredData,
  }
}