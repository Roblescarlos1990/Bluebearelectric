const supabaseCdn = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

export async function mockPortalSupabase(page, options = {}) {
  const initialState = JSON.stringify({
    user: options.user || null,
    employeeProfile: options.employeeProfile || null,
  });

  await page.route(supabaseCdn, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `(() => {
        const state = ${initialState};
        const listeners = [];
        const count = (name) => {
          const key = 'phase7:' + name;
          sessionStorage.setItem(key, String(Number(sessionStorage.getItem(key) || 0) + 1));
        };
        const query = (table) => {
          const result = () => ({
            data: table === 'employee_users' ? state.employeeProfile : [],
            error: null,
            count: 0,
          });
          const builder = {
            select: () => builder,
            eq: () => builder,
            order: () => builder,
            limit: () => builder,
            maybeSingle: async () => result(),
            single: async () => result(),
            insert: () => builder,
            update: () => builder,
            delete: () => builder,
            upsert: () => builder,
            then: (resolve, reject) => Promise.resolve(result()).then(resolve, reject),
          };
          return builder;
        };
        const auth = {
          getUser: async () => ({ data: { user: state.user }, error: null }),
          getSession: async () => ({
            data: { session: state.user ? { user: state.user } : null },
            error: null,
          }),
          signInWithPassword: async ({ email }) => {
            count('signIn');
            state.user = { id: 'phase-7-user', email };
            for (const listener of listeners) listener('SIGNED_IN', { user: state.user });
            return { data: { user: state.user, session: { user: state.user } }, error: null };
          },
          signOut: async () => {
            count('signOut');
            state.user = null;
            for (const listener of listeners) listener('SIGNED_OUT', null);
            return { error: null };
          },
          signUp: async () => ({ data: {}, error: null }),
          resetPasswordForEmail: async () => ({ data: {}, error: null }),
          updateUser: async ({ password }) => {
            count('updateUser');
            sessionStorage.setItem('phase7:lastPasswordLength', String(password.length));
            return { data: { user: state.user }, error: null };
          },
          onAuthStateChange: (listener) => {
            listeners.push(listener);
            return { data: { subscription: { unsubscribe() {} } } };
          },
        };
        const client = {
          auth,
          from: query,
          storage: {
            from: () => ({
              createSignedUrl: async () => ({ data: { signedUrl: 'about:blank' }, error: null }),
              getPublicUrl: () => ({ data: { publicUrl: 'about:blank' } }),
              upload: async () => ({ data: {}, error: null }),
              remove: async () => ({ data: {}, error: null }),
            }),
          },
        };
        window.supabase = { createClient: () => client };
      })();`,
    });
  });
}
