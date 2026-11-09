import { test as base } from '@playwright/test';
export const test = base.extend<{ requestWindow: void }>({
  requestWindow: [
    async ({ request }, use) => {
      const response = await request.post('/__synthetic/request-window');
      if (response.status() !== 204)
        throw Error('SYNTHETIC_REQUEST_WINDOW_UNAVAILABLE');
      await use();
    },
    { auto: true },
  ],
});
