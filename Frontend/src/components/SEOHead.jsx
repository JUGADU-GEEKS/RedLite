import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Component to add SEO improvements:
 * - hreflang tags for all language versions
 * - Dynamic title updates
 */
export const SEOHead = () => {
  const location = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    // Get current path without language prefix
    let path = location.pathname;
    const langMatch = path.match(/^\/(en|hi|od)(\/.*)?$/);
    const currentLang = langMatch ? langMatch[1] : 'en';
    const pathWithoutLang = langMatch ? (langMatch[2] || '/') : path;

    // Remove existing hreflang links
    const existingLinks = document.querySelectorAll('link[rel="alternate"][hreflang]');
    existingLinks.forEach(link => link.remove());

    // Add hreflang links for all supported languages
    const supportedLangs = ['en', 'hi', 'od'];
    supportedLangs.forEach(lang => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = lang;
      const href = lang === 'en' 
        ? `${window.location.origin}${pathWithoutLang === '/' ? '/' : pathWithoutLang}`
        : `${window.location.origin}/${lang}${pathWithoutLang === '/' ? '/' : pathWithoutLang}`;
      link.href = href;
      document.head.appendChild(link);
    });

    // Add x-default hreflang (defaults to English)
    const defaultLink = document.createElement('link');
    defaultLink.rel = 'alternate';
    defaultLink.hreflang = 'x-default';
    defaultLink.href = `${window.location.origin}${pathWithoutLang === '/' ? '/' : pathWithoutLang}`;
    document.head.appendChild(defaultLink);

    // Update page title based on language
    document.title = i18n.t('common:appName', { defaultValue: 'Lanezy' });

  }, [location.pathname, i18n]);

  return null;
};

