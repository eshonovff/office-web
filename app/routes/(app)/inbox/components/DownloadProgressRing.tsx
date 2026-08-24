import { cn } from '~/lib/utils';

interface DownloadProgressRingProps {
  /** 0-1, or null for an indeterminate ring (no Content-Length from the server). */
  progress: number | null;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/** The circular progress Telegram shows over a thumbnail while a file downloads. */
export function DownloadProgressRing({ progress, size = 32, strokeWidth = 3, className }: DownloadProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = progress === null ? circumference * 0.75 : circumference * (1 - Math.max(0, Math.min(1, progress)));

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn(progress === null && 'animate-spin', className)}
      aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
