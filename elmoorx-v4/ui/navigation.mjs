/**
 * Elmoorx v4 — Navigation & Layout UI Components
 * ================================================
 * مكونات التنقل والتخطيط:
 *   - NavBar (responsive مع mobile menu)
 *   - MegaMenu (قائمة كبيرة متعددة الأعمدة)
 *   - BottomNav (تنقل سفلي للموبايل)
 *   - TabsBar (تبويبات شريطية)
 *   - ErrorBoundary (حدود الأخطاء)
 *   - ResultPage (صفحات نتائج: نجاح/فشل/404)
 *   - PageHeader (رأس صفحة)
 *   - ContentLoader (تحميل محتوى)
 */

import { h, $state, $computed, $effect } from '../runtime/core.mjs';
import { theme } from './index.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) NAVBAR — شريط تنقل علوي responsive
// ─────────────────────────────────────────────────────────────────────────────

export function NavBar(props) {
  const {
    logo = '✦ Elmoorx',
    links = [], // [{ label, href, icon, children: [...] }]
    actions,
    sticky = true,
    transparent = false,
    ...rest
  } = props;

  const mobileOpen = $state(false);
  const scrolled = $state(false);

  $effect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => scrolled.set(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  });

  return h('nav', {
    style: `${sticky ? 'position:sticky;top:0;' : ''}z-index:100;background:${transparent && !scrolled() ? 'transparent' : theme.colors.surface};backdrop-filter:${transparent ? 'blur(10px)' : 'none'};border-bottom:${scrolled() || !transparent ? `1px solid ${theme.colors.border}` : 'none'};transition:all 0.2s;`,
    ...rest,
  },
    h('div', {
      style: 'max-width:1200px;margin:0 auto;padding:0.75rem 1.5rem;display:flex;align-items:center;justify-content:between;gap:1rem;',
    },
      // Logo
      h('a', {
        href: '/',
        style: `color:${theme.colors.primary};font-weight:bold;font-size:1.25rem;text-decoration:none;white-space:nowrap;`,
      }, logo),
      // Desktop links
      h('div', {
        style: 'display:flex;gap:0.25rem;align-items:center;margin-right:auto;',
      },
        links.map((link, i) =>
          link.children?.length > 0
            ? h(MegaMenu, { key: i, link })
            : h('a', {
                key: i,
                href: link.href || '#',
                style: `padding:0.5rem 0.75rem;color:${theme.colors.textMuted};text-decoration:none;border-radius:${theme.radius.sm};font-size:${theme.fontSize.sm};transition:all 0.15s;:hover{color:${theme.colors.primary};background:${theme.colors.dark};}`,
              },
                link.icon && h('span', { style: 'margin-left:0.3rem;' }, link.icon),
                link.label
              )
        )
      ),
      // Actions
      actions && h('div', { style: 'display:flex;gap:0.5rem;align-items:center;' }, actions),
      // Mobile toggle
      h('button', {
        onClick: () => mobileOpen.set(!mobileOpen()),
        style: `display:none;background:none;border:none;color:${theme.colors.text};cursor:pointer;font-size:1.5rem;padding:0.25rem;`,
      }, mobileOpen() ? '✕' : '☰')
    ),
    // Mobile menu
    mobileOpen() && h('div', {
      style: `padding:0.75rem 1.5rem;background:${theme.colors.surface};border-top:1px solid ${theme.colors.border};display:none;flex-direction:column;gap:0.25rem;`,
    },
      links.map((link, i) =>
        h('a', {
          key: i,
          href: link.href || '#',
          onClick: () => mobileOpen.set(false),
          style: `padding:0.6rem;color:${theme.colors.text};text-decoration:none;border-radius:${theme.radius.sm};font-size:${theme.fontSize.sm};:hover{background:${theme.colors.dark};}`,
        },
          link.icon && h('span', { style: 'margin-left:0.3rem;' }, link.icon),
          link.label
        )
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) MEGA MENU — قائمة كبيرة متعددة الأعمدة
// ─────────────────────────────────────────────────────────────────────────────

export function MegaMenu(props) {
  const {
    link, // { label, icon, children: [{ title, items: [{ label, href, icon }] }] }
    ...rest
  } = props;

  const open = $state(false);

  return h('div', {
    onMouseEnter: () => open.set(true),
    onMouseLeave: () => open.set(false),
    style: 'position:relative;',
    ...rest,
  },
    h('a', {
      href: '#',
      style: `padding:0.5rem 0.75rem;color:${theme.colors.textMuted};text-decoration:none;border-radius:${theme.radius.sm};font-size:${theme.fontSize.sm};display:flex;align-items:center;gap:0.3rem;cursor:pointer;:hover{color:${theme.colors.primary};background:${theme.colors.dark};}`,
    },
      link.icon && h('span', null, link.icon),
      h('span', null, link.label),
      h('span', { style: 'font-size:0.7rem;' }, '▾')
    ),
    open() && h('div', {
      style: `position:absolute;top:100%;right:0;background:${theme.colors.surface};border:1px solid ${theme.colors.border};border-radius:${theme.radius.lg};box-shadow:${theme.shadows.lg};padding:1.5rem;z-index:1000;display:grid;grid-template-columns:repeat(${Math.min(link.children?.length || 1, 4)}, 1fr);gap:1.5rem;min-width:500px;margin-top:0.5rem;`,
    },
      (link.children || []).map((section, i) =>
        h('div', { key: i },
          section.title && h('div', {
            style: `color:${theme.colors.textMuted};font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:0.5rem;font-weight:600;`,
          }, section.title),
          (section.items || []).map((item, j) =>
            h('a', {
              key: j,
              href: item.href || '#',
              style: `display:flex;align-items:center;gap:0.5rem;padding:0.4rem;color:${theme.colors.text};text-decoration:none;border-radius:${theme.radius.sm};font-size:${theme.fontSize.sm};:hover{background:${theme.colors.dark};color:${theme.colors.primary};}`,
            },
              item.icon && h('span', { style: 'font-size:1.1rem;' }, item.icon),
              h('div', null,
                h('div', { style: 'font-weight:500;' }, item.label),
                item.description && h('div', {
                  style: `font-size:0.7rem;color:${theme.colors.textMuted};`,
                }, item.description)
              )
            )
          )
        )
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) BOTTOM NAV — تنقل سفلي للموبايل
// ─────────────────────────────────────────────────────────────────────────────

export function BottomNav(props) {
  const {
    items = [], // [{ label, icon, href, badge }]
    active,
    onChange,
    ...rest
  } = props;

  const current = $state(active || items[0]?.label);

  return h('div', {
    style: `position:fixed;bottom:0;left:0;right:0;background:${theme.colors.surface};border-top:1px solid ${theme.colors.border};display:flex;justify-content:around;padding:0.4rem 0;z-index:100;box-shadow:0 -2px 10px rgba(0,0,0,0.1);`,
    ...rest,
  },
    items.map((item, i) =>
      h('div', {
        key: i,
        onClick: () => { current.set(item.label); onChange?.(item); },
        style: `flex:1;display:flex;flex-direction:column;align-items:center;gap:0.15rem;padding:0.4rem;cursor:pointer;color:${current() === item.label ? theme.colors.primary : theme.colors.textMuted};transition:color 0.15s;position:relative;`,
      },
        h('div', { style: 'position:relative;' },
          h('span', { style: 'font-size:1.3rem;' }, item.icon),
          item.badge && h('span', {
            style: `position:absolute;top:-4px;left:-4px;background:${theme.colors.danger};color:white;font-size:0.6rem;min-width:16px;height:16px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 4px;`,
          }, String(item.badge))
        ),
        h('span', { style: 'font-size:0.7rem;' }, item.label)
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) PAGE HEADER — رأس صفحة
// ─────────────────────────────────────────────────────────────────────────────

export function PageHeader(props) {
  const {
    title,
    subtitle,
    breadcrumb,
    actions,
    avatar,
    tags = [],
    ...rest
  } = props;

  return h('div', {
    style: `padding:1.5rem 0;border-bottom:1px solid ${theme.colors.border};margin-bottom:1.5rem;`,
    ...rest,
  },
    breadcrumb && h('div', {
      style: `margin-bottom:0.5rem;`,
    }, breadcrumb),
    h('div', {
      style: 'display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;',
    },
      h('div', { style: 'display:flex;gap:1rem;align-items:center;' },
        avatar && h('div', {
          style: `width:56px;height:56px;border-radius:${theme.radius.lg};background:${theme.colors.primary}20;color:${theme.colors.primary};display:flex;align-items:center;justify-content:center;font-size:1.5rem;`,
        }, avatar),
        h('div', null,
          h('h1', {
            style: `color:${theme.colors.text};font-size:1.5rem;font-weight:700;margin:0;`,
          }, title),
          subtitle && h('p', {
            style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.sm};margin:0.25rem 0 0;`,
          }, subtitle),
          tags.length > 0 && h('div', {
            style: 'display:flex;gap:0.25rem;margin-top:0.5rem;flex-wrap:wrap;',
          },
            tags.map((tag, i) =>
              h('span', {
                key: i,
                style: `padding:0.15rem 0.5rem;background:${theme.colors.dark};color:${theme.colors.textMuted};border-radius:${theme.radius.full};font-size:0.7rem;`,
              }, tag)
            )
          )
        )
      ),
      actions && h('div', { style: 'display:flex;gap:0.5rem;flex-wrap:wrap;' }, actions)
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) RESULT PAGE — صفحات نتائج
// ─────────────────────────────────────────────────────────────────────────────

export function ResultPage(props) {
  const {
    type = 'success', // success | error | warning | info | 404 | 403 | 500
    title,
    description,
    actions,
    ...rest
  } = props;

  const config = {
    success: { icon: '✓', color: theme.colors.success, defaultTitle: 'تم بنجاح' },
    error: { icon: '✗', color: theme.colors.danger, defaultTitle: 'حدث خطأ' },
    warning: { icon: '⚠', color: theme.colors.warning, defaultTitle: 'تحذير' },
    info: { icon: 'ℹ', color: theme.colors.info, defaultTitle: 'معلومات' },
    '404': { icon: '🔍', color: theme.colors.textMuted, defaultTitle: '404 — الصفحة غير موجودة' },
    '403': { icon: '🔒', color: theme.colors.warning, defaultTitle: '403 — غير مصرح' },
    '500': { icon: '💥', color: theme.colors.danger, defaultTitle: '500 — خطأ في الخادم' },
  };

  const cfg = config[type] || config.info;

  return h('div', {
    style: `display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;text-align:center;min-height:400px;`,
    ...rest,
  },
    h('div', {
      style: `width:80px;height:80px;border-radius:50%;background:${cfg.color}20;color:${cfg.color};display:flex;align-items:center;justify-content:center;font-size:2.5rem;margin-bottom:1.5rem;`,
    }, cfg.icon),
    h('h1', {
      style: `color:${theme.colors.text};font-size:1.75rem;font-weight:700;margin:0 0 0.5rem;`,
    }, title || cfg.defaultTitle),
    description && h('p', {
      style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.md};max-width:400px;margin:0 0 2rem;line-height:1.6;`,
    }, description),
    actions && h('div', {
      style: 'display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:center;',
    }, actions)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) CONTENT LOADER — تحميل محتوى مع skeleton
// ─────────────────────────────────────────────────────────────────────────────

export function ContentLoader(props) {
  const {
    loading,
    error,
    children,
    skeleton = null,
    errorComponent = null,
    retry,
    ...rest
  } = props;

  if (loading) {
    return skeleton || h('div', {
      style: `padding:1.5rem;`,
      ...rest,
    },
      h('div', { style: `height:1.5rem;width:60%;background:${theme.colors.border};border-radius:4px;margin-bottom:0.75rem;animation:elmoorx-skeleton 1.5s infinite;` }),
      h('div', { style: `height:1rem;width:90%;background:${theme.colors.border};border-radius:4px;margin-bottom:0.5rem;animation:elmoorx-skeleton 1.5s infinite 0.1s;` }),
      h('div', { style: `height:1rem;width:80%;background:${theme.colors.border};border-radius:4px;margin-bottom:0.5rem;animation:elmoorx-skeleton 1.5s infinite 0.2s;` }),
      h('div', { style: `height:1rem;width:70%;background:${theme.colors.border};border-radius:4px;animation:elmoorx-skeleton 1.5s infinite 0.3s;` })
    );
  }

  if (error) {
    return errorComponent || h(ResultPage, {
      type: 'error',
      title: 'فشل التحميل',
      description: error.message || error,
      actions: retry && [
        h('button', {
          onClick: retry,
          style: `padding:0.6rem 1.5rem;background:${theme.colors.primary};color:white;border:none;border-radius:${theme.radius.md};cursor:pointer;`,
        }, '↻ إعادة المحاولة')
      ],
      ...rest,
    });
  }

  return children;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  NavBar,
  MegaMenu,
  BottomNav,
  PageHeader,
  ResultPage,
  ContentLoader,
};
