export const SPIN_DURATION_MS = 3200;
export const REDUCED_MOTION_DURATION_MS = 180;
export const SPIN_TURNS = 5;

interface WheelEntry {
  userId: string;
}

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

export function createSpinMotion(
  entries: readonly WheelEntry[],
  selectedUserId: string,
  currentRotation: number,
  reducedMotion: boolean
) {
  if (reducedMotion || entries.length === 0) {
    return { rotation: currentRotation, durationMs: REDUCED_MOTION_DURATION_MS };
  }

  const selectedIndex = entries.findIndex((entry) => entry.userId === selectedUserId);
  if (selectedIndex < 0) {
    return { rotation: currentRotation + SPIN_TURNS * 360, durationMs: SPIN_DURATION_MS };
  }

  const slice = 360 / entries.length;
  const selectedCenter = selectedIndex * slice + slice / 2;
  const landingAngle = normalizeAngle(360 - selectedCenter);
  const currentAngle = normalizeAngle(currentRotation);
  const alignmentDelta = normalizeAngle(landingAngle - currentAngle);

  return {
    rotation: currentRotation + SPIN_TURNS * 360 + alignmentDelta,
    durationMs: SPIN_DURATION_MS
  };
}
