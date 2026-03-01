import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import "./Auth.css";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [termsError, setTermsError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [touchedFields, setTouchedFields] = useState({});
  
  const navigate = useNavigate();

  // Password strength checker
  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.match(/[a-z]+/)) strength += 25;
    if (password.match(/[A-Z]+/)) strength += 25;
    if (password.match(/[0-9]+/)) strength += 15;
    if (password.match(/[$@#&!]+/)) strength += 10;
    return strength;
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength < 25) return { text: "Weak", color: "#ff4444" };
    if (passwordStrength < 50) return { text: "Fair", color: "#ffa700" };
    if (passwordStrength < 75) return { text: "Good", color: "#ffdd00" };
    return { text: "Strong", color: "#00c851" };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }
    
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: "" });
    }
    setError("");
  };

  const handleBlur = (field) => {
    setTouchedFields({ ...touchedFields, [field]: true });
  };

  const handleCheckboxChange = (e) => {
    setAgreeToTerms(e.target.checked);
    if (termsError) {
      setTermsError("");
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setFieldErrors({});
    setTermsError("");
    setLoading(true);

    // Check if user agreed to terms
    if (!agreeToTerms) {
      setTermsError("You must agree to the Terms of Service and Privacy Policy");
      setLoading(false);
      return;
    }

    // Client-side validation
    const errors = {};

    if (!formData.username.trim()) {
      errors.username = "Username is required";
    } else if (formData.username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = "Username can only contain letters, numbers, and underscores";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (passwordStrength < 50) {
      errors.password = "Password is too weak. Include uppercase, lowercase, and numbers";
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const payload = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        password2: formData.confirmPassword,
        agreed_to_terms: agreeToTerms
      };

      console.log("🚀 Sending registration payload:", payload);
      
      const res = await API.post("register/", payload);
      console.log("✅ Registration successful:", res.data);
      
      setMessage(res.data.message || "Registration successful! Redirecting to login...");
      
      setFormData({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      setAgreeToTerms(false);
      setPasswordStrength(0);
      setTouchedFields({});
      
      setTimeout(() => {
        navigate("/login");
      }, 2000);
      
    } catch (err) {
      console.error("❌ Registration error:", err);
      
      if (err.response && err.response.data) {
        const data = err.response.data;
        const errorMessages = [];
        
        if (data.username) errorMessages.push(`Username: ${data.username}`);
        if (data.email) errorMessages.push(`Email: ${data.email}`);
        if (data.password) errorMessages.push(`Password: ${data.password}`);
        if (data.non_field_errors) errorMessages.push(data.non_field_errors);
        if (data.detail) errorMessages.push(data.detail);
        
        if (errorMessages.length > 0) {
          setError(errorMessages.join('. '));
        } else {
          setError(`Registration failed. Please try again.`);
        }
      } else if (err.request) {
        setError("Cannot connect to server. Please check your internet connection.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrengthLabel();

  return (
    <div className="register-container">
      {/* Left side - Branding/Info */}
      <div className="register-left">
        <div className="brand-content">
          <h1 className="brand-title">Price<span className="brand-highlight">Comparer</span></h1>
          <h2 className="brand-tagline">Smart Shopping, Better Savings</h2>
          <ul className="feature-list">
            <li className="feature-item">
              <svg className="feature-icon" viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span>Compare prices across 100+ stores</span>
            </li>
            <li className="feature-item">
              <svg className="feature-icon" viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span>Save your favorite products</span>
            </li>
            <li className="feature-item">
              <svg className="feature-icon" viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M21 6h-2v3h-2V6h-3V4h3V1h2v3h3v2zm-6-4v2h-2V2h2zm-4 0v2h-2V2h2zM9 2v2H7V2h2zM7 22h10v-2H7v2zm12-8v6H5v-6h14zm0-8h-2v3h-2V6h-3V4h3V1h2v3h3v2zM5 2h2v2H5V2zm0 4h2v2H5V6zm0 4h2v2H5v-2zm0 4h2v2H5v-2zm14-4h-2v2h2v-2zm0 4h-2v2h2v-2zM5 18h2v2H5v-2zm14 0h-2v2h2v-2z"/>
              </svg>
              <span>Get price drop alerts</span>
            </li>
            <li className="feature-item">
              <svg className="feature-icon" viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <span>AI-powered recommendations</span>
            </li>
          </ul>
          <div className="testimonial">
            <p>"Saved over $500 on my last shopping spree!"</p>
            <span>- Sarah K.</span>
          </div>
        </div>
      </div>

      {/* Right side - Registration Form */}
      <div className="register-right">
        <div className="register-form-container">
          <div className="form-header">
            <h2>Create your account</h2>
            <p>Join 50,000+ smart shoppers</p>
          </div>

          <form className="register-form" onSubmit={handleSubmit} noValidate>
            {/* Username Field */}
            <div className="form-field">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                <input
                  type="text"
                  id="username"
                  name="username"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={handleChange}
                  onBlur={() => handleBlur('username')}
                  disabled={loading}
                  className={fieldErrors.username ? "error" : (touchedFields.username && !fieldErrors.username && formData.username ? "valid" : "")}
                />
                {touchedFields.username && !fieldErrors.username && formData.username && (
                  <svg className="valid-icon" viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#00c851" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                )}
              </div>
              {fieldErrors.username && <span className="error-message">{fieldErrors.username}</span>}
              {!fieldErrors.username && touchedFields.username && formData.username && formData.username.length < 3 && (
                <span className="hint-message">Username must be at least 3 characters</span>
              )}
            </div>

            {/* Email Field */}
            <div className="form-field">
              <label htmlFor="email">Email address</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={() => handleBlur('email')}
                  disabled={loading}
                  className={fieldErrors.email ? "error" : (touchedFields.email && !fieldErrors.email && formData.email ? "valid" : "")}
                />
                {touchedFields.email && !fieldErrors.email && formData.email && validateEmail(formData.email) && (
                  <svg className="valid-icon" viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#00c851" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                )}
              </div>
              {fieldErrors.email && <span className="error-message">{fieldErrors.email}</span>}
            </div>

            {/* Password Field */}
            <div className="form-field">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => handleBlur('password')}
                  disabled={loading}
                  className={fieldErrors.password ? "error" : ""}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path fill="currentColor" d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  )}
                </button>
              </div>
              {formData.password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div 
                      className="strength-fill" 
                      style={{ 
                        width: `${passwordStrength}%`,
                        backgroundColor: strength.color 
                      }}
                    ></div>
                  </div>
                  <span className="strength-text" style={{ color: strength.color }}>
                    {strength.text}
                  </span>
                </div>
              )}
              {fieldErrors.password && <span className="error-message">{fieldErrors.password}</span>}
              {!fieldErrors.password && touchedFields.password && formData.password && passwordStrength < 100 && (
                <span className="hint-message">
                  Use at least 8 characters with uppercase, lowercase, and numbers
                </span>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="form-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={() => handleBlur('confirmPassword')}
                  disabled={loading}
                  className={fieldErrors.confirmPassword ? "error" : (touchedFields.confirmPassword && formData.confirmPassword && formData.password === formData.confirmPassword ? "valid" : "")}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={toggleConfirmPasswordVisibility}
                  tabIndex="-1"
                >
                  {showConfirmPassword ? (
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path fill="currentColor" d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && <span className="error-message">{fieldErrors.confirmPassword}</span>}
              {!fieldErrors.confirmPassword && touchedFields.confirmPassword && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <span className="error-message">Passwords do not match</span>
              )}
            </div>

            {/* Terms Checkbox */}
            <div className="terms-checkbox">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={handleCheckboxChange}
                  disabled={loading}
                />
                <span className="checkmark"></span>
                <span className="checkbox-text">
                  I agree to the <Link to="/terms" target="_blank">Terms of Service</Link> and{' '}
                  <Link to="/privacy" target="_blank">Privacy Policy</Link>
                </span>
              </label>
              {termsError && <span className="error-message">{termsError}</span>}
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className={`submit-btn ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>

            {/* Success/Error Messages */}
            {message && <div className="success-message">{message}</div>}
            {error && <div className="error-message global-error">{error}</div>}

            {/* HIGHLY VISIBLE Sign In Section */}
            <div className="signin-section">
              <div className="signin-badge">
                <span className="badge-text">ALREADY HAVE AN ACCOUNT?</span>
              </div>
              
              <Link to="/login" className="signin-button">
                <svg className="signin-icon" viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/>
                </svg>
                <span className="button-text">Sign In to Your Account</span>
                <svg className="arrow-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                </svg>
              </Link>
              
              <div className="signin-benefits">
                <div className="benefit-item">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="#00c851" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  <span>Access your watchlist</span>
                </div>
                <div className="benefit-item">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="#00c851" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  <span>View price history</span>
                </div>
                <div className="benefit-item">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="#00c851" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  <span>Get personalized alerts</span>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;