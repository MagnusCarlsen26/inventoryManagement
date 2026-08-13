import { useCallback, useEffect, useRef, useState } from 'react';
import { Identity } from '../types';
import { ADMIN_PASSWORD } from '../config';
import { isConfigured } from '../supabase';
import { clearIdentity, loadIdentity, saveIdentity } from '../storage';
import { fetchUser, registerStaff } from '../remote';

function uuid(): string {
  const g: any = globalThis as any;
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const APPROVAL_POLL_MS = 15_000;

export function useAuth() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [ready, setReady] = useState(false);
  /** set when a staff account was removed by an admin. */
  const [accessRemoved, setAccessRemoved] = useState(false);
  const idRef = useRef<Identity | null>(null);
  idRef.current = identity;

  const setId = useCallback((id: Identity | null) => {
    setIdentity(id);
    if (id) saveIdentity(id);
    else clearIdentity();
  }, []);

  useEffect(() => {
    (async () => {
      setIdentity(await loadIdentity());
      setReady(true);
    })();
  }, []);

  /** Reconcile a staff identity against the server (approval flips / deletion). */
  const syncStaff = useCallback(async () => {
    const id = idRef.current;
    if (!id || id.role !== 'staff' || !isConfigured) return;
    const remote = await fetchUser(id.id).catch(() => undefined);
    if (remote === undefined) return; // network error — leave as-is
    if (remote === null) {
      setAccessRemoved(true);
      setId(null);
      return;
    }
    if (remote.approved !== id.approved || remote.name !== id.name) {
      setId({ ...id, approved: remote.approved, name: remote.name });
    }
  }, [setId]);

  useEffect(() => {
    if (!ready || !identity || identity.role !== 'staff') return;
    syncStaff();
    const t = setInterval(syncStaff, APPROVAL_POLL_MS);
    return () => clearInterval(t);
  }, [ready, identity?.id, identity?.role, syncStaff]);

  const loginAdmin = useCallback(
    (password: string): boolean => {
      if (password !== ADMIN_PASSWORD) return false;
      setId({ id: 'admin', name: 'Admin', role: 'admin', approved: true });
      return true;
    },
    [setId],
  );

  const registerStaffAccount = useCallback(
    async (name: string) => {
      const id = uuid();
      const identity: Identity = { id, name: name.trim(), role: 'staff', approved: false };
      await registerStaff(id, identity.name);
      setId(identity);
    },
    [setId],
  );

  const signOut = useCallback(() => {
    setAccessRemoved(false);
    setId(null);
  }, [setId]);

  return {
    ready,
    identity,
    accessRemoved,
    dismissAccessRemoved: () => setAccessRemoved(false),
    loginAdmin,
    registerStaffAccount,
    signOut,
    refreshStaff: syncStaff,
  };
}
