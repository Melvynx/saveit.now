import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import Link from "next/link";

export const metadata = {
  title: "Free SEO Tools & Web Utilities | SaveIt.now Tools",
  description: "Collection of free SEO tools and web utilities including OG image extractor, meta tag analyzer, and social media preview tools. No registration required.",
  keywords: "free SEO tools, web utilities, og image extractor, meta tags, social media tools, website analysis",
};

export default function ToolsPage() {
  const tools = [
    {
      title: "OG Image & Twitter Card Extractor",
      description: "Extract Open Graph images, Twitter cards, and social media meta tags from any URL instantly.",
      href: "/tools/og-images",
      icon: "🖼️",
      features: ["Open Graph extraction", "Twitter card preview", "Social media optimization", "Meta tag analysis"],
      popular: true,
    },
    // Placeholder for future tools
    {
      title: "Meta Tag Analyzer",
      description: "Comprehensive analysis of all meta tags including SEO, social media, and technical tags.",
      href: "#",
      icon: "🏷️",
      features: ["SEO meta tags", "Social tags", "Technical analysis", "Recommendations"],
      comingSoon: true,
    },
    {
      title: "Favicon Extractor",
      description: "Extract and download favicons from any website in multiple sizes and formats.",
      href: "#",
      icon: "⭐",
      features: ["Multiple sizes", "Various formats", "Instant download", "Quality analysis"],
      comingSoon: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="py-16 px-4 text-center bg-gradient-to-br from-purple-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Free SEO Tools & Web Utilities
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Powerful, free tools to analyze, optimize, and enhance your web presence. 
            No registration required, instant results, completely free forever.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-2">
              ✅ <span>100% Free</span>
            </span>
            <span className="flex items-center gap-2">
              ✅ <span>No Sign-up</span>
            </span>
            <span className="flex items-center gap-2">
              ✅ <span>Privacy Focused</span>
            </span>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tools.map((tool, index) => (
              <div
                key={index}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border transition-all hover:shadow-md ${
                  tool.popular ? "border-blue-200 dark:border-blue-800" : "border-gray-200 dark:border-gray-700"
                }`}
              >
                {tool.popular && (
                  <div className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-t-lg text-center">
                    Most Popular
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="text-3xl">{tool.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {tool.title}
                      </h3>
                      {tool.comingSoon && (
                        <span className="inline-block bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs px-2 py-1 rounded-full mb-2">
                          Coming Soon
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                    {tool.description}
                  </p>
                  
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Features:</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {tool.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center gap-2">
                          <span className="text-green-500">•</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {tool.comingSoon ? (
                    <button
                      disabled
                      className="w-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 font-semibold py-3 px-6 rounded-lg cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  ) : (
                    <Link
                      href={tool.href}
                      className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors"
                    >
                      Use Tool →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Our Tools */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Why Choose Our Free SEO Tools?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Fast & Reliable</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get instant results with our optimized tools built for speed and accuracy.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Privacy First</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We don't store your data. All analysis happens in real-time without logging.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💎</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Always Free</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No hidden costs, no premium tiers. Full access to all features, forever.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-orange-100 dark:bg-orange-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">SEO Focused</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tools designed by SEO experts to solve real optimization challenges.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SaveIt.now Integration */}
      <section className="py-16 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">
            Save and Organize Your SEO Research
          </h2>
          <p className="text-xl mb-8 text-indigo-100">
            Use our tools to analyze websites and social media optimization, then save your findings 
            with SaveIt.now for easy reference and team collaboration.
          </p>
          <Link 
            href="/" 
            className="inline-block bg-white text-indigo-600 font-semibold px-8 py-3 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Try SaveIt.now Free →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}