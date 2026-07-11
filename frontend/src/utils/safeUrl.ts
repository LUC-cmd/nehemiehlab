const PRIVATE_IPV4 =
  /^(?:10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|0\.)/;

export function safeExternalUrl(raw?: string | null): string | null {
  if (!raw || raw.length > 2048) return null;
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (
      host === 'localhost' ||
      host === '::1' ||
      host.endsWith('.local') ||
      PRIVATE_IPV4.test(host)
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function safeYouTubeEmbedUrl(raw?: string | null): string | null {
  const safe = safeExternalUrl(raw);
  if (!safe) return null;
  const url = new URL(safe);
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  let videoId = '';
  if (host === 'youtu.be') {
    videoId = url.pathname.split('/').filter(Boolean)[0] || '';
  } else if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') videoId = url.searchParams.get('v') || '';
    else if (url.pathname.startsWith('/embed/') || url.pathname.startsWith('/shorts/')) {
      videoId = url.pathname.split('/')[2] || '';
    }
  }
  return /^[A-Za-z0-9_-]{6,20}$/.test(videoId)
    ? `https://www.youtube-nocookie.com/embed/${videoId}`
    : null;
}
