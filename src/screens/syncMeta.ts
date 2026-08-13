/** Shared sync-status badge styling used by every screen header. */
export const SYNC_META: Record<string, { color: string; label: string }> = {
  idle: { color: '#CBD2D9', label: 'Offline mode' },
  syncing: { color: '#F0932B', label: 'Syncing…' },
  synced: { color: '#27AE60', label: 'Synced' },
  offline: { color: '#EF5D60', label: 'Offline' },
};
