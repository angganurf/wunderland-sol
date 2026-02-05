import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

/**
 * POST /api/tips/preview
 *
 * Preview a tip before submission — validates content and returns hash.
 * For URL tips, fetches and sanitizes the content.
 * For text tips, normalizes and hashes directly.
 *
 * Request body:
 * - content: string (URL or text)
 * - sourceType: 'text' | 'url'
 *
 * Response:
 * - valid: boolean
 * - contentHash?: string (hex)
 * - contentLength?: number
 * - preview?: string (first 500 chars)
 * - error?: string
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, sourceType } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    if (!['text', 'url'].includes(sourceType)) {
      return NextResponse.json(
        { valid: false, error: 'Source type must be "text" or "url"' },
        { status: 400 }
      );
    }

    let sanitizedContent: string;
    let contentType = 'text/plain';

    if (sourceType === 'url') {
      // Validate URL
      let url: URL;
      try {
        url = new URL(content);
      } catch {
        return NextResponse.json(
          { valid: false, error: 'Invalid URL format' },
          { status: 400 }
        );
      }

      // Only allow HTTP(S)
      if (!['http:', 'https:'].includes(url.protocol)) {
        return NextResponse.json(
          { valid: false, error: `Blocked protocol: ${url.protocol}` },
          { status: 400 }
        );
      }

      // Block private IPs and localhost
      const hostname = url.hostname.toLowerCase();
      if (isBlockedHostname(hostname)) {
        return NextResponse.json(
          { valid: false, error: 'Blocked: internal/private address' },
          { status: 400 }
        );
      }

      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            'User-Agent': 'WunderlandBot/1.0 (+https://wunderland.sh)',
            Accept: 'text/html, text/plain, application/json, */*',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return NextResponse.json(
            { valid: false, error: `HTTP ${response.status}: ${response.statusText}` },
            { status: 400 }
          );
        }

        // Check content type
        contentType = response.headers.get('content-type')?.split(';')[0].trim() ?? 'text/plain';
        const allowedTypes = ['text/html', 'text/plain', 'application/json', 'application/xml'];
        if (!allowedTypes.some(t => contentType.includes(t))) {
          return NextResponse.json(
            { valid: false, error: `Blocked content-type: ${contentType}` },
            { status: 400 }
          );
        }

        // Read with size limit (1MB)
        const text = await response.text();
        if (text.length > 1_000_000) {
          return NextResponse.json(
            { valid: false, error: 'Content too large (max 1MB)' },
            { status: 400 }
          );
        }

        // Sanitize HTML
        sanitizedContent = contentType.includes('html') ? sanitizeHtml(text) : text;
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
          return NextResponse.json(
            { valid: false, error: 'Request timed out (10s)' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { valid: false, error: `Fetch failed: ${err instanceof Error ? err.message : 'Unknown'}` },
          { status: 400 }
        );
      }
    } else {
      // Text tip
      sanitizedContent = content.trim().slice(0, 10000);
    }

    // Normalize line endings
    sanitizedContent = sanitizedContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Compute hash
    const contentHash = createHash('sha256').update(sanitizedContent, 'utf-8').digest('hex');

    return NextResponse.json({
      valid: true,
      contentHash,
      contentLength: sanitizedContent.length,
      contentType,
      preview: sanitizedContent.slice(0, 500),
    });
  } catch (err) {
    console.error('[/api/tips/preview] Error:', err);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check if hostname is blocked (SSRF protection).
 */
function isBlockedHostname(hostname: string): boolean {
  // Localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }

  // Cloud metadata
  if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
    return true;
  }

  // Private IP patterns
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4);
  if (match) {
    const [, a, b] = match.map(Number);
    if (a === 10) return true; // 10.x.x.x
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16-31.x.x
    if (a === 192 && b === 168) return true; // 192.168.x.x
    if (a === 127) return true; // 127.x.x.x
    if (a === 169 && b === 254) return true; // 169.254.x.x (link-local)
  }

  // Internal hostname patterns
  const blockedPatterns = ['internal', 'intranet', 'corp', 'private', 'kubernetes', 'k8s'];
  return blockedPatterns.some(p => hostname.includes(p));
}

/**
 * Basic HTML sanitization (removes scripts, styles, event handlers).
 */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}
