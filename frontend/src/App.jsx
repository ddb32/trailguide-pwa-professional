import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';

// Auth Context
import { AuthProvider, ProtectedRoute } from './contexts/AuthContext';

// Layout Components
import Layout from './components/Layout/Layout';

// Pages
import Home from './pages/Home/Home';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import CreateGuide from './pages/CreateGuide/CreateGuide';
import ViewGuide from './pages/ViewGuide/ViewGuide';
import NotFound from './pages/NotFound/NotFound';

// Hooks
import { useLanguageDirection } from './hooks/useLanguageDirection';

function App() {
  const { i18n } = useTranslation();
  const { direction, isRTL } = useLanguageDirection();

  useEffect(() => {
    // Set document direction based on language
    document.documentElement.dir = direction;
    document.documentElement.lang = i18n.language;
    
    // Update body class for RTL styling
    document.body.className = isRTL ? 'rtl font-heebo' : 'ltr font-heebo';
  }, [direction, isRTL, i18n.language]);

  return (
    <AuthProvider>
      <Router>
        <div className="App min-h-screen bg-gray-50" dir={direction}>
        {/* Global Toast Notifications */}
        <Toaster
          position={isRTL ? 'top-left' : 'top-right'}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              fontFamily: 'Heebo, sans-serif',
              direction: direction,
            },
          }}
        />

          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/guide/:id" element={<ViewGuide />} />
            
            {/* Protected Routes (with Layout) */}
            <Route path="/app" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="create" element={<CreateGuide />} />
              <Route path="edit/:id" element={<CreateGuide />} />
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;