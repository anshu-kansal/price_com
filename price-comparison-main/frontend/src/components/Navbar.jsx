import { Link, useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { Search, Camera, Link as LinkIcon } from "lucide-react";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");
  const [searchInput, setSearchInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    // Check if it's a URL
    if (isValidUrl(searchInput)) {
      // Navigate to product page with URL param
      navigate(`/product?url=${encodeURIComponent(searchInput)}`);
    } else {
      // Regular product name search
      navigate(`/search?q=${encodeURIComponent(searchInput)}`);
    }
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    
    // Create form data
    const formData = new FormData();
    formData.append('image', file);

    try {
      // Upload image and search
      const response = await fetch('/api/search/by-image', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      // Navigate to search results with image data
      navigate('/search', { state: { imageResults: data, searchType: 'image' } });
    } catch (error) {
      console.error('Image search failed:', error);
    } finally {
      setIsUploading(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <nav className="navbar">
      <h3 className="logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
        PriceCompare
      </h3>

      {/* Search Bar - Add this */}
      <form className="search-container" onSubmit={handleSearch}>
        <div className="search-wrapper">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search products or paste URL..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="search-input"
          />
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Camera size={20} />
            {isUploading && <span className="uploading-spinner">↻</span>}
          </button>
          {searchInput && isValidUrl(searchInput) && (
            <span className="url-indicator" title="URL detected">
              <LinkIcon size={16} />
            </span>
          )}
        </div>
      </form>

      <div className="nav-links">
        {!username ? (
          <>
            <Link to="/register">Register</Link>
            <Link to="/login">Login</Link>
          </>
        ) : (
          <>
            <span className="welcome">Hi, {username}</span>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;