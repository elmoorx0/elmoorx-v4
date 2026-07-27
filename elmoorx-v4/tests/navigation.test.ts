/**
 * اختبارات Navigation UI Components
 */
import { describe, it, expect } from '@elmoorx/testing';
import { h, renderToString } from '@elmoorx/runtime';
import { NavBar, MegaMenu, BottomNav, PageHeader, ResultPage, ContentLoader } from '../ui/navigation.mjs';

describe('Navigation — NavBar', () => {
  it('should render logo', () => {
    const html = renderToString(h(NavBar, {
      logo: 'MyApp',
      links: [{ label: 'Home', href: '/' }],
    }));
    expect(html).toContain('MyApp');
    expect(html).toContain('Home');
  });

  it('should render links', () => {
    const html = renderToString(h(NavBar, {
      links: [
        { label: 'Home', href: '/' },
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ],
    }));
    expect(html).toContain('Home');
    expect(html).toContain('About');
    expect(html).toContain('Contact');
  });

  it('should render actions', () => {
    const html = renderToString(h(NavBar, {
      links: [],
      actions: h('button', null, 'Login'),
    }));
    expect(html).toContain('Login');
  });

  it('should render mobile toggle', () => {
    const html = renderToString(h(NavBar, { links: [] }));
    expect(html).toContain('☰');
  });
});

describe('Navigation — MegaMenu', () => {
  it('should render menu trigger', () => {
    const html = renderToString(h(MegaMenu, {
      link: {
        label: 'Products',
        children: [{ title: 'Category', items: [{ label: 'Item' }] }],
      },
    }));
    expect(html).toContain('Products');
    expect(html).toContain('▾');
  });
});

describe('Navigation — BottomNav', () => {
  it('should render nav items', () => {
    const html = renderToString(h(BottomNav, {
      items: [
        { label: 'Home', icon: '🏠' },
        { label: 'Search', icon: '🔍' },
        { label: 'Profile', icon: '👤' },
      ],
    }));
    expect(html).toContain('Home');
    expect(html).toContain('Search');
    expect(html).toContain('Profile');
    expect(html).toContain('🏠');
  });

  it('should render badge', () => {
    const html = renderToString(h(BottomNav, {
      items: [{ label: 'Inbox', icon: '✉', badge: 5 }],
    }));
    expect(html).toContain('5');
  });
});

describe('Navigation — PageHeader', () => {
  it('should render title and subtitle', () => {
    const html = renderToString(h(PageHeader, {
      title: 'Dashboard',
      subtitle: 'نظرة عامة على المشروع',
    }));
    expect(html).toContain('Dashboard');
    expect(html).toContain('نظرة عامة على المشروع');
  });

  it('should render tags', () => {
    const html = renderToString(h(PageHeader, {
      title: 'Project',
      tags: ['Active', 'Priority'],
    }));
    expect(html).toContain('Active');
    expect(html).toContain('Priority');
  });

  it('should render avatar', () => {
    const html = renderToString(h(PageHeader, {
      title: 'T',
      avatar: '📦',
    }));
    expect(html).toContain('📦');
  });

  it('should render actions', () => {
    const html = renderToString(h(PageHeader, {
      title: 'X',
      actions: h('button', null, 'Save'),
    }));
    expect(html).toContain('Save');
  });
});

describe('Navigation — ResultPage', () => {
  it('should render success', () => {
    const html = renderToString(h(ResultPage, { type: 'success', title: 'تم الحفظ' }));
    expect(html).toContain('تم الحفظ');
    expect(html).toContain('✓');
  });

  it('should render 404', () => {
    const html = renderToString(h(ResultPage, { type: '404' }));
    expect(html).toContain('404');
    expect(html).toContain('🔍');
  });

  it('should render error with description', () => {
    const html = renderToString(h(ResultPage, {
      type: 'error',
      title: 'Failed',
      description: 'Something went wrong',
    }));
    expect(html).toContain('Failed');
    expect(html).toContain('Something went wrong');
  });

  it('should render actions', () => {
    const html = renderToString(h(ResultPage, {
      type: 'success',
      actions: h('button', null, 'Continue'),
    }));
    expect(html).toContain('Continue');
  });
});

describe('Navigation — ContentLoader', () => {
  it('should render children when not loading', () => {
    const html = renderToString(h(ContentLoader, { loading: false }, 'Content here'));
    expect(html).toContain('Content here');
  });

  it('should render skeleton when loading', () => {
    const html = renderToString(h(ContentLoader, { loading: true }));
    expect(html).toContain('skeleton');
  });

  it('should render error when error present', () => {
    const html = renderToString(h(ContentLoader, {
      loading: false,
      error: 'Network error',
    }));
    expect(html).toContain('فشل التحميل');
    expect(html).toContain('Network error');
  });

  it('should render retry button', () => {
    const html = renderToString(h(ContentLoader, {
      loading: false,
      error: 'err',
      retry: () => {},
    }));
    expect(html).toContain('إعادة المحاولة');
  });
});
