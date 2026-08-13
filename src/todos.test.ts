import { mergeByUpdatedAt } from './todos';

type Row = { id: string; updatedAt?: string; v: number };

describe('mergeByUpdatedAt', () => {
  it('keeps the row with the newer updatedAt', () => {
    const local: Row[] = [{ id: 'a', updatedAt: '2026-01-01T00:00:00Z', v: 1 }];
    const remote: Row[] = [{ id: 'a', updatedAt: '2026-01-02T00:00:00Z', v: 2 }];
    expect(mergeByUpdatedAt(local, remote)).toEqual([{ id: 'a', updatedAt: '2026-01-02T00:00:00Z', v: 2 }]);
  });

  it('keeps the local row when it is newer than remote', () => {
    const local: Row[] = [{ id: 'a', updatedAt: '2026-01-03T00:00:00Z', v: 9 }];
    const remote: Row[] = [{ id: 'a', updatedAt: '2026-01-02T00:00:00Z', v: 2 }];
    expect(mergeByUpdatedAt(local, remote)[0].v).toBe(9);
  });

  it('unions rows that only exist on one side', () => {
    const local: Row[] = [{ id: 'a', updatedAt: '2026-01-01T00:00:00Z', v: 1 }];
    const remote: Row[] = [{ id: 'b', updatedAt: '2026-01-01T00:00:00Z', v: 2 }];
    const out = mergeByUpdatedAt(local, remote);
    expect(out.map((r) => r.id).sort()).toEqual(['a', 'b']);
  });

  it('treats a missing updatedAt as oldest, so a stamped remote row wins', () => {
    const local: Row[] = [{ id: 'a', v: 1 }];
    const remote: Row[] = [{ id: 'a', updatedAt: '2026-01-01T00:00:00Z', v: 2 }];
    expect(mergeByUpdatedAt(local, remote)[0].v).toBe(2);
  });
});
