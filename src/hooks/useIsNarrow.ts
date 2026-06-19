import { useEffect, useState } from 'react';

/** true quando a largura da janela é menor que `maxPx` (reage a resize). */
export function useIsNarrow(maxPx = 768): boolean {
  const [narrow, setNarrow] = useState(
    typeof window !== 'undefined' ? window.innerWidth < maxPx : false,
  );
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < maxPx);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [maxPx]);
  return narrow;
}
