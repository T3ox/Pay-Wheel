export const participantColors = [
  '#48D7FF', '#FF5DB1', '#FFD84D', '#65E58B', '#A989FF',
  '#FF8A4C', '#3CE6CF', '#F36C6C', '#7DB7FF', '#F4A6D7',
  '#F9C74F', '#90E0A8', '#C7A6FF', '#FFB36B', '#62D6C6',
  '#FF7F8A', '#5EC8E5', '#E879B9', '#E6C229', '#72C98A',
  '#9C89E8', '#E76F51', '#2A9D8F', '#F4A261', '#7BDFF2'
] as const;

export const wheelFallbackColor = participantColors[0];
const darkLabel = '#111318';
const lightLabel = '#FFFFFF';

interface ParticipantEntry {
  userId: string;
}

export function getParticipantColor(entries: readonly ParticipantEntry[], userId: string) {
  const index = entries.findIndex((entry) => entry.userId === userId);
  return participantColors[(index < 0 ? 0 : index) % participantColors.length] ?? wheelFallbackColor;
}

function channelToLinear(channel: number) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color: string) {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (!match) return 0;
  const [, red = '00', green = '00', blue = '00'] = match;
  return 0.2126 * channelToLinear(Number.parseInt(red, 16))
    + 0.7152 * channelToLinear(Number.parseInt(green, 16))
    + 0.0722 * channelToLinear(Number.parseInt(blue, 16));
}

export function getContrastRatio(first: string, second: string) {
  const light = Math.max(relativeLuminance(first), relativeLuminance(second));
  const dark = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (light + 0.05) / (dark + 0.05);
}

export function getReadableLabelColor(background: string) {
  return getContrastRatio(background, darkLabel) >= getContrastRatio(background, lightLabel) ? darkLabel : lightLabel;
}
