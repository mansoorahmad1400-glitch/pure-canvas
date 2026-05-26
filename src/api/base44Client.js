// Base44 SDK has been retired from this app. This stub preserves the import
// surface used by legacy components/pages so nothing has to be deleted in one
// pass, while preventing the SDK from initializing (which previously fired
// background analytics requests that 404'd after the backend was removed and
// caused noisy unhandled promise rejections on browser resume/sleep).
//
// All methods are safe no-ops. Real auth lives in src/lib/AuthContext.jsx via
// Supabase. Real data lives in src/lib/studio/api.js.

const notImplemented = (name) => {
  if (typeof console !== 'undefined') {
    console.warn(`[base44 stub] ${name} called — Base44 SDK is retired. Use Supabase APIs instead.`);
  }
};

const asyncNoop = (label, value = null) => async () => {
  notImplemented(label);
  return value;
};

const entityStub = (name) => ({
  list: asyncNoop(`${name}.list`, []),
  filter: asyncNoop(`${name}.filter`, []),
  get: asyncNoop(`${name}.get`, null),
  create: asyncNoop(`${name}.create`, null),
  update: asyncNoop(`${name}.update`, null),
  delete: asyncNoop(`${name}.delete`, null),
  bulkCreate: asyncNoop(`${name}.bulkCreate`, []),
});

const entityProxy = new Proxy({}, {
  get: (_t, prop) => entityStub(String(prop)),
});

export const base44 = {
  auth: {
    me: asyncNoop('auth.me', null),
    updateMe: asyncNoop('auth.updateMe', null),
    logout: () => {
      // Defer to Supabase via AuthContext.logout() — callers should migrate.
      if (typeof window !== 'undefined') window.location.href = '/login';
    },
    redirectToLogin: () => {
      if (typeof window !== 'undefined') window.location.href = '/login';
    },
    isAuthenticated: () => false,
  },
  entities: entityProxy,
  functions: {
    invoke: async () => {
      notImplemented('functions.invoke');
      return { data: null, error: null };
    },
  },
};

export default base44;
