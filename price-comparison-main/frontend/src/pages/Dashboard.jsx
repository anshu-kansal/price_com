import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Mail, LogIn, Settings, TrendingUp, AlertCircle, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

import AIShopperCard from "../components/AIShopper/AIShopperCard";
import RecommendationsSection from "../components/Recommendations/RecommendationsSection";
import ProfileImage from "../components/Upload/ProfileImage";

// Utility formatting specific to Indian Rupees / USD
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const Dashboard = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/dashboard/summary/');
        if (response.data.status === 'no_data') {
          setDashboardData(null);
        } else {
          setDashboardData(response.data);
        }
      } catch (err) {
        setError('Failed to fetch realtime analytics.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchDashboard();
    }
  }, [user]);

  const container = theme === "dark" ? "bg-[#0A0A0A]" : "bg-gray-50";
  const card = theme === "dark" ? "bg-black border-gray-900" : "bg-white border-gray-200";
  const text = theme === "dark" ? "text-white" : "text-gray-900";
  const subText = theme === "dark" ? "text-gray-400" : "text-gray-500";

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className={`p-8 space-y-8 min-h-screen ${container}`}>
      {user ? (
        <>
          {/* PROFILE */}
          <div className={`rounded-xl p-6 border shadow-xl ${card}`}>
            <div className="flex justify-between items-center">
              <div className="flex gap-4 items-center">
                <ProfileImage user={user} editable />
                <div>
                  <h1 className={`text-2xl font-bold ${text}`}>
                    {greeting()}, {user.name} 👋
                  </h1>
                  <div className={`flex gap-2 mt-2 ${subText}`}>
                    <Mail size={16} />
                    {user.email}
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate("/settings")}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
              >
                <Settings />
              </button>
            </div>
          </div>

          {/* DYNAMIC REACTIVE ANALYTICS SECTION */}
          {loading ? (
            <div className="animate-pulse flex gap-6">
              <div className={`h-56 w-1/3 rounded-2xl ${card}`}></div>
              <div className={`h-56 w-1/3 rounded-2xl ${card}`}></div>
              <div className={`h-56 w-1/3 rounded-2xl ${card}`}></div>
            </div>
          ) : !dashboardData ? (
            <div className={`p-12 text-center rounded-2xl border shadow-sm ${card}`}>
              <Database className={`mx-auto w-12 h-12 mb-4 ${subText}`} />
              <h3 className={`text-xl font-semibold mb-2 ${text}`}>No Data Available</h3>
              <p className={`${subText} max-w-sm mx-auto`}>The system database is currently empty. Please run the Database Seeding Strategy script to populate the tracking architecture.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Active Trackers Mapping */}
              <div className="bg-black text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between h-56 relative overflow-hidden group">
                <div className="relative z-10">
                  <p className="text-gray-400 text-sm font-medium mb-4">Active Trackers</p>
                  <h3 className="text-5xl font-bold mb-2">{dashboardData.metrics.active_trackers}</h3>
                  <p className="text-green-400 text-sm font-medium flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" /> Live Tracking
                  </p>
                </div>
                <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-gray-800/20 rounded-full blur-2xl"></div>
              </div>

              {/* Total Savings Mapping (Math + F Expressions from API) */}
              <div className="bg-gray-200 p-6 rounded-2xl flex flex-col justify-between h-56">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-4">Total Identified Savings</p>
                  <div className="flex items-baseline">
                    <h3 className="text-4xl font-bold text-gray-900">
                      {formatCurrency(dashboardData.metrics.total_savings_inr)}
                    </h3>
                  </div>
                  <p className="text-gray-500 text-sm mt-1">Calculated via Database F-Expressions</p>
                </div>
                <button className="bg-black text-white font-medium py-2.5 px-6 rounded-full w-max text-sm hover:bg-gray-800 transition-colors">
                  View Seeded Logs
                </button>
              </div>

              {/* Pending Alerts Mapping */}
              <div className={`${card} p-6 rounded-2xl shadow-sm border flex flex-col justify-between h-56`}>
                <div>
                  <p className={`${subText} text-sm font-medium mb-4`}>Pending Alerts</p>
                  <h3 className={`text-5xl font-bold ${text}`}>{dashboardData.metrics.pending_alerts}</h3>
                </div>
                <div>
                  <p className="text-red-500 text-sm font-medium bg-red-50 py-1 px-3 rounded-full w-max mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {dashboardData.metrics.expired_today} expired today
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* EQUAL SIZE GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-6 flex">
              <AIShopperCard />
            </div>
            <div className="lg:col-span-6 flex">
              <RecommendationsSection />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* LOGIN */}
          <div className={`rounded-xl p-12 text-center border shadow-xl ${card}`}>
            <User className={`mx-auto mb-4 ${subText}`} size={40} />
            <h2 className={`text-2xl font-bold ${text}`}>Please Login</h2>
            <button onClick={() => navigate("/login")} className="mt-6 bg-indigo-600 text-white px-6 py-3 rounded-lg">
              <LogIn className="inline mr-2" /> Login
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;