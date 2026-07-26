/**
 * اختبارات Media Components
 */
import { describe, it, expect } from '@elmoorx/testing';
import { h, renderToString } from '@elmoorx/runtime';
import { AudioPlayer, VideoPlayer, Gallery, AudioRecorder } from '../ui/media.mjs';

describe('Media — AudioPlayer', () => {
  it('should render player', () => {
    const html = renderToString(h(AudioPlayer, {
      src: 'song.mp3',
      title: 'Test Song',
      artist: 'Test Artist',
    }));
    expect(html).toContain('audio');
    expect(html).toContain('Test Song');
    expect(html).toContain('Test Artist');
  });

  it('should render play button', () => {
    const html = renderToString(h(AudioPlayer, { src: 'x.mp3' }));
    expect(html).toContain('▶');
  });

  it('should render cover image', () => {
    const html = renderToString(h(AudioPlayer, {
      src: 'x.mp3',
      cover: 'image.jpg',
    }));
    expect(html).toContain('image.jpg');
  });

  it('should render volume control', () => {
    const html = renderToString(h(AudioPlayer, { src: 'x.mp3' }));
    expect(html).toContain('type="range"');
  });
});

describe('Media — VideoPlayer', () => {
  it('should render video element', () => {
    const html = renderToString(h(VideoPlayer, {
      src: 'video.mp4',
      poster: 'poster.jpg',
    }));
    expect(html).toContain('video');
    expect(html).toContain('video.mp4');
    expect(html).toContain('poster.jpg');
  });

  it('should render custom controls when disabled', () => {
    const html = renderToString(h(VideoPlayer, {
      src: 'v.mp4',
      controls: false,
    }));
    expect(html).toContain('▶');
  });
});

describe('Media — Gallery', () => {
  it('should render image grid', () => {
    const html = renderToString(h(Gallery, {
      images: [
        { src: 'img1.jpg', alt: 'Image 1' },
        { src: 'img2.jpg', alt: 'Image 2' },
        { src: 'img3.jpg', alt: 'Image 3' },
      ],
      columns: 3,
    }));
    expect(html).toContain('img1.jpg');
    expect(html).toContain('img2.jpg');
    expect(html).toContain('img3.jpg');
  });

  it('should support custom columns', () => {
    const html = renderToString(h(Gallery, {
      images: [{ src: 'x.jpg' }],
      columns: 4,
    }));
    expect(html).toContain('repeat(4,1fr)');
  });

  it('should not show lightbox initially', () => {
    const html = renderToString(h(Gallery, {
      images: [{ src: 'x.jpg' }],
    }));
    // lightbox appears only when lightboxIndex >= 0
    expect(html).not.toContain('position:fixed');
  });

  it('should render lazy loading images', () => {
    const html = renderToString(h(Gallery, {
      images: [{ src: 'x.jpg' }],
    }));
    expect(html).toContain('loading="lazy"');
  });
});

describe('Media — AudioRecorder', () => {
  it('should render recorder', () => {
    const html = renderToString(h(AudioRecorder, {}));
    expect(html).toContain('ابدأ التسجيل');
  });

  it('should render timer display', () => {
    const html = renderToString(h(AudioRecorder, {}));
    expect(html).toContain('00:00');
  });

  it('should have start button', () => {
    const html = renderToString(h(AudioRecorder, {}));
    expect(html).toContain('button');
    expect(html).toContain('ابدأ');
  });
});
