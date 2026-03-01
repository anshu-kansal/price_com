import React, { useEffect, useState } from 'react';
import api from '../services/api';

const SearchResults = ({ initialQuery = '' }) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Default load disabled temporarily to prevent unprompted API loops
  useEffect(() => {
    // Left empty for manual triggering only
  }, []);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    const query = e.target.elements.searchInput.value.trim();
    if (!query) return;

    setSearchQuery(query);
    setError(null);
    setProducts([]);
    setLoading(true);

    try {
      const response = await api.get(`/products/search/?q=${encodeURIComponent(query)}`);

      if (response.data && response.data.task_id) {
        const taskId = response.data.task_id;

        const interval = setInterval(async () => {
          try {
            const statusResponse = await api.get(`/tasks/status/${taskId}/`);
            const data = statusResponse.data;

            if (data.status === 'SUCCESS') {
              setProducts(data.result || []);
              setLoading(false);
              clearInterval(interval);
            } else if (data.status === 'FAILURE' || data.status === 'REVOKED') {
              setError('Extraction failed. The scraper might be blocked.');
              setLoading(false);
              clearInterval(interval);
            }
          } catch (pollErr) {
            console.error("Polling Error:", pollErr);
            setError('Connection lost during data retrieval.');
            setLoading(false);
            clearInterval(interval);
          }
        }, 2000);
      } else if (response.data && response.data.data) {
        setProducts(response.data.data);
        setLoading(false);
      }
    } catch (err) {
      console.error("Initiation failure", err);
      setError(err.response?.data?.error || err.message || "Backend cluster unreachable.");
      setLoading(false);
    }
  };

  return (
    <div className="search-results-container p-6 bg-slate-50 min-h-screen">
      <form onSubmit={handleSearchSubmit} className="mb-8 max-w-2xl mx-auto">
        <label htmlFor="searchInput" className="sr-only">Search</label>
        <div className="relative">
          <input
            type="text"
            id="searchInput"
            name="searchInput"
            defaultValue={searchQuery}
            className="w-full p-4 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            placeholder="Search Amazon and Flipkart natively..."
          />
          <button
            type="submit"
            className="text-white absolute right-2.5 bottom-2.5 bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-md text-sm px-5 py-2 transition-colors"
          >
            Track Price
          </button>
        </div>
      </form>

      {/* Loading State Spinner */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-600 font-medium tracking-wide">Scraping retail metrics...</span>
        </div>
      )}

      {/* Error Component */}
      {error && !loading && (
        <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 max-w-2xl mx-auto" role="alert">
          <span className="font-medium">Connection Error:</span> {error}
        </div>
      )}

      {/* No Products Indicator */}
      {!loading && !error && products?.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-gray-800">No prices found for "{searchQuery}"</h3>
          <p className="text-gray-500 mt-2">Adjust your search parameters or check spelling.</p>
        </div>
      )}

      {/* Results Grid mapped safely utilizing Optional Chaining safeguards Native to ES6 */}
      {!loading && !error && products?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products?.map((product, index) => (
            <div key={product.id || index} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              {product.image_url && (
                <img src={product.image_url} alt={product.name} className="w-full h-48 object-contain bg-gray-50 p-4" />
              )}
              <div className="p-5">
                <div className="uppercase tracking-wide text-xs text-indigo-500 font-semibold mb-1">{product.brand || "Generic"}</div>
                <h3 className="text-lg font-bold text-gray-900 line-clamp-2 leading-tight mb-2">{product.name}</h3>

                {/* Variant Pricing Loop */}
                <div className="mt-4 space-y-3">
                  {product.store_variants?.map((variant, vIdx) => (
                    <div key={vIdx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <span className="font-semibold text-gray-700">{variant.store_name}</span>
                      <span className="text-green-600 font-bold text-lg">₹{variant.current_price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;