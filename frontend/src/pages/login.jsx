// Note: This is a complete, self-contained React application to resolve the import errors.
// It combines all necessary logic (Context, API setup, Routing, and your UI) into one file.
// You will need to install the required packages: `npm install react react-dom react-router-dom axios`

import React, { createContext, useState, useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import axios from 'axios';

// --- API Configuration (formerly axiosConfig.js) ---
// This configured instance of axios will be used for all API calls.
const api = axios.create({
  baseURL: 'http://localhost:8080/api', // Make sure this matches your backend server port
  withCredentials: true, // Crucial for sending session cookies
});

// --- Authentication Context (formerly AuthContext.js) ---
const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
      } catch (error) {
        console.log('No active session found.');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkLoggedIn();
  }, []);

  const login = (userData) => setUser(userData);
  const logout = async (callback) => {
      try {
          await api.post('/auth/logout');
          setUser(null);
          if (callback) callback();
      } catch (error) {
          console.error("Logout failed:", error);
      }
  };

  if (loading) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <h2>Loading Application...</h2>
        </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to easily access the auth context
const useAuth = () => useContext(AuthContext);

// --- Protected Route Component ---
const ProtectedRoute = () => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" />;
  }
  return <Outlet />;
};

// --- Your LoginPage Component (Integrated) ---
const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsSubmitting(true);
      setServerError('');
      try {
        const response = await api.post('/auth/login', formData);
        login(response.data.user);
        navigate('/dashboard');
      } catch (error) {
        console.error('Login error:', error);
        const message = error.response?.data?.message || 'Login failed. Please try again.';
        setServerError(message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="flex h-screen w-full font-poppins">
      <div className="hidden md:block md:w-1/2 bg-[#050a24] relative">
        <div className="absolute inset-0">
          <img src="https://placehold.co/800x600/050a24/FFF?text=+" alt="Background pattern" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10 p-20 h-full flex flex-col">
          <div className="mb-8">
            <img src="https://placehold.co/200x100/FFFFFF/000000?text=Your+Logo" alt="Mati Logo" className="h-24 w-auto" />
          </div>
          <div className="mt-auto">
            <h1 className="text-[56px] font-light text-white leading-[67px]">
              Welcome.
              <br />
              Start your journey
              <br />
              now with our
              <br />
              management
              <br />
              system!
            </h1>
          </div>
        </div>
      </div>
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-[28px] font-semibold text-[#101828] mb-8">
              Log In
            </h2>
            <div className="space-y-6">
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} placeholder="email@gmail.com" required className="w-full p-3 border border-[#d1e9ff] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} name="password" id="password" value={formData.password} onChange={handleChange} placeholder="Enter your password" required className="w-full p-3 pr-10 border border-[#d1e9ff] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 cursor-pointer text-gray-400 hover:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </button>
                </div>
                {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[16px] font-semibold mt-8 transition-colors disabled:bg-blue-300">
              {isSubmitting ? 'Logging in...' : 'Log In'}
            </button>
            {serverError && <p className="text-red-600 text-sm mt-4 text-center">{serverError}</p>}
          </form>
        </div>
      </div>
    </div>
  );
};

// --- A Simple Dashboard Page ---
const DashboardPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout(() => navigate('/login'));
    };

    return (
        <div style={{ fontFamily: 'Poppins, sans-serif', padding: '2rem' }}>
            <h1>Welcome to the Dashboard, {user?.username || user?.email}!</h1>
            <p>This is a protected area.</p>
            <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', backgroundColor: 'blue', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Logout
            </button>
        </div>
    );
};

// --- Main App Component with Routing ---
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}

// --- Default Export ---
// The final component exported is the App wrapped in the AuthProvider.
export default function MainApp() {
    return (
        <AuthProvider>
            <App />
        </AuthProvider>
    );
}
