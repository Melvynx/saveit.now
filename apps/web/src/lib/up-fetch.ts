import { up } from "up-fetch";

export const upfetch = up(fetch, () => ({
  retry: {
    attempts: 3,
    delay: (ctx) => Math.min(1000 * 2 ** ctx.attempt, 5000),
    when: (ctx) => {
      if (ctx.error) {
        return true;
      }
      if (ctx.response && ctx.response.status >= 500) {
        return true;
      }
      if (ctx.response && ctx.response.status === 429) {
        return true;
      }
      return false;
    },
  },
  timeout: 10000,
}));
