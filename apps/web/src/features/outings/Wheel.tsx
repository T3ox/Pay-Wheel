import type { FairnessEntry } from '@pay-wheel/domain';
import { getParticipantColor, getReadableLabelColor } from './wheelPalette';

function polar(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle - 90) * Math.PI / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

function arcPath(start: number, end: number) {
  const from = polar(150, 150, 130, end);
  const to = polar(150, 150, 130, start);
  const large = end - start > 180 ? 1 : 0;
  return `M150 150 L${from.x} ${from.y} A130 130 0 ${large} 0 ${to.x} ${to.y} Z`;
}

export function Wheel({ entries, rotation = 0, spinning = false, durationMs = 3200 }: { entries: FairnessEntry[]; rotation?: number; spinning?: boolean; durationMs?: number }) {
  const equalSlice = entries.length ? 360 / entries.length : 360;
  let cursor = 0;
  return <div className="wheel-wrap">
    <div className="wheel-pointer" aria-hidden="true" />
    <svg className={`wheel ${spinning ? 'wheel--spinning' : ''}`} style={{ '--wheel-rotation': `${rotation}deg`, '--wheel-duration': `${durationMs}ms` } as React.CSSProperties} viewBox="0 0 300 300" role="img" aria-label={spinning ? `Ruota in rotazione con ${entries.length} partecipanti` : `Ruota con ${entries.length} partecipanti`}>
      {entries.length === 0 ? <circle cx="150" cy="150" r="130" fill="#262A33" /> : entries.map((entry) => {
        const start = cursor; const end = cursor + equalSlice; cursor = end;
        const mid = start + equalSlice / 2; const label = polar(150, 150, 84, mid);
        const fillColor = getParticipantColor(entries, entry.userId);
        const labelColor = getReadableLabelColor(fillColor);
        return <g key={entry.userId}>
          <path className="wheel-segment" data-user-id={entry.userId} d={arcPath(start, end)} fill={fillColor} stroke="#111318" strokeWidth="4" />
          {entry.eligibility === 'protected' && <path className="wheel-segment-protection" data-user-id={entry.userId} d={arcPath(start, end)} fill="none" stroke={labelColor} strokeWidth="3" strokeDasharray="7 6" aria-hidden="true" />}
          {entries.length <= 10 && <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${mid}, ${label.x}, ${label.y})`} className="wheel-label" fill={labelColor}>{entry.displayName.slice(0, 9)}</text>}
        </g>;
      })}
      <circle cx="150" cy="150" r="19" fill="#111318"/><circle cx="150" cy="150" r="8" fill="#F7F7F3"/>
    </svg>
  </div>;
}
