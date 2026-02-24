import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nrxbhztsnronndnaytso.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yeGJoenRzbnJvbm5kbmF5dHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NzQ1NDYsImV4cCI6MjA4NzQ1MDU0Nn0.IJ02JYWn4utsuTsPs-Lc6kHo2MzP_6QgTMI1dfLXiPM';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== AUTH ====================

export async function signInWithEmail(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signUpWithEmail(email, password) {
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await sb.auth.signOut();
}

// Persist "sample workspace created" flag across all browsers via user metadata
export async function markSampleCreated() {
  await sb.auth.updateUser({ data: { sample_created: true } });
}

export async function getSession() {
  const { data: { session } } = await sb.auth.getSession();
  return session;
}

export function onAuthStateChange(callback) {
  return sb.auth.onAuthStateChange(callback);
}

// ==================== DATABASE ====================

export async function getWorkspaces(userId, parentId = null) {
  let q = sb.from('workspaces').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  q = parentId === null ? q.is('parent_id', null) : q.eq('parent_id', parentId);
  const { data } = await q;
  return data || [];
}

export async function createWorkspace(name, emoji, desc, parentId, userId) {
  const { data, error } = await sb.from('workspaces').insert({
    name, emoji, description: desc, parent_id: parentId || null, user_id: userId
  }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteWorkspace(id, userId) {
  await sb.from('workspaces').delete().eq('id', id).eq('user_id', userId);
}

export async function getWorkspaceById(id) {
  const { data } = await sb.from('workspaces').select('*').eq('id', id).single();
  return data;
}

export async function getModuleData(modId, userId) {
  const { data } = await sb.from('module_data').select('*').eq('module_id', modId).eq('user_id', userId).single();
  return data;
}

export async function saveModuleData(modId, userId, flashcards, quiz, fillin) {
  const existing = await getModuleData(modId, userId);
  if (existing) {
    await sb.from('module_data').update({ flashcards, quiz, fillin }).eq('module_id', modId).eq('user_id', userId);
  } else {
    await sb.from('module_data').insert({ module_id: modId, user_id: userId, flashcards, quiz, fillin });
  }
}
