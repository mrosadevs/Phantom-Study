import { getUserProfile, upsertUserProfile, checkUsernameAvailable, uploadAvatar } from '../services/supabase.js';
import { toast } from '../utils/helpers.js';
import { validateUsername } from '../utils/profanity.js';

let currentProfile = null;

export function initProfile() {
  document.getElementById('modalProfileClose')?.addEventListener('click', () => {
    document.getElementById('modalProfile').classList.remove('open');
  });

  document.getElementById('modalProfile')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalProfile') {
      document.getElementById('modalProfile').classList.remove('open');
    }
  });

  document.getElementById('btnSaveProfile')?.addEventListener('click', saveProfile);
  document.getElementById('profileAvatarInput')?.addEventListener('change', handleAvatarChange);
  document.getElementById('profileUsername')?.addEventListener('input', debounceValidateUsername);
}

export async function openProfileModal() {
  const user = window._phantomUser;
  if (!user) return;

  document.getElementById('profileEmail').textContent = user.email;

  // Load profile
  try {
    currentProfile = await getUserProfile(user.id);
  } catch (e) {
    currentProfile = null;
  }
  document.getElementById('profileUsername').value = currentProfile?.username || '';

  const preview = document.getElementById('profileAvatarPreview');
  if (currentProfile?.avatar_url) {
    preview.innerHTML = `<img src="${currentProfile.avatar_url}" alt="Avatar">`;
  } else {
    preview.innerHTML = '<span class="profile-avatar-placeholder">?</span>';
  }

  document.getElementById('profileUsernameHint').textContent = '';
  document.getElementById('profileUsernameHint').className = 'profile-username-hint';
  document.getElementById('modalProfile').classList.add('open');
}

let validateTimeout;
function debounceValidateUsername() {
  clearTimeout(validateTimeout);
  validateTimeout = setTimeout(async () => {
    const username = document.getElementById('profileUsername').value.trim();
    const hint = document.getElementById('profileUsernameHint');

    if (!username) {
      hint.textContent = '';
      hint.className = 'profile-username-hint';
      return;
    }

    const { valid, error } = validateUsername(username);
    if (!valid) {
      hint.textContent = error;
      hint.className = 'profile-username-hint error';
      return;
    }

    // Check if same as current
    if (currentProfile?.username?.toLowerCase() === username.toLowerCase()) {
      hint.textContent = 'Your current username';
      hint.className = 'profile-username-hint success';
      return;
    }

    const available = await checkUsernameAvailable(username);
    if (available) {
      hint.textContent = 'Available!';
      hint.className = 'profile-username-hint success';
    } else {
      hint.textContent = 'Username taken';
      hint.className = 'profile-username-hint error';
    }
  }, 400);
}

async function handleAvatarChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    toast('Image too large (max 2MB)', 'error');
    return;
  }

  try {
    toast('Uploading photo...', 'info');
    const url = await uploadAvatar(window._phantomUser.id, file);
    await upsertUserProfile(window._phantomUser.id, { avatar_url: url });

    document.getElementById('profileAvatarPreview').innerHTML =
      `<img src="${url}" alt="Avatar">`;

    updateNavAvatar(url);
    currentProfile = { ...currentProfile, avatar_url: url };
    toast('Photo updated!', 'success');
  } catch (err) {
    toast('Upload failed: ' + err.message, 'error');
  }
}

async function saveProfile() {
  const username = document.getElementById('profileUsername').value.trim();

  if (username) {
    const { valid, error } = validateUsername(username);
    if (!valid) { toast(error, 'error'); return; }

    if (currentProfile?.username?.toLowerCase() !== username.toLowerCase()) {
      const available = await checkUsernameAvailable(username);
      if (!available) { toast('Username taken', 'error'); return; }
    }
  }

  try {
    await upsertUserProfile(window._phantomUser.id, {
      username: username || null
    });
    currentProfile = { ...currentProfile, username };
    updateNavDisplay(username);
    document.getElementById('modalProfile').classList.remove('open');
    toast('Profile saved!', 'success');
  } catch (err) {
    toast('Save failed: ' + err.message, 'error');
  }
}

export function updateNavDisplay(username) {
  const display = username || window._phantomUser?.email || '';
  document.querySelectorAll('.nav-user').forEach(el => {
    el.textContent = display;
  });
}

export function updateNavAvatar(url) {
  document.querySelectorAll('.nav-avatar').forEach(el => {
    if (url) {
      el.innerHTML = `<img src="${url}" alt="">`;
    }
  });
}

export function getProfile() { return currentProfile; }

export async function loadProfileForNav(userId) {
  try {
    currentProfile = await getUserProfile(userId);
    if (currentProfile?.username) updateNavDisplay(currentProfile.username);
    if (currentProfile?.avatar_url) updateNavAvatar(currentProfile.avatar_url);
  } catch (e) { /* ignore */ }
}
