import { createContext, useContext, useState, useEffect } from 'react';

export const COUNTRIES = [
  { code: 'IN', flag: '🇮🇳', name: 'India',          currency: 'INR', symbol: '₹',  lang: 'en' },
  { code: 'US', flag: '🇺🇸', name: 'United States',  currency: 'USD', symbol: '$',  lang: 'en' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', currency: 'GBP', symbol: '£',  lang: 'en' },
  { code: 'AE', flag: '🇦🇪', name: 'UAE',            currency: 'AED', symbol: 'AED ',lang: 'en' },
  { code: 'SA', flag: '🇸🇦', name: 'Saudi Arabia',   currency: 'SAR', symbol: 'SAR ',lang: 'en' },
  { code: 'SG', flag: '🇸🇬', name: 'Singapore',      currency: 'SGD', symbol: 'S$', lang: 'en' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia',      currency: 'AUD', symbol: 'A$', lang: 'en' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany',        currency: 'EUR', symbol: '€',  lang: 'en' },
  { code: 'FR', flag: '🇫🇷', name: 'France',         currency: 'EUR', symbol: '€',  lang: 'en' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada',         currency: 'CAD', symbol: 'C$', lang: 'en' },
  { code: 'MY', flag: '🇲🇾', name: 'Malaysia',       currency: 'MYR', symbol: 'RM ', lang: 'en' },
  { code: 'TH', flag: '🇹🇭', name: 'Thailand',       currency: 'THB', symbol: '฿',  lang: 'en' },
  { code: 'PH', flag: '🇵🇭', name: 'Philippines',    currency: 'PHP', symbol: '₱',  lang: 'en' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria',        currency: 'NGN', symbol: '₦',  lang: 'en' },
  { code: 'ZA', flag: '🇿🇦', name: 'South Africa',   currency: 'ZAR', symbol: 'R',  lang: 'en' },
];

const DEFAULT = COUNTRIES[0]; // India

const LocaleContext = createContext(null);

export function LocaleProvider({ children }) {
  const [country, setCountry] = useState(() => {
    try {
      const saved = localStorage.getItem('osioloc_country');
      if (saved) return COUNTRIES.find(c => c.code === saved) || DEFAULT;
    } catch {}
    return DEFAULT;
  });

  const selectCountry = (c) => {
    setCountry(c);
    try { localStorage.setItem('osioloc_country', c.code); } catch {}
  };

  /* Format a number as currency for the selected country */
  const formatCurrency = (amount) => {
    if (amount == null || isNaN(amount)) return `${country.symbol}0`;
    try {
      return new Intl.NumberFormat('en', {
        style: 'currency',
        currency: country.currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${country.symbol}${Math.round(amount).toLocaleString()}`;
    }
  };

  return (
    <LocaleContext.Provider value={{ country, selectCountry, formatCurrency, countries: COUNTRIES }}>
      {children}
    </LocaleContext.Provider>
  );
}

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside LocaleProvider');
  return ctx;
};
