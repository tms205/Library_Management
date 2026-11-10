import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../utils/errors';
export default function useResource(loader) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setState((old) => ({ ...old, loading: true, error: '' }));
      return loader();
    }).then((data) => { if (active) setState({ data, loading: false, error: '' }); })
      .catch((error) => { if (active) setState({ data: null, loading: false, error: errorMessage(error) }); });
    return () => { active = false; };
  }, [loader, revision]);
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  return { ...state, reload };
}
