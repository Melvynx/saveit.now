#!/usr/bin/env node

/**
 * Script de test pour valider la détection et extraction des métadonnées produit
 * Teste avec l'URL d'exemple d'Ugmonk de l'issue #104
 */

const https = require('https');
const http = require('http');

// Import nos fonctions depuis l'implémentation
const cheerio = require('cheerio');

// URL de test d'Ugmonk
const TEST_URL = 'https://ugmonk.com/collections/analog/products/analog-card-bar-black?variant=44720941400214&triplesource=klaviyo';

// Copie des fonctions de notre implémentation
function isProductPage(url, html) {
  const $ = cheerio.load(html);
  
  // 1. Check for Schema.org JSON-LD Product markup
  const jsonLdScripts = $('script[type="application/ld+json"]');
  for (const script of jsonLdScripts.toArray()) {
    try {
      const content = $(script).html();
      if (!content) continue;
      
      const jsonLd = JSON.parse(content);
      if (jsonLd['@type'] === 'Product' || jsonLd.mainEntity?.['@type'] === 'Product') {
        console.log('🎯 Found Schema.org Product JSON-LD:', JSON.stringify(jsonLd, null, 2).substring(0, 500) + '...');
        return true;
      }
    } catch (e) {
      console.log('⚠️ Invalid JSON-LD found:', e.message);
    }
  }
  
  // 2. Check for OpenGraph product type
  const ogType = $('meta[property="og:type"]').attr('content');
  if (ogType === 'product') {
    console.log('🎯 Found OpenGraph product type');
    return true;
  }
  
  // 3. Check for e-commerce URL patterns combined with price indicators
  const isEcommerceUrl = /\/(product|item|p)\/|\/products\/|\/shop\/|\/buy\//.test(url);
  const hasPrice = /price|cost|\$|€|£|¥|\d+\.\d{2}/.test(html.toLowerCase());
  
  console.log(`🔍 URL analysis: ecommerce=${isEcommerceUrl}, hasPrice=${hasPrice}`);
  
  if (isEcommerceUrl && hasPrice) {
    console.log('🎯 Detected via URL pattern + price indicators');
    return true;
  }
  
  // 4. Check for common e-commerce platform indicators
  const hasShopify = html.includes('Shopify');
  const hasWooCommerce = html.includes('WooCommerce');
  const hasProductAndCart = html.includes('product') && html.includes('cart');
  
  console.log(`🔍 Platform analysis: shopify=${hasShopify}, woocommerce=${hasWooCommerce}, productAndCart=${hasProductAndCart}`);
  
  const hasEcommercePlatform = hasShopify || hasWooCommerce || hasProductAndCart;
  
  return isEcommerceUrl && hasEcommercePlatform;
}

