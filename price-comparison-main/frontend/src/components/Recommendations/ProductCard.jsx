import React from 'react';
import { useTheme } from '../../context/ThemeContext'; // Changed from ../../../context/ThemeContext
import { Star, ShoppingCart, Heart } from 'lucide-react';

const ProductCard = ({ product }) => {
  const { theme } = useTheme();

  if (!product) return null;

  // Theme-based classes
  const cardClasses = theme === 'dark'
    ? 'bg-gray-900 border-gray-800 hover:border-gray-700'
    : 'bg-white border-gray-200 hover:border-gray-300';

  const textPrimaryClasses = theme === 'dark'
    ? 'text-white'
    : 'text-gray-900';

  const textSecondaryClasses = theme === 'dark'
    ? 'text-gray-400'
    : 'text-gray-500';

  const storeClasses = theme === 'dark'
    ? 'text-gray-300 bg-gray-800'
    : 'text-gray-600 bg-gray-100';

  const buttonClasses = theme === 'dark'
    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
    : 'bg-indigo-600 hover:bg-indigo-700 text-white';

  const iconClasses = theme === 'dark'
    ? 'bg-gray-800'
    : 'bg-gray-100';

  // Get icon based on product icon type
  const getIcon = () => {
    switch(product.icon) {
      case 'headphones':
        return '🎧';
      case 'smartphone':
        return '📱';
      case 'video':
        return '🎥';
      default:
        return '📦';
    }
  };

  return (
    <div className={`rounded-lg border p-3 transition-all duration-300 hover:shadow-lg ${cardClasses}`}>
      <div className="relative mb-3">
        <div className={`w-full h-32 ${iconClasses} rounded-lg flex items-center justify-center text-4xl`}>
          {getIcon()}
        </div>
        <button className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors">
          <Heart className="w-4 h-4 text-gray-600" />
        </button>
        {product.badge && (
          <span className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
            {product.badge}
          </span>
        )}
        {product.tag && (
          <span className="absolute bottom-2 left-2 px-2 py-1 bg-indigo-600 text-white text-xs font-medium rounded-full">
            {product.tag}
          </span>
        )}
      </div>

      <h4 className={`font-medium text-sm mb-1 line-clamp-2 ${textPrimaryClasses}`}>
        {product.name}
      </h4>

      <div className="flex items-center gap-1 mb-2">
        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
        <span className={`text-xs ${textSecondaryClasses}`}>{product.rating}</span>
        <span className={`text-xs ${textSecondaryClasses}`}>({product.reviews})</span>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <span className={`text-lg font-bold ${textPrimaryClasses}`}>
            ${product.price}
          </span>
          {product.originalPrice && (
            <span className={`text-xs line-through ml-1 ${textSecondaryClasses}`}>
              ${product.originalPrice}
            </span>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${storeClasses}`}>
          {product.match}% Match
        </span>
      </div>

      <button className={`w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors ${buttonClasses}`}>
        <ShoppingCart className="w-3 h-3" />
        View Deal
      </button>
    </div>
  );
};

export default ProductCard;