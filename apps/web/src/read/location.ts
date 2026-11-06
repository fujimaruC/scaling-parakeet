import { useEffect, useState } from 'react';
export function readLocation() {
  const u = new URL(location.href),
    parts = u.pathname.split('/').filter(Boolean);
  let taskId: string | null = null;
  try {
    if (parts[0] === 'tasks' && parts[1]) taskId = decodeURIComponent(parts[1]);
  } catch {}
  const pages = [
    'today',
    'tasks',
    'review',
    'calendar',
    'sources',
    'history',
    'inbox',
    'settings',
  ];
  return {
    page: pages.includes(parts[0]) ? parts[0] : 'today',
    taskId,
    sheet: u.searchParams.get('sheet'),
  };
}
export function useLocation() {
  const [route, setRoute] = useState(readLocation);
  useEffect(() => {
    const pop = () => setRoute(readLocation());
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  const go = (path: string, replace = false) => {
    history[replace ? 'replaceState' : 'pushState']({ aos: true }, '', path);
    setRoute(readLocation());
  };
  const back = () =>
    history.state?.aos
      ? history.back()
      : go(route.sheet ? location.pathname : '/tasks', true);
  return { route, go, back };
}
