'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * OrganicButton — An animated SVG button that feels alive.
 *
 * The border undulates like a living membrane. On hover, it
 * expands and the glow intensifies. Each button has a unique
 * organic silhouette derived from a seed value.
 */

interface OrganicButtonProps {
  href: string;
  label: string;
  sublabel?: string;
  color?: string;      // primary hue CSS color
  accentColor?: string; // secondary glow
  external?: boolean;
  icon?: 'github' | 'trophy' | 'chain';
  className?: string;
}

// SVG path icons
const ICONS: Record<string, string> = {
  github: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z',
  trophy: 'M5 3h14v2h-1v3c0 2.21-1.79 4-4 4h-1v2h3v2H8v-2h3v-2H9c-2.21 0-4-1.79-4-4V5H4V3h1zm2 2v3c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V5H7zm-3 13h16v2H4v-2z',
  chain: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
};

export function OrganicButton({
  href,
  label,
  sublabel,
  color = '#9945ff',
  accentColor = '#14f195',
  external = false,
  icon,
  className = '',
}: OrganicButtonProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState(false);
  const pathRef = useRef<SVGPathElement>(null);
  const animFrame = useRef(0);
  const timeRef = useRef(0);

  // Generate undulating organic border
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;

    const W = 240;
    const H = 64;
    const segments = 48;
    const cornerR = 20;

    function buildPath(t: number, amplitude: number) {
      const pts: { x: number; y: number }[] = [];

      // Top edge (left to right)
      for (let i = 0; i <= segments; i++) {
        const frac = i / segments;
        const x = cornerR + frac * (W - 2 * cornerR);
        const wave = Math.sin(frac * Math.PI * 4 + t * 2) * amplitude
                   + Math.sin(frac * Math.PI * 7 + t * 3.1) * amplitude * 0.5;
        pts.push({ x, y: 2 + wave });
      }

      // Right edge (top to bottom)
      for (let i = 0; i <= segments / 3; i++) {
        const frac = i / (segments / 3);
        const y = cornerR + frac * (H - 2 * cornerR);
        const wave = Math.sin(frac * Math.PI * 3 + t * 2.5) * amplitude * 0.7;
        pts.push({ x: W - 2 + wave, y });
      }

      // Bottom edge (right to left)
      for (let i = 0; i <= segments; i++) {
        const frac = i / segments;
        const x = W - cornerR - frac * (W - 2 * cornerR);
        const wave = Math.sin(frac * Math.PI * 5 + t * 1.8) * amplitude
                   + Math.cos(frac * Math.PI * 3 + t * 2.7) * amplitude * 0.4;
        pts.push({ x, y: H - 2 + wave });
      }

      // Left edge (bottom to top)
      for (let i = 0; i <= segments / 3; i++) {
        const frac = i / (segments / 3);
        const y = H - cornerR - frac * (H - 2 * cornerR);
        const wave = Math.sin(frac * Math.PI * 3.5 + t * 2.2) * amplitude * 0.7;
        pts.push({ x: 2 + wave, y });
      }

      // Build smooth SVG path
      const first = pts[0];
      let d = `M ${first.x} ${first.y}`;
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2;
        const my = (pts[i].y + pts[i + 1].y) / 2;
        d += ` Q ${pts[i].x} ${pts[i].y} ${mx} ${my}`;
      }
      d += ' Z';
      return d;
    }

    function animate() {
      if (!path) return;
      timeRef.current += 0.015;
      const amp = hovered ? 3.5 : 1.8;
      path.setAttribute('d', buildPath(timeRef.current, amp));
      animFrame.current = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(animFrame.current);
  }, [hovered]);

  const gradId = `org-grad-${label.replace(/\s/g, '')}`;
  const glowId = `org-glow-${label.replace(/\s/g, '')}`;

  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener' : undefined}
      className={`relative inline-block group ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 240 64"
        className="w-[240px] h-[64px] transition-transform duration-300"
        style={{
          filter: hovered
            ? `drop-shadow(0 0 16px ${color}60) drop-shadow(0 0 40px ${color}20)`
            : `drop-shadow(0 0 6px ${color}30)`,
          transform: hovered ? 'scale(1.03)' : 'scale(1)',
        }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="50%" stopColor={accentColor} stopOpacity="0.08" />
            <stop offset="100%" stopColor={color} stopOpacity="0.2" />
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Organic fill */}
        <path
          ref={pathRef}
          d="M20 2 H220 Q238 2 238 20 V44 Q238 62 220 62 H20 Q2 62 2 44 V20 Q2 2 20 2 Z"
          fill={`url(#${gradId})`}
          stroke={color}
          strokeWidth={hovered ? 1.5 : 0.8}
          strokeOpacity={hovered ? 0.8 : 0.4}
          filter={hovered ? `url(#${glowId})` : undefined}
        />

        {/* Icon */}
        {icon && (
          <g transform="translate(20, 20) scale(1)" opacity={0.7}>
            <path d={ICONS[icon]} fill="white" />
          </g>
        )}

        {/* Label */}
        <text
          x={icon ? 52 : 120}
          y={sublabel ? 26 : 34}
          textAnchor={icon ? 'start' : 'middle'}
          fill="white"
          fontSize="13"
          fontFamily="'Space Grotesk', system-ui, sans-serif"
          fontWeight="600"
        >
          {label}
        </text>

        {/* Sublabel */}
        {sublabel && (
          <text
            x={icon ? 52 : 120}
            y={42}
            textAnchor={icon ? 'start' : 'middle'}
            fill="rgba(255,255,255,0.35)"
            fontSize="9"
            fontFamily="'JetBrains Mono', monospace"
          >
            {sublabel}
          </text>
        )}
      </svg>
    </a>
  );
}
