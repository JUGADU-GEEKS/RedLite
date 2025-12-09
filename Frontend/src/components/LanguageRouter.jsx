import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Landing from './landing';
import Dashboard from './Dashboard';
import Team from './team';
import MapPage from './map';
import PotholesMap from './PotholesMap';
import SOS from './SOS';
import Alert from './Alert';
import Issue from './issue';
import UserWho from './user_who';
import ProtectedRoute from './ProtectedRoute';
import LoginPage from '../pages/Login';
import SignupPage from '../pages/Signup';
import UserAuth from '../pages/UserAuth';
import UserProfile from '../pages/UserProfile';
import AdminAssign from '../pages/AdminAssign';
import IntersectionsAdmin from '../pages/IntersectionsAdmin';
import MyIntersections from '../pages/MyIntersections';
import LaneDashboard from '../pages/LaneDashboard';
import WrongSide from '../pages/WrongSide';
import AmbulanceDashboard from '../pages/AmbulanceDashboard';
import AuthorityDashboard from '../pages/AuthorityDashboard';
import IllegalParkingDashboard from '../pages/IllegalParking/IllegalParkingDashboard';

// Component to handle language initialization for a route
const LanguageRoute = ({ children }) => {
  const { lang } = useParams();
  const { i18n, ready } = useTranslation();

  useEffect(() => {
    const supportedLangs = ['en', 'hi', 'od'];
    const currentLang = lang && supportedLangs.includes(lang) ? lang : 'en';
    
    // Only change language if it's different
    if (i18n.language !== currentLang && ready) {
      i18n.changeLanguage(currentLang).catch(err => {
        console.error('Failed to change language:', err);
      });
    }
  }, [lang, i18n, ready]);

  // Listen for language changes to ensure components re-render
  useEffect(() => {
    const handleLanguageChange = () => {
      // This ensures all child components re-render when language changes
      // Components using useTranslation() will automatically re-render
    };
    
    window.addEventListener('languagechange', handleLanguageChange);
    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      window.removeEventListener('languagechange', handleLanguageChange);
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  // Wait for translations to be ready
  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-500">Loading...</div></div>;
  }

  return children;
};

// Component to redirect /:lang to /:lang/
const LanguageRedirect = () => {
  const { lang } = useParams();
  const supportedLangs = ['en', 'hi', 'od'];
  const currentLang = lang && supportedLangs.includes(lang) ? lang : 'en';
  
  return <Navigate to={`/${currentLang}/`} replace />;
};

export const AppRoutes = () => {
  const location = useLocation();
  const { i18n } = useTranslation();

  return (
    <Routes>
      {/* Root redirect to default language */}
      <Route path="/" element={<Navigate to="/en/" replace />} />
      
      {/* Language-prefixed routes - redirect lang-only to lang/ */}
      <Route path="/:lang" element={<LanguageRedirect />} />
      
      <Route
        path="/:lang/"
        element={
          <LanguageRoute>
            <UserWho />
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/login"
        element={
          <LanguageRoute>
            <LoginPage />
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/signup"
        element={
          <LanguageRoute>
            <SignupPage />
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/home"
        element={
          <LanguageRoute>
            <Landing />
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/dashboard"
        element={
          <LanguageRoute>
            <ProtectedRoute roles={['employee', 'admin']}>
              <Dashboard />
            </ProtectedRoute>
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/dashboard/:intersectionId"
        element={
          <LanguageRoute>
            <ProtectedRoute roles={['employee', 'admin']}>
              <LaneDashboard />
            </ProtectedRoute>
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/lane-dashboard"
        element={
          <LanguageRoute>
            <ProtectedRoute roles={['employee', 'admin']}>
              <LaneDashboard />
            </ProtectedRoute>
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/sos"
        element={
          <LanguageRoute>
            <SOS />
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/user-login"
        element={
          <LanguageRoute>
            <UserAuth />
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/user-profile"
        element={
          <LanguageRoute>
            <ProtectedRoute roles={['user', 'employee', 'admin', 'ambulance_driver']}>
              <UserProfile />
            </ProtectedRoute>
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/team"
        element={
          <LanguageRoute>
            <Team />
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/map"
        element={
          <LanguageRoute>
            <MapPage />
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/potholes-map"
        element={
          <LanguageRoute>
            <PotholesMap />
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/emergency"
        element={
          <LanguageRoute>
            <Alert />
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/issue"
        element={
          <LanguageRoute>
            <Issue />
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/admin/intersections"
        element={
          <LanguageRoute>
            <ProtectedRoute roles={['admin']}>
              <IntersectionsAdmin />
            </ProtectedRoute>
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/my-intersections"
        element={
          <LanguageRoute>
            <ProtectedRoute roles={['employee']}>
              <MyIntersections />
            </ProtectedRoute>
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/wrong-side"
        element={
          <LanguageRoute>
            <ProtectedRoute roles={['admin', 'employee']}>
              <WrongSide />
            </ProtectedRoute>
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/ambulance-dashboard"
        element={
          <LanguageRoute>
            <ProtectedRoute roles={['ambulance_driver']}>
              <AmbulanceDashboard />
            </ProtectedRoute>
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/authority/dashboard"
        element={
          <LanguageRoute>
            <AuthorityDashboard />
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/illegal-parking"
        element={
          <LanguageRoute>
            <ProtectedRoute roles={['employee', 'admin']}>
              <IllegalParkingDashboard />
            </ProtectedRoute>
          </LanguageRoute>
        }
      />
      
      <Route
        path="/:lang/unauthorized"
        element={
          <LanguageRoute>
            <div style={{ padding: '2rem' }}>Unauthorized</div>
          </LanguageRoute>
        }
      />
      
      {/* Fallback: redirect to /en if no match */}
      <Route path="*" element={<Navigate to="/en/" replace />} />
    </Routes>
  );
};