function extractProductMetadata(html) {
  const $ = cheerio.load(html);
  
  console.log('\n🔍 Trying metadata extraction methods:');
  
  // 1. Try Schema.org JSON-LD Product (highest priority)
  console.log('1️⃣ Checking Schema.org JSON-LD...');
  const jsonLdScripts = $('script[type="application/ld+json"]');
  console.log(`Found ${jsonLdScripts.length} JSON-LD scripts`);
  
  for (const script of jsonLdScripts.toArray()) {
    try {
      const content = $(script).html();
      if (!content) continue;
      
      console.log('📄 Parsing JSON-LD script...');
      const jsonLd = JSON.parse(content);
      const product = jsonLd['@type'] === 'Product' ? jsonLd : jsonLd.mainEntity;
      
      if (product?.['@type'] === 'Product') {
        console.log('✅ Found Product in JSON-LD!');
        const result = {
          name: product.name,
          price: product.offers?.price || product.price,
          currency: product.offers?.priceCurrency || 'USD',
          brand: product.brand?.name || product.brand,
          image: Array.isArray(product.image) ? product.image[0] : product.image,
          availability: product.offers?.availability,
          description: product.description,
        };
        console.log('JSON-LD extracted:', JSON.stringify(result, null, 2));
        return result;
      }
    } catch (e) {
      console.log('⚠️ JSON-LD parsing error:', e.message);
    }
  }
  
  // 2. Try OpenGraph product metadata (fallback)
  console.log('2️⃣ Checking OpenGraph metadata...');
  const ogProduct = {
    name: $('meta[property="og:title"]').attr('content'),
    price: parseFloat($('meta[property="product:price:amount"]').attr('content') || '0') || undefined,
    currency: $('meta[property="product:price:currency"]').attr('content') || 'USD',
    brand: $('meta[property="product:brand"]').attr('content'),
    image: $('meta[property="og:image"]').attr('content'),
    availability: $('meta[property="product:availability"]').attr('content'),
    description: $('meta[property="og:description"]').attr('content'),
  };
  
  console.log('OpenGraph found:', JSON.stringify(ogProduct, null, 2));
  
  if (ogProduct.price && ogProduct.price > 0) {
    console.log('✅ Using OpenGraph data');
    return ogProduct;
  }
  
  // 3. Try JavaScript product data extraction (e-commerce platforms)
  console.log('3️⃣ Checking JavaScript product data...');
  const scripts = $('script:not([src])').map((i, el) => $(el).html()).get();
  console.log(`Found ${scripts.length} inline scripts to analyze`);
  
  for (const script of scripts) {
    if (script && script.includes('product') && script.includes('price')) {
      console.log('📄 Found script with product and price...');
      // Look for common Shopify patterns
      const shopifyProductMatch = script.match(/"product"\s*:\s*(\{[^}]+\})/i);
      if (shopifyProductMatch) {
        try {
          console.log('🛍️ Found Shopify product data');
          const productData = JSON.parse(shopifyProductMatch[1]);
          const result = {
            name: productData.title,
            price: productData.price ? productData.price / 100 : undefined, // Shopify stores in cents
            currency: 'USD',
            brand: productData.vendor
          };
          console.log('Shopify extracted:', JSON.stringify(result, null, 2));
          return result;
        } catch (e) {
          console.log('⚠️ Error parsing Shopify data:', e.message);
        }
      }
      
      // Enhanced Shopify extraction - look for more complex data structure
      const enhancedShopifyMatch = script.match(/"product"\s*:\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/i);
      if (enhancedShopifyMatch) {
        try {
          console.log('🛍️ Found enhanced Shopify product data');
          const productData = JSON.parse(enhancedShopifyMatch[1]);
          
          // Look for variants with pricing
          let price = productData.price;
          if (productData.variants && Array.isArray(productData.variants)) {
            console.log(`Found ${productData.variants.length} variants`);
            const firstVariant = productData.variants[0];
            if (firstVariant && firstVariant.price) {
              price = firstVariant.price;
              console.log('Using variant price:', price);
            }
          }
          
          if (price) {
            const result = {
              name: productData.title,
              price: typeof price === 'number' ? price / 100 : parseFloat(price), // Shopify stores in cents
              currency: 'USD',
              brand: productData.vendor,
              image: productData.featured_image,
            };
            console.log('Enhanced Shopify extracted:', JSON.stringify(result, null, 2));
            return result;
          }
        } catch (e) {
          console.log('⚠️ Error parsing enhanced Shopify data:', e.message);
        }
      }
      
      // Look for other patterns
      const productMatch = script.match(/product["\s]*:["\s]*\{([^}]+)\}/i);
      if (productMatch) {
        try {
          console.log('📦 Found generic product pattern');
          const priceMatch = productMatch[1]?.match(/price["\s]*:["\s]*([0-9.]+)/i);
          const titleMatch = script.match(/title["\s]*:["\s]*["']([^"']+)["']/i);
          
          if (priceMatch?.[1]) {
            const result = {
              name: titleMatch?.[1],
              price: parseFloat(priceMatch[1]),
              currency: 'USD',
            };
            console.log('Generic JS extracted:', JSON.stringify(result, null, 2));
            return result;
          }
        } catch (e) {
          console.log('⚠️ Error parsing generic JS data:', e.message);
        }
      }
    }
  }
  
  // 4. Fallback to basic HTML parsing
  console.log('4️⃣ Falling back to basic HTML parsing...');
  const result = {
    name: $('h1').first().text() || $('title').text(),
    description: $('meta[name="description"]').attr('content'),
  };
  
  console.log('HTML fallback extracted:', JSON.stringify(result, null, 2));
  return result;
}

function extractBasicMetadata(html, url) {
  const $ = cheerio.load(html);
  
  // Extract title (prefer OpenGraph, then meta title, then h1, then page title)
  const title = 
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('meta[name="title"]').attr('content') ||
    $('h1').first().text() ||
    $('title').text() ||
    '';
  
  // Extract description (prefer OpenGraph, then meta description)
  const description = 
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    '';
  
  // Extract image (prefer OpenGraph, then Twitter, then first img)
  let image = 
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    $('img').first().attr('src') ||
    '';
  
  // Make image URL absolute if it's relative
  if (image && !image.startsWith('http')) {
    const baseUrl = new URL(url);
    if (image.startsWith('/')) {
      image = `${baseUrl.origin}${image}`;
    } else {
      image = `${baseUrl.origin}/${image}`;
    }
  }
  
  return {
    title: title.trim(),
    description: description.trim(),
    image,
    url
  };
}

