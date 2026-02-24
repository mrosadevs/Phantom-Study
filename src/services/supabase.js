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
  let q = sb.from('workspaces').select('*').eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
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

export async function updateWorkspace(id, userId, updates) {
  const { data, error } = await sb.from('workspaces')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWorkspaceOrders(userId, orderUpdates) {
  // orderUpdates: [{ id, sort_order }, ...]
  const promises = orderUpdates.map(({ id, sort_order }) =>
    sb.from('workspaces')
      .update({ sort_order })
      .eq('id', id)
      .eq('user_id', userId)
  );
  await Promise.all(promises);
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

// ==================== USER PROFILES ====================

export async function getUserProfile(userId) {
  const { data } = await sb.from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}

export async function upsertUserProfile(userId, updates) {
  const { data, error } = await sb.from('user_profiles')
    .upsert({ user_id: userId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function checkUsernameAvailable(username) {
  const { data } = await sb.from('user_profiles')
    .select('id')
    .ilike('username', username)
    .limit(1);
  return !data || data.length === 0;
}

export async function uploadAvatar(userId, file) {
  const ext = file.name.split('.').pop();
  const path = `${userId}/avatar.${ext}`;
  const { error } = await sb.storage
    .from('avatars')
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: urlData } = sb.storage.from('avatars').getPublicUrl(path);
  return urlData.publicUrl + '?t=' + Date.now();
}

// ==================== COMMUNITY ====================

export async function shareToComm(userId, shareData) {
  const { data, error } = await sb.from('community_shares')
    .insert({ user_id: userId, ...shareData })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCommShares({ sortBy = 'votes', type = null, search = '', limit = 50, offset = 0 } = {}) {
  let q = sb.from('community_shares').select('*');
  if (type) q = q.eq('share_type', type);
  if (search) q = q.ilike('title', `%${search}%`);
  if (sortBy === 'votes') {
    q = q.order('votes_count', { ascending: false }).order('created_at', { ascending: false });
  } else {
    q = q.order('created_at', { ascending: false });
  }
  q = q.range(offset, offset + limit - 1);
  const { data } = await q;
  return data || [];
}

export async function getUserVotes(userId) {
  const { data } = await sb.from('community_votes')
    .select('share_id')
    .eq('user_id', userId);
  return new Set((data || []).map(v => v.share_id));
}

export async function voteComm(userId, shareId) {
  const { error } = await sb.from('community_votes')
    .insert({ user_id: userId, share_id: shareId });
  if (error) throw error;
}

export async function removeVote(userId, shareId) {
  const { error } = await sb.from('community_votes')
    .delete()
    .eq('user_id', userId)
    .eq('share_id', shareId);
  if (error) throw error;
}

export async function deleteShare(shareId, userId) {
  const { error } = await sb.from('community_shares')
    .delete()
    .eq('id', shareId)
    .eq('user_id', userId);
  if (error) throw error;
}
