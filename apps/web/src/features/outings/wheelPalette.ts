export const participantColors = ['#48D7FF', '#FF5DB1', '#FFD84D', '#65E58B', '#A989FF', '#FF8A4C', '#3CE6CF', '#F36C6C'] as const;

interface ParticipantEntry {
  userId: string;
}

export function getParticipantColor(entries: readonly ParticipantEntry[], userId: string) {
  const index = entries.findIndex((entry) => entry.userId === userId);
  return participantColors[(index < 0 ? 0 : index) % participantColors.length];
}
