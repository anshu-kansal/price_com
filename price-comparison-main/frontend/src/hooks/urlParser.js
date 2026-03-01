/**
 * Utility for parsing product URLs from various e-commerce platforms
 */

export const urlParser = {
  /**
   * Extract product information from URL
   * @param {string} url - The product URL
   * @returns {Object|null} - Parsed product info or null if not recognized
   */
  parseUrl: (url) => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Amazon
      if (hostname.includes('amazon')) {
        return urlParser.parseAmazon(urlObj);
      }
      
      // Walmart
      if (hostname.includes('walmart')) {
        return urlParser.parseWalmart(urlObj);
      }
      
      // Best Buy
      if (hostname.includes('bestbuy')) {
        return urlParser.parseBestBuy(urlObj);
      }
      
      // Target
      if (hostname.includes('target')) {
        return urlParser.parseTarget(urlObj);
      }
      
      // eBay
      if (hostname.includes('ebay')) {
        return urlParser.parseEbay(urlObj);
      }
      
      return null;
    } catch (error) {
      console.error('Invalid URL:', error);
      return null;
    }
  },

  parseAmazon: (urlObj) => {
    // Amazon patterns: /dp/ASIN or /product/ASIN or /gp/product/ASIN
    const path = urlObj.pathname;
    const asinMatch = path.match(/\/(?:dp|product|gp\/product)\/([A-Z0-9]{10})/i);
    
    if (asinMatch) {
      return {
        store: 'Amazon',
        productId: asinMatch[1],
        platform: 'amazon',
        url: urlObj.href
      };
    }
    return null;
  },

  parseWalmart: (urlObj) => {
    // Walmart patterns: /ip/NAME/PRODUCT_ID or /ip/PRODUCT_ID
    const path = urlObj.pathname;
    const idMatch = path.match(/\/ip\/(?:[^\/]+\/)?(\d+)/);
    
    if (idMatch) {
      return {
        store: 'Walmart',
        productId: idMatch[1],
        platform: 'walmart',
        url: urlObj.href
      };
    }
    return null;
  },

  parseBestBuy: (urlObj) => {
    // Best Buy pattern: /site/NAME/PRODUCT_ID.p
    const path = urlObj.pathname;
    const idMatch = path.match(/\/(\d+)\.p/);
    
    if (idMatch) {
      return {
        store: 'Best Buy',
        productId: idMatch[1],
        platform: 'bestbuy',
        url: urlObj.href
      };
    }
    return null;
  },

  parseTarget: (urlObj) => {
    // Target pattern: /p/NAME/-A-PRODUCT_ID
    const path = urlObj.pathname;
    const idMatch = path.match(/-A-(\d+)/);
    
    if (idMatch) {
      return {
        store: 'Target',
        productId: idMatch[1],
        platform: 'target',
        url: urlObj.href
      };
    }
    return null;
  },

  parseEbay: (urlObj) => {
    // eBay pattern: /itm/NAME/PRODUCT_ID or /p/PRODUCT_ID
    const path = urlObj.pathname;
    const itmMatch = path.match(/\/itm\/(?:[^\/]+\/)?(\d+)/);
    const pMatch = path.match(/\/p\/(\d+)/);
    
    const idMatch = itmMatch || pMatch;
    if (idMatch) {
      return {
        store: 'eBay',
        productId: idMatch[1],
        platform: 'ebay',
        url: urlObj.href
      };
    }
    return null;
  },

  /**
   * Check if a string is a valid URL
   * @param {string} string - The string to check
   * @returns {boolean} - True if valid URL
   */
  isValidUrl: (string) => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get store name from URL
   * @param {string} url - The URL
   * @returns {string|null} - Store name or null
   */
  getStoreFromUrl: (url) => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      if (hostname.includes('amazon')) return 'Amazon';
      if (hostname.includes('walmart')) return 'Walmart';
      if (hostname.includes('bestbuy')) return 'Best Buy';
      if (hostname.includes('target')) return 'Target';
      if (hostname.includes('ebay')) return 'eBay';
      
      return null;
    } catch {
      return null;
    }
  }
};

export default urlParser;