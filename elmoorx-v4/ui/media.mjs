/**
 * Elmoorx v4 — Media Components
 * ==============================
 * مكونات الوسائط:
 *   - AudioPlayer (مشغل صوت)
 *   - VideoPlayer (مشغل فيديو)
 *   - MediaPlayer (مشغل عام)
 *   - Gallery (معرض صور)
 *   - Lightbox (عارض صور مكبرة)
 *   - AudioRecorder (مسجل صوت)
 */

import { h, $state, $computed, $effect, onCleanup } from '../runtime/core.mjs';
import { theme } from './index.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) AUDIO PLAYER
// ─────────────────────────────────────────────────────────────────────────────

export function AudioPlayer(props) {
  const {
    src,
    title = '',
    artist = '',
    cover,
    autoplay = false,
    loop = false,
    ...rest
  } = props;

  const playing = $state(false);
  const currentTime = $state(0);
  const duration = $state(0);
  const volume = $state(1);
  const muted = $state(false);
  const audioRef = $state(null);

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const progress = $computed(() => duration() > 0 ? (currentTime() / duration()) * 100 : 0);

  const togglePlay = () => {
    if (!audioRef()) return;
    if (playing()) {
      audioRef().pause();
    } else {
      audioRef().play();
    }
  };

  const seek = (e) => {
    if (!audioRef()) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef().currentTime = pct * duration();
  };

  const changeVolume = (e) => {
    const vol = parseFloat(e.target.value);
    volume.set(vol);
    if (audioRef()) audioRef().volume = vol;
    muted.set(vol === 0);
  };

  $effect(() => {
    if (!audioRef()) return;
    const audio = audioRef();
    audio.volume = volume();
    audio.muted = muted();

    const onTime = () => currentTime.set(audio.currentTime);
    const onDur = () => duration.set(audio.duration);
    const onPlay = () => playing.set(true);
    const onPause = () => playing.set(false);
    const onEnd = () => { playing.set(false); if (loop) audio.play(); };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDur);
    audio.addEventListener('durationchange', onDur);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnd);

    onCleanup(() => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDur);
      audio.removeEventListener('durationchange', onDur);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnd);
    });
  });

  return h('div', {
    style: `background:${theme.colors.surface};border-radius:${theme.radius.lg};padding:1rem;display:flex;align-items:center;gap:1rem;max-width:500px;`,
    ...rest,
  },
    h('audio', {
      ref: (el) => audioRef.set(el),
      src,
      autoplay,
      loop,
      style: 'display:none;',
    }),
    // Cover art
    cover && h('div', {
      style: `width:64px;height:64px;border-radius:${theme.radius.md};background:${theme.colors.dark};background-image:url(${cover});background-size:cover;background-position:center;flex-shrink:0;`,
    }),
    // Controls
    h('div', { style: 'flex:1;display:flex;flex-direction:column;gap:0.5rem;' },
      // Title/Artist
      (title || artist) && h('div', null,
        title && h('div', { style: `color:${theme.colors.text};font-weight:600;font-size:${theme.fontSize.sm};` }, title),
        artist && h('div', { style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.xs};` }, artist)
      ),
      // Progress bar
      h('div', {
        onClick: seek,
        style: `height:6px;background:${theme.colors.border};border-radius:3px;cursor:pointer;position:relative;overflow:hidden;`,
      },
        h('div', {
          style: `height:100%;background:${theme.colors.primary};border-radius:3px;width:${progress()}%;transition:width 0.1s;`,
        })
      ),
      // Time + controls
      h('div', { style: 'display:flex;align-items:center;gap:0.5rem;' },
        h('button', {
          onClick: togglePlay,
          style: `width:36px;height:36px;border-radius:50%;background:${theme.colors.primary};color:white;border:none;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;`,
        }, playing() ? '⏸' : '▶'),
        h('span', {
          style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.xs};min-width:35px;`,
        }, formatTime(currentTime())),
        h('span', {
          style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.xs};`,
        }, '/'),
        h('span', {
          style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.xs};min-width:35px;`,
        }, formatTime(duration())),
        h('div', { style: 'flex:1;' }),
        // Volume
        h('button', {
          onClick: () => { muted.set(!muted()); if (audioRef()) audioRef().muted = muted(); },
          style: `background:none;border:none;color:${theme.colors.textMuted};cursor:pointer;font-size:0.9rem;`,
        }, muted() ? '🔇' : '🔊'),
        h('input', {
          type: 'range',
          min: 0,
          max: 1,
          step: 0.1,
          value: volume(),
          onChange: changeVolume,
          style: `width:60px;accent-color:${theme.colors.primary};`,
        })
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) VIDEO PLAYER
// ─────────────────────────────────────────────────────────────────────────────

