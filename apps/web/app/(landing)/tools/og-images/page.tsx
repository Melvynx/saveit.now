import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import Link from "next/link";
import { OGImageTool } from "./og-image-tool";

export const metadata = {
  title: "Free OG Image & Twitter Card Extractor | Open Graph Meta Tags Tool",
  description: "Extract Open Graph images, Twitter cards, and social media meta tags from any URL. Free online tool to preview how your links appear on social media platforms.",
  keywords: "og image extractor, twitter card, open graph, meta tags, social media preview, facebook preview, linkedin preview, free SEO tool",
  openGraph: {
    title: "Free OG Image & Twitter Card Extractor Tool",
    description: "Extract and preview Open Graph images and Twitter cards from any URL instantly. Perfect for social media optimization and SEO.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free OG Image & Twitter Card Extractor Tool",
    description: "Extract Open Graph images and Twitter cards from any URL. Free online tool for social media optimization.",
  },
};

export default function OGImageToolPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section with H1 */}
      <section className="py-16 px-4 text-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Free OG Image & Twitter Card Extractor
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Extract Open Graph images, Twitter cards, and social media meta tags from any URL instantly. 
            Preview how your links will appear on Facebook, Twitter, LinkedIn, and other social platforms.
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              ✅ Free Forever
            </span>
            <span className="flex items-center gap-1">
              ✅ No Registration Required
            </span>
            <span className="flex items-center gap-1">
              ✅ Instant Results
            </span>
          </div>
        </div>
      </section>

      {/* Tool Section */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <OGImageTool />
        </div>
      </section>

      {/* SEO Content Section */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Everything You Need to Know About Open Graph Images
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                What are Open Graph Images?
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Open Graph images are the preview images that appear when you share a link on social media platforms like 
                Facebook, Twitter, LinkedIn, and WhatsApp. These meta tags were created by Facebook to standardize how 
                content appears when shared across social networks.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Why Are OG Images Important?
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                OG images significantly impact click-through rates and engagement on social media. Posts with compelling 
                images receive 2.3x more engagement than those without. They help create a professional appearance and 
                improve your content's visibility in social feeds.
              </p>
            </div>
          </div>

          <div className="prose prose-lg max-w-none dark:prose-invert">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              How to Use Our OG Image Extractor Tool
            </h3>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-8">
              <ol className="list-decimal list-inside space-y-3 text-gray-600 dark:text-gray-300">
                <li><strong>Enter the URL:</strong> Paste any website URL into the input field above</li>
                <li><strong>Click Extract:</strong> Our tool will fetch and analyze all meta tags from the webpage</li>
                <li><strong>View Results:</strong> See the Open Graph image, Twitter card, and all social media metadata</li>
                <li><strong>Preview Social Shares:</strong> Understand exactly how your link will appear on different platforms</li>
              </ol>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Supported Meta Tags and Social Platforms
            </h3>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Open Graph Tags</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• og:image</li>
                  <li>• og:title</li>
                  <li>• og:description</li>
                  <li>• og:type</li>
                  <li>• og:site_name</li>
                </ul>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Twitter Cards</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• twitter:image</li>
                  <li>• twitter:card</li>
                  <li>• twitter:title</li>
                  <li>• twitter:description</li>
                  <li>• twitter:site</li>
                </ul>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Platforms</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Facebook</li>
                  <li>• Twitter/X</li>
                  <li>• LinkedIn</li>
                  <li>• WhatsApp</li>
                  <li>• Slack</li>
                </ul>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Best Practices for Open Graph Images
            </h3>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8">
              <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                <li><strong>Optimal Size:</strong> Use 1200x630 pixels for the best compatibility across all platforms</li>
                <li><strong>File Format:</strong> PNG or JPG formats work best, keep file size under 8MB</li>
                <li><strong>Text Overlay:</strong> If using text, make it large and readable on mobile devices</li>
                <li><strong>Brand Consistency:</strong> Include your logo or brand colors for recognition</li>
                <li><strong>High Quality:</strong> Use high-resolution images that look good at different sizes</li>
                <li><strong>Avoid Small Text:</strong> Text smaller than 20px may not be readable in previews</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SaveIt.now Advertisement */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">
            Save and Organize Your Favorite Content with SaveIt.now
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Beyond extracting OG images, SaveIt.now helps you bookmark, organize, and rediscover web content. 
            Save articles, videos, tweets, and more with AI-powered tagging and search.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="font-semibold mb-2">🤖 AI-Powered</h3>
              <p className="text-sm text-blue-100">Automatic tagging and content analysis</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="font-semibold mb-2">🔍 Smart Search</h3>
              <p className="text-sm text-blue-100">Find any bookmark instantly with advanced search</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="font-semibold mb-2">📱 Browser Extension</h3>
              <p className="text-sm text-blue-100">Save content with one click from any website</p>
            </div>
          </div>
          <Link 
            href="/" 
            className="inline-block bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Try SaveIt.now Free →
          </Link>
        </div>
      </section>

      {/* Related Articles */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Related SEO and Social Media Articles
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <article className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  How to Optimize Open Graph Images for Social Media
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Learn the best practices for creating compelling OG images that drive engagement and clicks on social platforms.
                </p>
                <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">Read more →</span>
              </div>
            </article>
            
            <article className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Twitter Card Types and When to Use Them
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Understanding the different Twitter card types and how to choose the right one for your content.
                </p>
                <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">Read more →</span>
              </div>
            </article>
            
            <article className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Meta Tags That Actually Matter for SEO
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  A comprehensive guide to the most important meta tags for search engine optimization and social sharing.
                </p>
                <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">Read more →</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}