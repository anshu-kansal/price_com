// import api from './api';

// export const productService = {
//   // Search by product name
//   searchProducts: async (query) => {
//     try {
//       const response = await api.get(`/api/products/search?q=${encodeURIComponent(query)}`);
//       return response.data;
//     } catch (error) {
//       console.error('Product search failed:', error);
//       throw error;
//     }
//   },

//   // Search by URL
//   searchByUrl: async (url) => {
//     try {
//       const response = await api.post('/api/products/search-by-url', { url });
//       return response.data;
//     } catch (error) {
//       console.error('URL search failed:', error);
//       throw error;
//     }
//   },

//   // Search by image
//   searchByImage: async (imageFile) => {
//     try {
//       const formData = new FormData();
//       formData.append('image', imageFile);
      
//       const response = await api.post('/api/products/search-by-image', formData, {
//         headers: {
//           'Content-Type': 'multipart/form-data',
//         },
//       });
//       return response.data;
//     } catch (error) {
//       console.error('Image search failed:', error);
//       throw error;
//     }
//   },

//   // Parse URL to extract product info
//   parseProductUrl: (url) => {
//     const patterns = {
//       amazon: /amazon\.com\/(?:[^\/]+\/)?(?:dp|product)\/([A-Z0-9]{10})/i,
//       walmart: /walmart\.com\/ip\/(?:[^\/]+\/)?(\d+)/i,
//       bestbuy: /bestbuy\.com\/site\/(?:[^\/]+\/)?(\d+)\.p/i,
//       target: /target\.com\/p\/(?:[^\/]+\/)?-A-(\d+)/i
//     };

//     for (const [store, pattern] of Object.entries(patterns)) {
//       const match = url.match(pattern);
//       if (match) {
//         return {
//           store,
//           productId: match[1],
//           fullUrl: url
//         };
//       }
//     }
//     return null;
//   }
// };