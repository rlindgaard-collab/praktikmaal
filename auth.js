import { supabase } from './supabase.js';

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    (async () => {
      await callback(event, session);
    })();
  });
  return subscription;
}

export async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  return { data, error };
}

export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
}

export async function verifySupervisorCode(code) {
  const { data, error } = await supabase
    .from('supervisor_codes')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  return { isValid: !!data && !error, error };
}

export async function createSupervisorSession(userId) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 8);

  const { data, error } = await supabase
    .from('supervisor_sessions')
    .upsert({
      user_id: userId,
      expires_at: expiresAt.toISOString()
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  return { data, error };
}
