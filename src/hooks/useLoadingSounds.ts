import { useEffect, useState } from 'react';

import { engine } from '../audio/engine';

/** Ids of sounds whose audio is currently being decoded. */
export function useLoadingSounds(): ReadonlySet<string> {
  const [loading, setLoading] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => engine.onLoadingChange(setLoading), []);
  return loading;
}