export function VideoPlayer(props) {
  const {
    src,
    poster,
    controls = true,
    autoplay = false,
    loop = false,
    muted = false,
    width = '100%',
    height = 'auto',
    ...rest
  } = props;

  const videoRef = $state(null);
  const playing = $state(false);
  const fullscreen = $state(false);

  const togglePlay = () => {
    if (!videoRef()) return;
    if (playing()) videoRef().pause();
    else videoRef().play();
  };

  const toggleFullscreen = () => {
    if (!videoRef()) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef().requestFullscreen?.();
    }
  };

  $effect(() => {
    if (!videoRef()) return;
    const v = videoRef();
    const onPlay = () => playing.set(true);
    const onPause = () => playing.set(false);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    onCleanup(() => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    });
  });

  return h('div', {
    style: `position:relative;background:#000;border-radius:${theme.radius.md};overflow:hidden;width:${width};${height !== 'auto' ? `height:${height};` : ''}`,
    ...rest,
  },
    h('video', {
      ref: (el) => videoRef.set(el),
      src,
      poster,
      controls,
      autoplay,
      loop,
      muted,
      style: 'width:100%;height:100%;display:block;',
      onClick: () => { if (!controls) togglePlay(); },
    }),
    !controls && h('button', {
      onClick: togglePlay,
      style: `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:64px;height:64px;border-radius:50%;background:rgba(0,0,0,0.7);color:white;border:none;cursor:pointer;font-size:1.5rem;display:flex;align-items:center;justify-content:center;opacity:${playing() ? 0 : 0.8};transition:opacity 0.2s;`,
    }, playing() ? '⏸' : '▶')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) IMAGE GALLERY
// ─────────────────────────────────────────────────────────────────────────────

