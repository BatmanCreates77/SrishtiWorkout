/** "test" on the test deployment (Vercel Preview, branch `test`); unset in production. */
export const IS_TEST = process.env.NEXT_PUBLIC_APP_ENV === "test";