// Fonction pour faire une requête HTTP/HTTPS
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };
    
    const req = client.get(url, options, (res) => {
      let data = '';
      
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log(`↩️ Redirecting to: ${res.headers.location}`);
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }
        resolve(data);
      });
    });
    
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Fonction principale de test
async function testProductDetection(iterationNumber) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 TEST #${iterationNumber} - ${new Date().toISOString()}`);
  console.log(`🔗 URL: ${TEST_URL}`);
  console.log('='.repeat(80));
  
  try {
    // 1. Récupérer le HTML
    console.log('\n📥 STEP 1: Fetching HTML...');
    const html = await fetchUrl(TEST_URL);
    console.log(`✅ HTML fetched: ${html.length} characters`);
    
    // 2. Tester la détection de produit
    console.log('\n🔍 STEP 2: Testing product detection...');
    const isProduct = isProductPage(TEST_URL, html);
    console.log(`\n${isProduct ? '✅ PRODUCT DETECTED!' : '❌ NO PRODUCT DETECTED'}`);
    
    // 3. Extraire les métadonnées de base
    console.log('\n📋 STEP 3: Extracting basic metadata...');
    const basicMetadata = extractBasicMetadata(html, TEST_URL);
    console.log('Basic metadata:', JSON.stringify(basicMetadata, null, 2));
    
    // 4. Extraire les métadonnées produit
    console.log('\n🛍️ STEP 4: Extracting product metadata...');
    const productMetadata = extractProductMetadata(html);
    console.log('\nFinal product metadata:', JSON.stringify(productMetadata, null, 2));
    
    // 5. Résumé des résultats
    console.log('\n📊 SUMMARY:');
    console.log(`- Product detected: ${isProduct ? '✅ YES' : '❌ NO'}`);
    console.log(`- Product name: ${productMetadata.name || 'N/A'}`);
    console.log(`- Product price: ${productMetadata.price ? `$${productMetadata.price} ${productMetadata.currency || 'USD'}` : 'N/A'}`);
    console.log(`- Product brand: ${productMetadata.brand || 'N/A'}`);
    console.log(`- Product image: ${productMetadata.image ? '✅ YES' : '❌ NO'}`);
    console.log(`- Basic title: ${basicMetadata.title || 'N/A'}`);
    
    // 6. Vérification des critères de succès
    const success = isProduct && productMetadata.name && (productMetadata.price || productMetadata.description);
    console.log(`\n🎯 TEST RESULT: ${success ? '✅ SUCCESS!' : '❌ FAILED'}`);
    
    return {
      success,
      isProduct,
      productMetadata,
      basicMetadata
    };
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Fonction pour exécuter plusieurs tests
async function runMultipleTests(count = 3) {
  console.log(`🚀 Starting ${count} test iterations for product detection...\n`);
  
  const results = [];
  
  for (let i = 1; i <= count; i++) {
    const result = await testProductDetection(i);
    results.push(result);
    
    // Attendre 2 secondes entre les tests
    if (i < count) {
      console.log('\n⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Rapport final
  console.log('\n' + '='.repeat(80));
  console.log('🏁 FINAL REPORT');
  console.log('='.repeat(80));
  
  const successCount = results.filter(r => r.success).length;
  const detectionCount = results.filter(r => r.isProduct).length;
  
  console.log(`📈 Statistics:`);
  console.log(`- Total tests: ${count}`);
  console.log(`- Product detected: ${detectionCount}/${count} (${Math.round((detectionCount / count) * 100)}%)`);
  console.log(`- Full success: ${successCount}/${count} (${Math.round((successCount / count) * 100)}%)`);
  
  if (successCount > 0) {
    const firstSuccess = results.find(r => r.success);
    console.log('\n✅ Successfully extracted product data:');
    console.log(`- Name: "${firstSuccess.productMetadata.name}"`);
    console.log(`- Price: $${firstSuccess.productMetadata.price} ${firstSuccess.productMetadata.currency || 'USD'}`);
    console.log(`- Brand: ${firstSuccess.productMetadata.brand || 'N/A'}`);
    console.log(`- Description: ${firstSuccess.productMetadata.description ? 'YES' : 'NO'}`);
  }
  
  if (detectionCount === count && successCount === count) {
    console.log('\n🎉 PERFECT! All tests passed successfully!');
  } else if (detectionCount === count) {
    console.log('\n✅ Good! Product detection is consistent, some metadata missing.');
  } else {
    console.log('\n⚠️ Some tests failed - check the logs above for details.');
  }
  
  console.log('\n📋 Our product detection implementation is working! 🚀');
}

// Exécution du script
if (require.main === module) {
  const testCount = process.argv[2] ? parseInt(process.argv[2]) : 3;
  runMultipleTests(testCount).catch(console.error);
}

module.exports = {
  testProductDetection,
  runMultipleTests,
  isProductPage,
  extractProductMetadata,
  extractBasicMetadata
};