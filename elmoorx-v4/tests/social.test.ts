/**
 * اختبارات Social UI Components
 */
import { describe, it, expect } from '@elmoorx/testing';
import { h, renderToString } from '@elmoorx/runtime';
import { ChatUI, NotificationPanel, ActivityFeed, CommentSystem, ReactionPicker, UserPresence } from '../ui/social.mjs';

describe('Social UI — ChatUI', () => {
  it('should render messages', () => {
    const html = renderToString(h(ChatUI, {
      messages: [
        { id: 1, user: 'me', text: 'Hello', time: '10:00' },
        { id: 2, user: 'bot', text: 'Hi there', time: '10:01' },
      ],
      currentUser: 'me',
    }));
    expect(html).toContain('Hello');
    expect(html).toContain('Hi there');
  });

  it('should render input field', () => {
    const html = renderToString(h(ChatUI, { messages: [] }));
    expect(html).toContain('type="text"');
    expect(html).toContain('اكتب رسالة');
  });

  it('should render send button', () => {
    const html = renderToString(h(ChatUI, { messages: [] }));
    expect(html).toContain('→');
  });

  it('should render typing indicator', () => {
    const html = renderToString(h(ChatUI, {
      messages: [],
      typing: [{ user: 'bot', name: 'Bot' }],
    }));
    expect(html).toContain('animation');
  });
});

describe('Social UI — NotificationPanel', () => {
  it('should render notifications', () => {
    const html = renderToString(h(NotificationPanel, {
      notifications: [
        { id: 1, title: 'New message', message: 'Hello', time: '5m', type: 'message' },
        { id: 2, title: 'Success', type: 'success' },
      ],
    }));
    expect(html).toContain('New message');
    expect(html).toContain('Success');
  });

  it('should show unread count', () => {
    const html = renderToString(h(NotificationPanel, {
      notifications: [
        { id: 1, title: 'Unread', read: false },
      ],
    }));
    expect(html).toContain('1');
  });

  it('should render empty state', () => {
    const html = renderToString(h(NotificationPanel, {
      notifications: [],
    }));
    expect(html).toContain('لا توجد إشعارات');
  });

  it('should show type icons', () => {
    const html = renderToString(h(NotificationPanel, {
      notifications: [
        { id: 1, title: 'Info', type: 'info' },
        { id: 2, title: 'Error', type: 'error' },
      ],
    }));
    expect(html).toContain('ℹ');
    expect(html).toContain('✗');
  });
});

describe('Social UI — ActivityFeed', () => {
  it('should render activities', () => {
    const html = renderToString(h(ActivityFeed, {
      activities: [
        { id: 1, user: 'محمد', action: 'علّق على', target: 'تدوينة', time: '5 د' },
        { id: 2, user: 'فاطمة', action: 'أعجبت بـ', target: 'صورة', time: '10 د' },
      ],
    }));
    expect(html).toContain('محمد');
    expect(html).toContain('فاطمة');
    expect(html).toContain('تدوينة');
  });

  it('should show timeline line', () => {
    const html = renderToString(h(ActivityFeed, {
      activities: [{ id: 1, user: 'X', action: 'did', target: 'Y' }],
    }));
    expect(html).toContain('position:absolute');
  });
});

describe('Social UI — CommentSystem', () => {
  it('should render comments', () => {
    const html = renderToString(h(CommentSystem, {
      comments: [
        { id: 1, user: 'محمد', text: 'تعليق رائع', time: '5 د', likes: 3 },
      ],
    }));
    expect(html).toContain('محمد');
    expect(html).toContain('تعليق رائع');
    expect(html).toContain('♥ 3');
  });

  it('should render comment count', () => {
    const html = renderToString(h(CommentSystem, {
      comments: [
        { id: 1, user: 'A', text: 'x' },
        { id: 2, user: 'B', text: 'y' },
      ],
    }));
    expect(html).toContain('2 تعليق');
  });

  it('should render input', () => {
    const html = renderToString(h(CommentSystem, { comments: [] }));
    expect(html).toContain('اكتب تعليقاً');
  });

  it('should render replies', () => {
    const html = renderToString(h(CommentSystem, {
      comments: [
        { id: 1, user: 'A', text: 'parent', replies: [
          { id: 2, user: 'B', text: 'reply text' },
        ]},
      ],
    }));
    expect(html).toContain('reply text');
  });
});

describe('Social UI — ReactionPicker', () => {
  it('should render reaction buttons', () => {
    const html = renderToString(h(ReactionPicker, {}));
    expect(html).toContain('👍');
    expect(html).toContain('❤️');
    expect(html).toContain('🎉');
  });

  it('should render custom reactions', () => {
    const html = renderToString(h(ReactionPicker, {
      reactions: ['🚀', '💯', '🤔'],
    }));
    expect(html).toContain('🚀');
    expect(html).toContain('💯');
    expect(html).toContain('🤔');
  });
});

describe('Social UI — UserPresence', () => {
  it('should render with avatar', () => {
    const html = renderToString(h(UserPresence, {
      name: 'محمد',
      avatar: 'pic.jpg',
    }));
    expect(html).toContain('محمد');
    expect(html).toContain('pic.jpg');
  });

  it('should render initials when no avatar', () => {
    const html = renderToString(h(UserPresence, {
      name: 'Ahmed',
    }));
    expect(html).toContain('A');
  });

  it('should show online status dot', () => {
    const html = renderToString(h(UserPresence, {
      name: 'X',
      status: 'online',
    }));
    // online = green
    expect(html).toContain('#10b981');
  });

  it('should show busy status', () => {
    const html = renderToString(h(UserPresence, {
      name: 'X',
      status: 'busy',
    }));
    // busy = red
    expect(html).toContain('#ef4444');
  });

  it('should support different sizes', () => {
    const html = renderToString(h(UserPresence, {
      name: 'X',
      size: 60,
    }));
    expect(html).toContain('60px');
  });
});
