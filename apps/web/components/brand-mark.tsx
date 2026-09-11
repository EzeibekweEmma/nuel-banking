import type { SVGProps } from 'react';

export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" {...props}>
      <rect width="64" height="64" rx="16" fill="#092d24" />
      <path d="M32 9 49 15.5v14.1c0 11-6.5 20-17 25.4-10.5-5.4-17-14.4-17-25.4V15.5L32 9Z" fill="#d8f85c" />
      <path d="M22 41V23h5.4l9.1 10.4V23H42v18h-5.4l-9.1-10.4V41H22Z" fill="#092d24" />
      <path d="m51 7 1.5 4.5L57 13l-4.5 1.5L51 19l-1.5-4.5L45 13l4.5-1.5L51 7Z" fill="#5ee6af" />
    </svg>
  );
}
