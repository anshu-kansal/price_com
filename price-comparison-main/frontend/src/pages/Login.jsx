import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import "./Auth.css";

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStep, setResetStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };

  const toggleConfirmNewPasswordVisibility = () => {
    setShowConfirmNewPassword(!showConfirmNewPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await API.post("login/", formData);
      
      console.log("Login response:", res.data);
      
      // Prepare comprehensive user data for AuthContext
      const userData = {
        username: res.data.username,
        name: res.data.full_name || res.data.username,
        email: res.data.email || '',
        is_admin: res.data.is_admin,
        role: res.data.role,
        user_id: res.data.user_id,
        plan: res.data.plan || 'Free Plan',
        avatar: res.data.avatar || null,
        profilePhoto: res.data.avatar || 'https://via.placeholder.com/150',
        bio: res.data.bio || '',
        dateOfBirth: res.data.date_of_birth || '',
        gender: res.data.gender || 'prefer-not-to-say',
        customGender: res.data.custom_gender || '',
        phone: {
          primary: {
            number: res.data.phone_number || '',
            countryCode: res.data.phone_country_code || '+1'
          },
          secondary: res.data.secondary_phones || []
        },
        website: res.data.website || '',
        location: {
          city: res.data.city || '',
          country: res.data.country || '',
          timezone: res.data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        language: res.data.language || 'en',
        preferences: {
          email: {
            primary: res.data.email || '',
            secondary: res.data.secondary_emails || []
          },
          language: res.data.language || 'en'
        }
      };
      
      // Store in AuthContext
      authLogin(userData);
      
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.error || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const googleLogin = useGoogleLogin({
    clientId: '456375997142-16vs1sp1hfate2apnps3v10jjluj370p.apps.googleusercontent.com',
    onSuccess: async (tokenResponse) => {
      console.log("✅ Google OAuth Success");
      
      setLoading(true);
      setError("");
      
      try {
        // Get user info from Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });
        
        const googleUserInfo = await userInfoResponse.json();
        console.log("✅ Google user info received:", googleUserInfo);
        
        // Send to backend
        const backendResponse = await API.post('google-login/', {
          email: googleUserInfo.email,
          name: googleUserInfo.name,
          given_name: googleUserInfo.given_name,
          family_name: googleUserInfo.family_name,
          picture: googleUserInfo.picture,
          sub: googleUserInfo.sub
        });

        console.log("✅ Backend response:", backendResponse.data);

        // Prepare comprehensive user data
        const userData = {
          username: backendResponse.data.username || googleUserInfo.email.split('@')[0],
          name: googleUserInfo.name,
          email: googleUserInfo.email,
          is_admin: backendResponse.data.is_admin || false,
          role: backendResponse.data.role || 'user',
          user_id: backendResponse.data.user_id,
          plan: backendResponse.data.plan || 'Pro Plan',
          avatar: googleUserInfo.picture,
          profilePhoto: googleUserInfo.picture,
          bio: backendResponse.data.bio || '',
          dateOfBirth: backendResponse.data.date_of_birth || '',
          gender: backendResponse.data.gender || 'prefer-not-to-say',
          customGender: backendResponse.data.custom_gender || '',
          phone: {
            primary: {
              number: backendResponse.data.phone_number || '',
              countryCode: backendResponse.data.phone_country_code || '+1'
            },
            secondary: backendResponse.data.secondary_phones || []
          },
          website: backendResponse.data.website || '',
          location: {
            city: backendResponse.data.city || '',
            country: backendResponse.data.country || '',
            timezone: backendResponse.data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          language: backendResponse.data.language || 'en',
          preferences: {
            email: {
              primary: googleUserInfo.email,
              secondary: backendResponse.data.secondary_emails || []
            },
            language: backendResponse.data.language || 'en'
          }
        };

        // Store in AuthContext
        authLogin(userData);
        
        navigate("/dashboard");
      } catch (err) {
        console.error('❌ Google login error:', err);
        setError(err.response?.data?.error || "Google login failed");
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.error('❌ Google OAuth error:', error);
      setError(`Google login failed: ${error.error_description || error.error || "Please try again"}`);
      setLoading(false);
    },
    flow: 'implicit',
  });

  // Forgot Password Handlers (keep existing code)
  const handleForgotPasswordClick = () => {
    setShowForgotPassword(true);
    setResetStep(1);
    setResetEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmNewPassword("");
    setResetMessage("");
    setResetError("");
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setResetStep(1);
    setResetEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetMessage("");
    setResetLoading(true);

    try {
        const email = resetEmail.trim();
        const res = await API.post('password-reset/send-otp/', { email });
        
        if (res.data.success) {
            setResetMessage(res.data.message || "OTP sent to your email.");
            setResetStep(2);
        } else {
            setResetError(res.data.error || "Failed to send OTP");
        }
    } catch (err) {
        console.error("❌ OTP send error:", err);
        setResetError(err.response?.data?.error || "Failed to send OTP");
    } finally {
        setResetLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetMessage("");
    setResetLoading(true);

    try {
      const res = await API.post('verify-otp/', { 
        email: resetEmail, 
        otp: otp 
      });
      setResetMessage("OTP verified successfully.");
      setResetStep(3);
    } catch (err) {
      console.error("OTP verification error:", err);
      setResetError(err.response?.data?.error || "Invalid OTP");
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetMessage("");

    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setResetError("Passwords do not match");
      return;
    }

    setResetLoading(true);

    try {
      const res = await API.post('reset-password/', { 
        email: resetEmail, 
        new_password: newPassword 
      });
      setResetMessage("Password reset successfully!");
      
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetStep(1);
      }, 3000);
    } catch (err) {
      console.error("Password reset error:", err);
      setResetError(err.response?.data?.error || "Failed to reset password");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{
      backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url("https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1887&q=80")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
      {/* Rest of your JSX remains the same */}
      {!showForgotPassword ? (
        // Login Form (keep existing JSX)
        <form className="auth-box" onSubmit={handleSubmit}>
          <h2>Login</h2>

          <>
            <input 
              type="text" 
              name="username" 
              placeholder="Username" 
              required 
              onChange={handleChange} 
              value={formData.username}
              disabled={loading}
            />
            
            <div className="password-input-group">
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  required
                  onChange={handleChange}
                  value={formData.password}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={togglePasswordVisibility}
                  disabled={loading}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="forgot-password-link">
              <button 
                type="button" 
                className="forgot-password-btn"
                onClick={handleForgotPasswordClick}
                disabled={loading}
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
            
            <div className="divider">
              <span>OR</span>
            </div>
            
            <button 
              type="button" 
              className="google-login-btn"
              onClick={() => googleLogin()}
              disabled={loading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" style={{marginRight: '10px'}}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Login with Google
            </button>
          </>

          {error && <p className="error">{error}</p>}

          <p className="switch">
            New user? <Link to="/register">Register</Link>
          </p>
        </form>
      ) : (
        // Forgot Password Form (keep existing JSX)
        <div className="auth-box">
          <h2>Reset Password</h2>
          
          <div className="back-to-login">
            <button 
              type="button" 
              className="back-to-login-btn"
              onClick={handleBackToLogin}
              disabled={resetLoading}
            >
              ← Back to Login
            </button>
          </div>

          {resetStep === 1 && (
            <form onSubmit={handleSendOTP}>
              <div className="form-group">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  disabled={resetLoading}
                />
              </div>

              {resetError && <p className="error">{resetError}</p>}
              {resetMessage && <p className="success">{resetMessage}</p>}

              <button type="submit" disabled={resetLoading}>
                {resetLoading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          )}

          {resetStep === 2 && (
            <form onSubmit={handleVerifyOTP}>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  disabled={resetLoading}
                  maxLength="6"
                />
              </div>

              {resetError && <p className="error">{resetError}</p>}
              {resetMessage && <p className="success">{resetMessage}</p>}

              <button type="submit" disabled={resetLoading}>
                {resetLoading ? "Verifying..." : "Verify OTP"}
              </button>

              <div className="resend-otp">
                <button 
                  type="button" 
                  className="resend-otp-btn"
                  onClick={handleSendOTP}
                  disabled={resetLoading}
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}

          {resetStep === 3 && (
            <form onSubmit={handleResetPassword}>
              <div className="form-group password-input-group">
                <div className="password-wrapper">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={resetLoading}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={toggleNewPasswordVisibility}
                    disabled={resetLoading}
                  >
                    {showNewPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="form-group password-input-group">
                <div className="password-wrapper">
                  <input
                    type={showConfirmNewPassword ? "text" : "password"}
                    placeholder="Confirm New Password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    disabled={resetLoading}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={toggleConfirmNewPasswordVisibility}
                    disabled={resetLoading}
                  >
                    {showConfirmNewPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {resetError && <p className="error">{resetError}</p>}
              {resetMessage && <p className="success">{resetMessage}</p>}

              <button type="submit" disabled={resetLoading}>
                {resetLoading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default Login;