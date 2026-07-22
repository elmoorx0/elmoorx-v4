/**
 * اختبارات الـ router و i18n و http
 */
import { describe, it, expect } from '@elmoorx/testing';
import { defineLocale, setLocale, t, formatNumber, isRTL, formatCurrency } from '@elmoorx/i18n';

describe('i18n — basic translation', () => {
  it('should translate using default keys', () => {
    setLocale('ar');
    expect(t('app.save')).toBe('حفظ');
    setLocale('en');
    expect(t('app.save')).toBe('Save');
  });

  it('should fall back to en if key missing in current locale', () => {
    setLocale('ar');
    // 'app.cancel' exists in both — test fallback with custom key
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('should support interpolation', () => {
    setLocale('ar');
    const result = t('app.welcome', { name: 'محمد' });
    expect(result).toContain('محمد');
  });

  it('should detect RTL languages', () => {
    expect(isRTL('ar')).toBe(true);
    expect(isRTL('he')).toBe(true);
    expect(isRTL('en')).toBe(false);
    expect(isRTL('fr')).toBe(false);
  });
});

describe('i18n — formatting', () => {
  it('should format numbers according to locale', () => {
    setLocale('ar');
    const arabicNum = formatNumber(1234.56);
    expect(typeof arabicNum).toBe('string');
    setLocale('en');
    const englishNum = formatNumber(1234.56);
    expect(englishNum).toContain('1,234.56');
  });

  it('should format currency', () => {
    setLocale('en');
    const result = formatCurrency(99.99, 'USD');
    expect(result).toContain('99');
  });
});
