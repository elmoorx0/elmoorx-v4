/**
 * Elmoorx v4 — i18n (دعم متعدد اللغات)
 * =====================================
 * نظام ترجمة متكامل:
 *   - RTL/LTR تلقائي
 *   - pluralization
 *   - interpolation
 *   - lazy loading للغات
 *   - reactive — التغيير فوري
 *   - تنسيق الأرقام والتواريخ
 */

import { h, $state, $effect } from '../runtime/core.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) STATE — اللغة الحالية والقواميس
// ─────────────────────────────────────────────────────────────────────────────

const currentLocale = $state('ar');
const translations = new Map(); // locale → Map(key → translation)
const fallbackLocale = 'en';

// ─────────────────────────────────────────────────────────────────────────────
// 2) SETUP — تعريف الترجمات
// ─────────────────────────────────────────────────────────────────────────────

export function defineLocale(locale, dict) {
  if (!translations.has(locale)) translations.set(locale, new Map());
  const map = translations.get(locale);
  for (const [key, value] of Object.entries(dict)) {
    map.set(key, value);
  }
}

export function setLocale(locale) {
  currentLocale.set(locale);
  // حدّث <html lang> و dir
  if (typeof document !== 'undefined' && document.documentElement) {
    try {
      document.documentElement.lang = locale;
      document.documentElement.dir = isRTL(locale) ? 'rtl' : 'ltr';
    } catch {}
  }
}

export function getLocale() { return currentLocale(); }

export function isRTL(locale) {
  const rtl = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi', 'ckb'];
  return rtl.includes(locale);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) TRANSLATE — الترجمة الأساسية
// ─────────────────────────────────────────────────────────────────────────────

export function t(key, params = {}, options = {}) {
  const locale = options.locale || currentLocale();
  const dict = translations.get(locale);
  const fallback = translations.get(fallbackLocale);

  let value = dict?.get(key) ?? fallback?.get(key) ?? key;

  // pluralization — إذا كان params.count موجود
  if (typeof params === 'object' && 'count' in params) {
    value = pluralize(value, params.count, locale);
  }

  // interpolation
  if (typeof params === 'object') {
    value = interpolate(value, params);
  }

  return value;
}

function pluralize(value, count, locale) {
  // إذا كانت القيمة كائن pluralization
  if (typeof value === 'object' && value !== null) {
    // { zero, one, two, few, many, other }
    const rules = new Intl.PluralRules(locale);
    const category = rules.select(count);
    return value[category] || value.other || value.one || '';
  }
  return value;
}

function interpolate(str, params) {
  if (typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? params[key] : `{${key}}`;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) FORMATTING — تنسيق
// ─────────────────────────────────────────────────────────────────────────────

export function formatNumber(num, options = {}) {
  const locale = options.locale || currentLocale();
  return new Intl.NumberFormat(locale, options).format(num);
}

export function formatDate(date, options = {}) {
  const locale = options.locale || currentLocale();
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatRelative(date, options = {}) {
  const locale = options.locale || currentLocale();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const now = Date.now();
  const diff = new Date(date).getTime() - now;
  const sec = Math.round(diff / 1000);
  const min = Math.round(sec / 60);
  const hour = Math.round(min / 60);
  const day = Math.round(hour / 24);
  if (Math.abs(sec) < 60) return rtf.format(sec, 'second');
  if (Math.abs(min) < 60) return rtf.format(min, 'minute');
  if (Math.abs(hour) < 24) return rtf.format(hour, 'hour');
  return rtf.format(day, 'day');
}

export function formatCurrency(num, currency = 'USD', options = {}) {
  const locale = options.locale || currentLocale();
  return new Intl.NumberFormat(locale, { style: 'currency', currency, ...options }).format(num);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Translate component — reactive translation
 *
 * @example
 * h(T, { k: 'welcome', params: { name: 'محمد' } })
 */
export function T(props) {
  return t(props.k, props.params || {}, { locale: props.locale });
}

/**
 * LanguageSwitcher — مبدّل لغة جاهز
 */
export function LanguageSwitcher(props) {
  const locales = props.locales || Array.from(translations.keys());
  return h('select', {
    value: currentLocale(),
    onChange: (e) => setLocale(e.target.value),
    style: 'padding:0.5rem;background:#1e293b;color:white;border:1px solid #334155;border-radius:4px;',
    ...props,
  },
    locales.map(l => h('option', { key: l, value: l }, l.toUpperCase()))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useI18n() {
  return {
    locale: currentLocale,
    t,
    setLocale,
    formatNumber,
    formatDate,
    formatRelative,
    formatCurrency,
    isRTL: () => isRTL(currentLocale()),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) DEFAULT TRANSLATIONS — ترجمات افتراضية
// ─────────────────────────────────────────────────────────────────────────────

defineLocale('ar', {
  'app.title': 'تطبيقي',
  'app.welcome': 'مرحباً بك، {name}!',
  'app.loading': 'جاري التحميل...',
  'app.error': 'حدث خطأ',
  'app.save': 'حفظ',
  'app.cancel': 'إلغاء',
  'app.delete': 'حذف',
  'app.edit': 'تحرير',
  'app.search': 'بحث',
  'app.close': 'إغلاق',
  'app.submit': 'إرسال',
  'app.back': 'رجوع',
  'app.next': 'التالي',
  'app.previous': 'السابق',
  'app.confirm': 'تأكيد',
  'app.yes': 'نعم',
  'app.no': 'لا',
  'app.items': { zero: 'لا عناصر', one: 'عنصر واحد', two: 'عنصران', few: '{count} عناصر', many: '{count} عنصراً', other: '{count} عنصر' },
  'user.login': 'تسجيل الدخول',
  'user.logout': 'تسجيل الخروج',
  'user.register': 'إنشاء حساب',
  'user.profile': 'الملف الشخصي',
  'user.settings': 'الإعدادات',
});

defineLocale('en', {
  'app.title': 'My App',
  'app.welcome': 'Welcome, {name}!',
  'app.loading': 'Loading...',
  'app.error': 'An error occurred',
  'app.save': 'Save',
  'app.cancel': 'Cancel',
  'app.delete': 'Delete',
  'app.edit': 'Edit',
  'app.search': 'Search',
  'app.close': 'Close',
  'app.submit': 'Submit',
  'app.back': 'Back',
  'app.next': 'Next',
  'app.previous': 'Previous',
  'app.confirm': 'Confirm',
  'app.yes': 'Yes',
  'app.no': 'No',
  'app.items': { zero: 'no items', one: 'one item', other: '{count} items' },
  'user.login': 'Login',
  'user.logout': 'Logout',
  'user.register': 'Register',
  'user.profile': 'Profile',
  'user.settings': 'Settings',
});

// اضبط اللغة الافتراضية حسب المتصفح
if (typeof navigator !== 'undefined') {
  const browserLang = (navigator.language || 'ar').split('-')[0];
  if (translations.has(browserLang)) {
    currentLocale.set(browserLang);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  defineLocale,
  setLocale,
  getLocale,
  isRTL,
  t,
  formatNumber,
  formatDate,
  formatRelative,
  formatCurrency,
  T,
  LanguageSwitcher,
  useI18n,
};