export function Gallery(props) {
  const {
    images = [], // [{ src, alt, title }]
    columns = 3,
    gap = '0.5rem',
    ...rest
  } = props;

  const lightboxIndex = $state(-1);

  const openLightbox = (i) => lightboxIndex.set(i);
  const closeLightbox = () => lightboxIndex.set(-1);
  const next = () => lightboxIndex.set(i => (i + 1) % images.length);
  const prev = () => lightboxIndex.set(i => (i - 1 + images.length) % images.length);

  $effect(() => {
    if (lightboxIndex() < 0) return;
    if (typeof window === 'undefined') return;
    const handleKey = (e) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') prev();
      if (e.key === 'ArrowLeft') next();
    };
    window.addEventListener('keydown', handleKey);
    onCleanup(() => window.removeEventListener('keydown', handleKey));
  });

  return h('div', null,
    // Grid
    h('div', {
      style: `display:grid;grid-template-columns:repeat(${columns},1fr);gap:${gap};`,
      ...rest,
    },
      images.map((img, i) =>
        h('div', {
          key: i,
          onClick: () => openLightbox(i),
          style: `cursor:pointer;aspect-ratio:1;border-radius:${theme.radius.md};overflow:hidden;background:${theme.colors.dark};`,
        },
          h('img', {
            src: img.src,
            alt: img.alt || '',
            style: 'width:100%;height:100%;object-fit:cover;transition:transform 0.2s;',
            loading: 'lazy',
          })
        )
      )
    ),
    // Lightbox
    lightboxIndex() >= 0 && h('div', {
      onClick: closeLightbox,
      style: 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;',
    },
      h('button', {
        onClick: (e) => { e.stopPropagation(); prev(); },
        style: 'position:absolute;right:2rem;top:50%;transform:translateY(-50%);background:none;border:none;color:white;font-size:3rem;cursor:pointer;',
      }, '‹'),
      h('div', {
        onClick: e => e.stopPropagation(),
        style: 'max-width:90%;max-height:90%;position:relative;',
      },
        h('img', {
          src: images[lightboxIndex()].src,
          alt: images[lightboxIndex()].alt || '',
          style: 'max-width:100%;max-height:90vh;border-radius:8px;',
        }),
        images[lightboxIndex()].title && h('div', {
          style: 'position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.8));color:white;padding:2rem 1rem 1rem;border-radius:0 0 8px 8px;',
        }, images[lightboxIndex()].title)
      ),
      h('button', {
        onClick: (e) => { e.stopPropagation(); next(); },
        style: 'position:absolute;left:2rem;top:50%;transform:translateY(-50%);background:none;border:none;color:white;font-size:3rem;cursor:pointer;',
      }, '›'),
      h('button', {
        onClick: closeLightbox,
        style: 'position:absolute;top:1rem;right:1rem;background:none;border:none;color:white;font-size:2rem;cursor:pointer;',
      }, '×'),
      h('div', {
        style: 'position:absolute;bottom:1rem;left:50%;transform:translateX(-50%);color:white;font-size:0.85rem;',
      }, `${lightboxIndex() + 1} / ${images.length}`)
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) AUDIO RECORDER
// ─────────────────────────────────────────────────────────────────────────────

export function AudioRecorder(props) {
  const {
    onSave,
    maxDuration = 60000, // 10 minutes
    ...rest
  } = props;

  const recording = $state(false);
  const paused = $state(false);
  const duration = $state(0);
  const audioUrl = $state(null);
  const error = $state('');

  let mediaRecorder = null;
  let chunks = [];
  let timer = null;
  let stream = null;

  const start = async () => {
    error.set('');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      chunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        audioUrl.set(URL.createObjectURL(blob));
        onSave?.(blob);
        stream?.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      recording.set(true);
      paused.set(false);

      const startTime = Date.now();
      timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        duration.set(elapsed);
        if (elapsed >= maxDuration) stop();
      }, 100);
    } catch (err) {
      error.set(err.message);
    }
  };

  const pause = () => {
    if (mediaRecorder?.state === 'recording') {
      mediaRecorder.pause();
      paused.set(true);
    } else if (mediaRecorder?.state === 'paused') {
      mediaRecorder.resume();
      paused.set(false);
    }
  };

  const stop = () => {
    if (mediaRecorder?.state !== 'inactive') {
      mediaRecorder.stop();
    }
    recording.set(false);
    paused.set(false);
    if (timer) clearInterval(timer);
  };

  const formatDuration = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return h('div', {
    style: `background:${theme.colors.surface};border-radius:${theme.radius.lg};padding:1.5rem;text-align:center;`,
    ...rest,
  },
    error() && h('div', {
      style: `color:${theme.colors.danger};margin-bottom:1rem;`,
    }, error()),
    // Timer
    h('div', {
      style: `font-size:2rem;font-family:monospace;color:${recording() ? theme.colors.danger : theme.colors.text};margin-bottom:1rem;`,
    }, formatDuration(duration())),
    // Recording indicator
    recording() && h('div', {
      style: `display:inline-flex;align-items:center;gap:0.5rem;color:${theme.colors.danger};margin-bottom:1rem;font-size:${theme.fontSize.sm};`,
    },
      h('span', {
        style: `width:10px;height:10px;border-radius:50%;background:${theme.colors.danger};animation:elmoorx-pulse 1s infinite;`,
      }),
      paused() ? 'متوقف مؤقتاً' : 'يسجّل...'
    ),
    // Controls
    h('div', { style: 'display:flex;gap:0.5rem;justify-content:center;' },
      !recording()
        ? h('button', {
            onClick: start,
            style: `padding:0.75rem 1.5rem;background:${theme.colors.danger};color:white;border:none;border-radius:${theme.radius.md};cursor:pointer;font-size:1rem;`,
          }, '🔴 ابدأ التسجيل')
        : [
            h('button', {
              onClick: pause,
              style: `padding:0.75rem 1.5rem;background:${theme.colors.warning};color:white;border:none;border-radius:${theme.radius.md};cursor:pointer;font-size:1rem;`,
            }, paused() ? '▶ استئناف' : '⏸ إيقاف مؤقت'),
            h('button', {
              onClick: stop,
              style: `padding:0.75rem 1.5rem;background:${theme.colors.success};color:white;border:none;border-radius:${theme.radius.md};cursor:pointer;font-size:1rem;`,
            }, '⏹ إيقاف')
          ]
    ),
    // Playback
    audioUrl() && h('div', { style: 'margin-top:1rem;' },
      h('audio', {
        src: audioUrl(),
        controls: true,
        style: 'width:100%;',
      })
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  AudioPlayer,
  VideoPlayer,
  Gallery,
  AudioRecorder,
};
