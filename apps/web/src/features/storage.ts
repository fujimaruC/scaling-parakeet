// Structured owner data only. Every connection closes at transaction completion.
export function privateStore(
  key: string,
  value?: unknown,
  valid: () => boolean = () => true,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('academic-os-private', 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore('snapshot');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (!valid()) {
        db.close();
        resolve(null);
        return;
      }
      const tx = db.transaction(
        'snapshot',
        value === undefined ? 'readonly' : 'readwrite',
      );
      const r =
        value === undefined
          ? tx.objectStore('snapshot').get(key)
          : tx.objectStore('snapshot').put(value, key);
      tx.oncomplete = () => {
        db.close();
        resolve(value === undefined ? r.result : value);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error);
      };
    };
  });
}
export type WritePlan = {
  id: string;
  path: string;
  method: string;
  value: any;
  headers: Record<string, string>;
  label: string;
  taskId?: string;
  patch?: any;
};
export function plan(
  path: string,
  method: string,
  value: any,
  label: string,
  headers: Record<string, string> = {},
  taskId?: string,
  patch?: any,
): WritePlan {
  const id = crypto.randomUUID();
  return {
    id,
    path,
    method,
    value: JSON.parse(JSON.stringify(value)),
    label,
    headers: { ...headers, 'Idempotency-Key': id },
    taskId,
    patch,
  };
}
export function updatePrivate(
  key: string,
  change: (value: any) => any,
  valid: () => boolean = () => true,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('academic-os-private', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('snapshot');
    r.onerror = () => reject(r.error);
    r.onsuccess = () => {
      const db = r.result;
      if (!valid()) {
        db.close();
        resolve(null);
        return;
      }
      const tx = db.transaction('snapshot', 'readwrite'),
        store = tx.objectStore('snapshot'),
        read = store.get(key);
      let value: any;
      read.onsuccess = () => {
        if (valid()) {
          value = change(read.result);
          store.put(value, key);
        }
      };
      tx.oncomplete = () => {
        db.close();
        resolve(value);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error);
      };
    };
  });
}
