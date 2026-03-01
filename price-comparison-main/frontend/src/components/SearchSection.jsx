import React, { useState } from 'react';
import { API_BASE_URL } from '../api/config';
import useProducts from '../hooks/useProducts';

const SearchSection = () => {
    const [query, setQuery] = useState('');
    const { fetchProducts, loading, error, products } = useProducts();

    const handleTrackPrice = async (e) => {
        e.preventDefault();

        // Execution Requirement: Console log the exact query attempting
        console.log('Sending request for:', query);

        // Validation against blank queries preventing Null firing
        if (!query || query.trim() === '') {
            alert('Please enter a product name to track prices.');
            return;
        }

        try {
            // We utilize the custom hook to perform the absolute URL fetch natively
            await fetchProducts(query);
        } catch (err) {
            console.error(err);
            // Updating the UI with explicit fallback status when Python is natively missing
            alert('Backend Server Unreachable');
        }
    };

    return (
        <div className="search-section">
            <h2>Track Price Automatically</h2>
            <form onSubmit={handleTrackPrice} className="search-form">
                <input
                    type="text"
                    placeholder="e.g. iPhone 15"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="search-input"
                />
                <button type="submit" disabled={loading} className="track-button">
                    {loading ? 'Tracking...' : 'Track Price'}
                </button>
            </form>

            {/* Error Handlers strictly painting to the DOM */}
            {error && <div className="error-alert" style={{ color: 'red', marginTop: '10px' }}>{error}</div>}

            <div className="search-results-grid">
                {products?.map((product, idx) => (
                    <div key={idx} className="product-card">
                        <h3>{product.title || product.name}</h3>
                        <p>Price: {product.price}</p>
                        <p>Store: {product.store_name}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SearchSection;
