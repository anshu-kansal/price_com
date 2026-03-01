import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles } from 'lucide-react';
import ProductCard from './ProductCard'; // Make sure this import is correct
import api from '../../services/api';

const RecommendationsSection = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Theme-based classes
  const sectionClasses = theme === 'dark'
    ? 'lg:col-span-7 bg-black border-gray-900'
    : 'lg:col-span-7 bg-white border-gray-200';

  const textPrimaryClasses = theme === 'dark'
    ? 'text-white'
    : 'text-gray-900';

  const textSecondaryClasses = theme === 'dark'
    ? 'text-gray-400'
    : 'text-gray-500';

  const linkClasses = theme === 'dark'
    ? 'text-indigo-400 hover:text-indigo-300'
    : 'text-indigo-600 hover:text-indigo-700';

  const [recommendations, setRecommendations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        // Fetch recommendations from the backend (only data from last 24h)
        const response = await api.get('/products/recommendations/');
        setRecommendations(response.data.data || []);
      } catch (err) {
        console.error("Failed to fetch dynamically generated recommendations.", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, []);

  const handleViewAll = () => {
    navigate('/recommendations');
  };

  return (
    <div className={`rounded-xl p-6 border shadow-xl transition-colors ${sectionClasses}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={`font-semibold flex items-center gap-2 ${textPrimaryClasses}`}>
            Recommended for You
            <Sparkles className="w-4 h-4 text-yellow-500" />
          </h3>
          <p className={`text-sm ${textSecondaryClasses}`}>
            Based on your recent search for "Noise Cancelling Headphones"
          </p>
        </div>
        <button
          onClick={handleViewAll}
          className={`flex items-center gap-1 text-sm font-medium ${linkClasses}`}
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <p className={textSecondaryClasses}>Loading customized recommendations...</p>
        ) : recommendations.length === 0 ? (
          <p className={textSecondaryClasses}>No recent price drops found in the last 24 hours.</p>
        ) : (
          recommendations.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        )}
      </div>
    </div>
  );
};

export default RecommendationsSection;