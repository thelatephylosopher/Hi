import React, { createContext, useState, useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import axios from 'axios';

// --- (1) API Configuration ---
const api = axios.create({
  baseURL: 'http://localhost:8080/api', // Correct port
  withCredentials: true, 
});

// --- (2) Authentication Context ---
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- (3) Protected Route Component ---
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    // While the app is verifying the user's session, show a loading screen.
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <h2>Loading Application...</h2>
        </div>
    );
  }

  if (!user) {
    // Only after loading is complete, if there is still no user, redirect to login.
    return <Navigate to="/login" replace />;
  }
  
  // If loading is complete and a user exists, render the child components.
  return <Outlet />;
};

// --- (4) LoginPage Component (DIAGNOSTIC TEST) ---
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+\.\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsSubmitting(true);
      setServerError('');
      try {
        const response = await api.post('/auth/login', { email, password });
        // Call login to update the user state in the context.
        login(response.data.user);
      } catch (error) {
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
           <img src="https://placehold.co/1000x1200/050a24/050a24?text=+" alt="Background pattern" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10 p-20 h-full flex flex-col">
          <div className="mt-auto">
            <h1 className="text-[56px] font-light text-white leading-[67px]">
              Welcome.<br />Start your journey<br />now with our<br />management<br />system!
            </h1>
          </div>
        </div>
      </div>
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">
          {/* --- DIAGNOSTIC CHANGE --- */}
          {/* If a user is logged in, show a success message instead of the form. */}
          {/* This confirms the state update is working, isolating the problem from the redirect. */}
          {user ? (
            <div>
              <h2 className="text-[28px] font-semibold text-[#101828] mb-8">Login Successful!</h2>
              <p>Logged in as: {user.email}</p>
              <button 
                onClick={() => navigate('/dashboard')}
                className="w-full h-12 mt-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[16px] font-semibold"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <h2 className="text-[28px] font-semibold text-[#101828] mb-8">Log In</h2>
              <div className="space-y-6">
                <div className="flex flex-col gap-1">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
                  <input type="email" name="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@gmail.com" required className="w-full p-3 border border-[#d1e9ff] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} name="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required className="w-full p-3 pr-10 border border-[#d1e9ff] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
          )}
        </div>
      </div>
    </div>
  );
};

// A placeholder for your Dashboard component.
const DashboardPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout(() => navigate('/login'));
    };

    return (
        <div style={{ padding: '2rem', fontFamily: 'Poppins, sans-serif' }}>
            <h1>Dashboard</h1>
            <p>Welcome, {user?.username || user?.email}!</p>
            <button onClick={handleLogout} style={{ padding: '0.75rem 1.5rem', border: 'none', borderRadius: '8px', background: '#dc3545', color: 'white', cursor: 'pointer', fontSize: '1rem' }}>Logout</button>
        </div>
    );
};


// --- (5) Main App Component with FINAL routing ---
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          {/* --- RESTORED --- */}
          {/* The Dashboard is now protected by the ProtectedRoute component. */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            {/* Add any other protected routes here */}
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
