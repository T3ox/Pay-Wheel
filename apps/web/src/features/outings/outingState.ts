export function canMutateSharedWheel({ demo, online, synced, maintenance }: { demo: boolean; online: boolean; synced: boolean; maintenance: boolean }): boolean {
  return (demo || (online && synced)) && !maintenance;
}
