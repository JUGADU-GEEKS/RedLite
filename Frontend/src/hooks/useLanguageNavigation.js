import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Hook for language-aware navigation
 * Automatically includes language prefix in routes
 */
export const useLanguageNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useParams();
  const { i18n } = useTranslation();

  // Get current language from URL params or pathname
  let currentLang = lang;
  if (!currentLang) {
    const pathMatch = location.pathname.match(/^\/(en|hi|od)/);
    currentLang = pathMatch ? pathMatch[1] : (i18n.language || 'en');
  }

  const navigateTo = (path, options = {}) => {
    // Remove leading slash if present
    let cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    // If path already includes language prefix, use as-is
    if (cleanPath.match(/^(en|hi|od)\//)) {
      navigate(`/${cleanPath}`, options);
      return;
    }

    // Build path with language prefix
    // Always use /:lang/ format (even for 'en')
    const langPath = `/${currentLang}${cleanPath ? '/' + cleanPath : '/'}`;
    navigate(langPath, options);
  };

  const getLanguagePath = (path) => {
    let cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    if (cleanPath.match(/^(en|hi|od)\//)) {
      return `/${cleanPath}`;
    }

    // Always use /:lang/ format
    return `/${currentLang}${cleanPath ? '/' + cleanPath : '/'}`;
  };

  return { navigateTo, getLanguagePath, currentLang };
};

