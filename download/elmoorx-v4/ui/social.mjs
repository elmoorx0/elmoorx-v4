/**
 * Elmoorx v4 — Social & Communication UI Components
 * ==================================================
 * مكونات اجتماعية وتواصل:
 *   - ChatUI (message bubbles + typing indicator)
 *   - NotificationPanel
 *   - ActivityFeed
 *   - CommentSystem
 *   - ReactionPicker
 *   - UserPresence (online/offline)
 *   - MentionList
 */

import { h, $state, $computed, $effect, onCleanup } from '../runtime/core.mjs';
import { theme } from './index.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) CHAT UI — واجهة محادثة كاملة
// ─────────────────────────────────────────────────────────────────────────────

export function ChatUI(props) {
  const {
    messages = [], // [{ id, user, text, time, avatar, reactions: [] }]
    currentUser = 'me',
    onSend,
    typing = [], // [{ user, name }]
    showAvatars = true,
    ...rest
  } = props;

  const input = $state('');
  const messagesState = $state([...messages]);

  const send = (e) => {
    e?.preventDefault();
    if (!input().trim()) return;
    const msg = {
      id: Date.now(),
      user: currentUser,
      text: input().trim(),
      time: new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
    };
    messagesState.set(m => [...m, msg]);
    onSend?.(msg);
    input.set('');
  };

  const isMe = (user) => user === currentUser;

  return h('div', {
    style: `display:flex;flex-direction:column;height:100%;max-height:600px;background:${theme.colors.surface};border-radius:${theme.radius.lg};overflow:hidden;`,
    ...rest,
  },
    // Messages
    h('div', {
      style: `flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:0.5rem;`,
    },
      messagesState().map(msg =>
        h('div', {
          key: msg.id,
          style: `display:flex;gap:0.5rem;${isMe(msg.user) ? 'flex-direction:row-reverse;' : ''}`,
        },
          showAvatars && (msg.avatar
            ? h('img', { src: msg.avatar, style: `width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;` })
            : h('div', {
                style: `width:32px;height:32px;border-radius:50%;background:${theme.colors.primary};color:white;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:bold;flex-shrink:0;`,
              }, msg.user?.[0]?.toUpperCase() || '?')
          ),
          h('div', {
            style: `max-width:70%;`,
          },
            h('div', {
              style: `padding:0.6rem 1rem;border-radius:${theme.radius.lg};${isMe(msg.user)
                ? `background:${theme.colors.primary};color:white;border-bottom-right-radius:4px;`
                : `background:${theme.colors.dark};color:${theme.colors.text};border-bottom-left-radius:4px;`
              }`,
            }, msg.text),
            // Reactions
            msg.reactions?.length > 0 && h('div', {
              style: `display:flex;gap:0.2rem;margin-top:0.2rem;${isMe(msg.user) ? 'justify-content:flex-end;' : ''}`,
            },
              msg.reactions.map((r, i) =>
                h('span', {
                  key: i,
                  style: `padding:0.1rem 0.4rem;background:${theme.colors.surface};border:1px solid ${theme.colors.border};border-radius:12px;font-size:0.75rem;cursor:pointer;`,
                }, `${r.emoji} ${r.count || ''}`)
              )
            ),
            // Time
            h('div', {
              style: `font-size:0.65rem;color:${theme.colors.textMuted};margin-top:0.15rem;${isMe(msg.user) ? 'text-align:right;' : ''}`,
            }, msg.time)
          )
        )
      ),
      // Typing indicators
      typing.length > 0 && h('div', {
        style: `display:flex;gap:0.5rem;align-items:center;`,
      },
        showAvatars && h('div', {
          style: `width:32px;height:32px;border-radius:50%;background:${theme.colors.primary};color:white;display:flex;align-items:center;justify-content:center;font-size:0.75rem;`,
        }, typing[0].name?.[0] || '?'),
        h('div', {
          style: `padding:0.6rem 1rem;background:${theme.colors.dark};border-radius:${theme.radius.lg};border-bottom-left-radius:4px;display:flex;gap:3px;`,
        },
          h('span', { style: `width:8px;height:8px;background:${theme.colors.textMuted};border-radius:50%;animation:elmoorx-typing 1.4s infinite;` }),
          h('span', { style: `width:8px;height:8px;background:${theme.colors.textMuted};border-radius:50%;animation:elmoorx-typing 1.4s infinite 0.2s;` }),
          h('span', { style: `width:8px;height:8px;background:${theme.colors.textMuted};border-radius:50%;animation:elmoorx-typing 1.4s infinite 0.4s;` })
        )
      )
    ),
    // Input
    h('form', {
      onSubmit: send,
      style: `padding:0.75rem;border-top:1px solid ${theme.colors.border};display:flex;gap:0.5rem;background:${theme.colors.dark};`,
    },
      h('input', {
        type: 'text',
        value: input(),
        onInput: e => input.set(e.target.value),
        placeholder: 'اكتب رسالة...',
        style: `flex:1;padding:0.6rem 1rem;background:${theme.colors.surface};border:1px solid ${theme.colors.border};border-radius:${theme.radius.lg};color:${theme.colors.text};outline:none;`,
      }),
      h('button', {
        type: 'submit',
        disabled: !input().trim(),
        style: `padding:0.6rem 1.2rem;background:${theme.colors.primary};color:white;border:none;border-radius:${theme.radius.lg};cursor:pointer;${!input().trim() ? 'opacity:0.5;cursor:not-allowed;' : ''}`,
      }, '→')
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) NOTIFICATION PANEL
// ─────────────────────────────────────────────────────────────────────────────

export function NotificationPanel(props) {
  const {
    notifications = [], // [{ id, title, message, time, read, type, icon }]
    onMarkRead,
    onClear,
    onMarkAllRead,
    maxItems = 20,
    ...rest
  } = props;

  const items = $state(notifications.slice(0, maxItems));
  const unreadCount = $computed(() => items().filter(n => !n.read).length);

  const markRead = (id) => {
    items.set(items().map(n => n.id === id ? { ...n, read: true } : n));
    onMarkRead?.(id);
  };

  const markAllRead = () => {
    items.set(items().map(n => ({ ...n, read: true })));
    onMarkAllRead?.();
  };

  const clear = () => {
    items.set([]);
    onClear?.();
  };

  const typeIcons = {
    info: 'ℹ️',
    success: '✓',
    warning: '⚠',
    error: '✗',
    message: '✉',
  };

  const typeColors = {
    info: theme.colors.info,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.danger,
    message: theme.colors.primary,
  };

  return h('div', {
    style: `background:${theme.colors.surface};border-radius:${theme.radius.lg};overflow:hidden;width:360px;max-height:500px;display:flex;flex-direction:column;`,
    ...rest,
  },
    // Header
    h('div', {
      style: `padding:0.75rem 1rem;background:${theme.colors.dark};border-bottom:1px solid ${theme.colors.border};display:flex;justify-content:space-between;align-items:center;`,
    },
      h('div', { style: `display:flex;align-items:center;gap:0.5rem;color:${theme.colors.text};font-weight:600;font-size:${theme.fontSize.sm};` },
        'الإشعارات',
        unreadCount() > 0 && h('span', {
          style: `background:${theme.colors.danger};color:white;font-size:0.7rem;padding:0.1rem 0.4rem;border-radius:10px;`,
        }, String(unreadCount()))
      ),
      h('div', { style: 'display:flex;gap:0.25rem;' },
        unreadCount() > 0 && h('button', {
          onClick: markAllRead,
          style: `background:none;border:none;color:${theme.colors.primary};cursor:pointer;font-size:0.75rem;`,
        }, 'تعليم الكل كمقروء'),
        items().length > 0 && h('button', {
          onClick: clear,
          style: `background:none;border:none;color:${theme.colors.textMuted};cursor:pointer;font-size:0.75rem;`,
        }, 'مسح')
      )
    ),
    // List
    h('div', {
      style: 'flex:1;overflow-y:auto;',
    },
      items().length === 0
        ? h('div', {
            style: `padding:2rem;text-align:center;color:${theme.colors.textMuted};font-size:${theme.fontSize.sm};`,
          }, 'لا توجد إشعارات')
        : items().map(n =>
            h('div', {
              key: n.id,
              onClick: () => markRead(n.id),
              style: `padding:0.75rem 1rem;border-bottom:1px solid ${theme.colors.border};cursor:pointer;display:flex;gap:0.75rem;align-items:flex-start;background:${n.read ? 'transparent' : theme.colors.primary + '08'};transition:background 0.15s;`,
            },
              h('div', {
                style: `width:36px;height:36px;border-radius:50%;background:${typeColors[n.type] || theme.colors.primary}20;color:${typeColors[n.type] || theme.colors.primary};display:flex;align-items:center;justify-content:center;flex-shrink:0;`,
              }, n.icon || typeIcons[n.type] || 'ℹ'),
              h('div', { style: 'flex:1;min-width:0;' },
                h('div', {
                  style: `color:${theme.colors.text};font-weight:${n.read ? '400' : '600'};font-size:${theme.fontSize.sm};margin-bottom:0.15rem;`,
                }, n.title),
                n.message && h('div', {
                  style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.xs};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`,
                }, n.message),
                n.time && h('div', {
                  style: `color:${theme.colors.textMuted};font-size:0.65rem;margin-top:0.2rem;`,
                }, n.time)
              ),
              !n.read && h('div', {
                style: `width:8px;height:8px;border-radius:50%;background:${theme.colors.primary};flex-shrink:0;margin-top:0.4rem;`,
              })
            )
          )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) ACTIVITY FEED
// ─────────────────────────────────────────────────────────────────────────────

export function ActivityFeed(props) {
  const {
    activities = [], // [{ id, user, avatar, action, target, time, icon, color }]
    maxItems = 20,
    ...rest
  } = props;

  return h('div', {
    style: `background:${theme.colors.surface};border-radius:${theme.radius.lg};padding:1rem;`,
    ...rest,
  },
    h('h3', {
      style: `color:${theme.colors.text};font-size:${theme.fontSize.sm};margin-bottom:1rem;`,
    }, 'آخر النشاطات'),
    h('div', {
      style: 'position:relative;',
    },
      // Timeline line
      h('div', {
        style: `position:absolute;right:20px;top:0;bottom:0;width:2px;background:${theme.colors.border};`,
      }),
      activities.slice(0, maxItems).map((act, i) =>
        h('div', {
          key: act.id || i,
          style: 'position:relative;padding-right:3rem;padding-bottom:1rem;display:flex;align-items:flex-start;',
        },
          // Icon dot
          h('div', {
            style: `position:absolute;right:12px;top:4px;width:18px;height:18px;border-radius:50%;background:${act.color || theme.colors.primary};border:3px solid ${theme.colors.surface};display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:white;`,
          }, act.icon || ''),
          // Content
          h('div', { style: 'flex:1;' },
            h('div', {
              style: `color:${theme.colors.text};font-size:${theme.fontSize.sm};`,
            },
              h('span', { style: `font-weight:600;color:${theme.colors.primary};` }, act.user),
              ` ${act.action} `,
              act.target && h('span', { style: `font-weight:500;` }, act.target)
            ),
            act.time && h('div', {
              style: `color:${theme.colors.textMuted};font-size:0.7rem;margin-top:0.15rem;`,
            }, act.time)
          )
        )
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) COMMENT SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

export function CommentSystem(props) {
  const {
    comments: commentsProp = [], // [{ id, user, avatar, text, time, likes, replies: [] }]
    currentUser = { name: 'أنا' },
    onSubmit,
    onLike,
    ...rest
  } = props;

  const comments = $state([...commentsProp]);
  const input = $state('');
  const replyingTo = $state(null);
  const replyInput = $state('');

  const submit = (e) => {
    e?.preventDefault();
    if (!input().trim()) return;
    const comment = {
      id: Date.now(),
      user: currentUser.name,
      avatar: currentUser.avatar,
      text: input().trim(),
      time: 'الآن',
      likes: 0,
      replies: [],
    };
    comments.set(c => [comment, ...c]);
    onSubmit?.(comment);
    input.set('');
  };

  const submitReply = (parentId) => {
    if (!replyInput().trim()) return;
    const reply = {
      id: Date.now(),
      user: currentUser.name,
      avatar: currentUser.avatar,
      text: replyInput().trim(),
      time: 'الآن',
      likes: 0,
    };
    comments.set(c => c.map(comment =>
      comment.id === parentId
        ? { ...comment, replies: [...(comment.replies || []), reply] }
        : comment
    ));
    replyInput.set('');
    replyingTo.set(null);
  };

  const like = (id) => {
    comments.set(c => c.map(comment =>
      comment.id === id
        ? { ...comment, likes: (comment.likes || 0) + 1 }
        : {
            ...comment,
            replies: (comment.replies || []).map(r =>
              r.id === id ? { ...r, likes: (r.likes || 0) + 1 } : r
            ),
          }
    ));
    onLike?.(id);
  };

  const renderComment = (comment, isReply = false) =>
    h('div', {
      key: comment.id,
      style: `display:flex;gap:0.75rem;${isReply ? 'margin-top:0.75rem;padding-right:2.5rem;' : 'margin-bottom:1rem;'}`,
    },
      comment.avatar
        ? h('img', { src: comment.avatar, style: `width:${isReply ? '28px' : '36px'};height:${isReply ? '28px' : '36px'};border-radius:50%;object-fit:cover;flex-shrink:0;` })
        : h('div', {
            style: `width:${isReply ? '28px' : '36px'};height:${isReply ? '28px' : '36px'};border-radius:50%;background:${theme.colors.primary};color:white;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:bold;flex-shrink:0;`,
          }, comment.user?.[0]?.toUpperCase() || '?'),
      h('div', { style: 'flex:1;' },
        h('div', {
          style: `background:${theme.colors.dark};padding:0.6rem 1rem;border-radius:${theme.radius.lg};border-bottom-left-radius:4px;`,
        },
          h('div', {
            style: `color:${theme.colors.primary};font-weight:600;font-size:${theme.fontSize.sm};margin-bottom:0.15rem;`,
          }, comment.user),
          h('div', {
            style: `color:${theme.colors.text};font-size:${theme.fontSize.sm};line-height:1.5;`,
          }, comment.text)
        ),
        // Actions
        h('div', {
          style: `display:flex;gap:0.75rem;margin-top:0.3rem;align-items:center;`,
        },
          h('span', {
            style: `color:${theme.colors.textMuted};font-size:0.7rem;`,
          }, comment.time),
          h('button', {
            onClick: () => like(comment.id),
            style: `background:none;border:none;color:${theme.colors.textMuted};cursor:pointer;font-size:0.75rem;display:flex;align-items:center;gap:0.2rem;:hover{color:${theme.colors.danger};}`,
          }, `♥ ${comment.likes || 0}`),
          !isReply && h('button', {
            onClick: () => replyingTo.set(replyingTo() === comment.id ? null : comment.id),
            style: `background:none;border:none;color:${theme.colors.textMuted};cursor:pointer;font-size:0.75rem;`,
          }, 'رد')
        ),
        // Reply input
        replyingTo() === comment.id && h('div', {
          style: `margin-top:0.5rem;display:flex;gap:0.5rem;`,
        },
          h('input', {
            type: 'text',
            value: replyInput(),
            onInput: e => replyInput.set(e.target.value),
            placeholder: `الرد على ${comment.user}...`,
            style: `flex:1;padding:0.4rem 0.75rem;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.md};color:${theme.colors.text};font-size:${theme.fontSize.sm};outline:none;`,
          }),
          h('button', {
            onClick: () => submitReply(comment.id),
            disabled: !replyInput().trim(),
            style: `padding:0.4rem 1rem;background:${theme.colors.primary};color:white;border:none;border-radius:${theme.radius.md};cursor:pointer;font-size:${theme.fontSize.sm};${!replyInput().trim() ? 'opacity:0.5;cursor:not-allowed;' : ''}`,
          }, 'رد')
        ),
        // Replies
        (comment.replies || []).map(reply => renderComment(reply, true))
      )
    );

  return h('div', {
    style: `background:${theme.colors.surface};border-radius:${theme.radius.lg};padding:1.5rem;`,
    ...rest,
  },
    // Comment count
    h('div', {
      style: `color:${theme.colors.text};font-weight:600;margin-bottom:1rem;`,
    }, `${comments().length} تعليق`),
    // New comment
    h('form', {
      onSubmit: submit,
      style: `display:flex;gap:0.5rem;margin-bottom:1.5rem;`,
    },
      h('input', {
        type: 'text',
        value: input(),
        onInput: e => input.set(e.target.value),
        placeholder: 'اكتب تعليقاً...',
        style: `flex:1;padding:0.6rem 1rem;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.lg};color:${theme.colors.text};outline:none;`,
      }),
      h('button', {
        type: 'submit',
        disabled: !input().trim(),
        style: `padding:0.6rem 1.5rem;background:${theme.colors.primary};color:white;border:none;border-radius:${theme.radius.lg};cursor:pointer;${!input().trim() ? 'opacity:0.5;cursor:not-allowed;' : ''}`,
      }, 'تعليق')
    ),
    // Comments list
    h('div', null, comments().map(c => renderComment(c)))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) REACTION PICKER
// ─────────────────────────────────────────────────────────────────────────────

export function ReactionPicker(props) {
  const {
    onReact,
    reactions = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏'],
    ...rest
  } = props;

  return h('div', {
    style: `display:inline-flex;gap:0.2rem;background:${theme.colors.surface};padding:0.3rem;border-radius:${theme.radius.lg};border:1px solid ${theme.colors.border};box-shadow:${theme.shadows.md};`,
    ...rest,
  },
    reactions.map((emoji, i) =>
      h('button', {
        key: i,
        onClick: () => onReact?.(emoji),
        style: `width:32px;height:32px;border:none;background:none;border-radius:50%;cursor:pointer;font-size:1.2rem;transition:transform 0.15s;:hover{transform:scale(1.3);background:${theme.colors.dark};}`,
      }, emoji)
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) USER PRESENCE
// ─────────────────────────────────────────────────────────────────────────────

export function UserPresence(props) {
  const {
    name = '',
    avatar,
    status = 'online', // online | offline | away | busy
    size = 40,
    showName = true,
    ...rest
  } = props;

  const statusColors = {
    online: theme.colors.success,
    offline: theme.colors.textMuted,
    away: theme.colors.warning,
    busy: theme.colors.danger,
  };

  return h('div', {
    style: `display:inline-flex;align-items:center;gap:0.5rem;`,
    ...rest,
  },
    h('div', {
      style: `position:relative;width:${size}px;height:${size}px;`,
    },
      avatar
        ? h('img', { src: avatar, style: `width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;` })
        : h('div', {
            style: `width:${size}px;height:${size}px;border-radius:50%;background:${theme.colors.primary};color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:${size * 0.4}px;`,
          }, name?.[0]?.toUpperCase() || '?'),
      // Status dot
      h('div', {
        style: `position:absolute;bottom:0;right:0;width:${size * 0.3}px;height:${size * 0.3}px;border-radius:50%;background:${statusColors[status]};border:2px solid ${theme.colors.surface};`,
      })
    ),
    showName && name && h('span', {
      style: `color:${theme.colors.text};font-size:${theme.fontSize.sm};`,
    }, name)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  ChatUI,
  NotificationPanel,
  ActivityFeed,
  CommentSystem,
  ReactionPicker,
  UserPresence,
};
