import { getUserProfile, upsertUserProfile, checkUsernameAvailable, uploadAvatar } from '../services/supabase.js';
import { toast } from '../utils/helpers.js';
import { validateUsername } from '../utils/profanity.js';

let currentProfile = null;
let isFirstTimeSetup = false;

export function initProfile() {
  document.getElementById('modalProfileClose')?.addEventListener('click', closeProfileModal);

  document.getElementById('modalProfile')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalProfile') closeProfileModal();
  });

  document.getElementById('btnSaveProfile')?.addEventListener('click', saveProfile);
  document.getElementById('profileAvatarInput')?.addEventListener('change', handleAvatarChange);
  document.getElementById('profileUsername')?.addEventListener('input', debounceValidateUsername);
}

function closeProfileModal() {
  // If first-time setup, require at least a username
  if (isFirstTimeSetup) {
    const username = document.getElementById('profileUsername').value.trim();
    if (!username) {
      toast('Please choose a username first!', 'error');
      return;
    }
    // Let them close if they've already saved a username
    if (!currentProfile?.username) {
      toast('Please save your profile first!', 'error');
      return;
    }
  }
  document.getElementById('modalProfile').classList.remove('open');
  isFirstTimeSetup = false;
}

export async function openProfileModal(firstTime = false) {
  const user = window._phantomUser;
  if (!user) return;

  isFirstTimeSetup = firstTime;

  document.getElementById('profileEmail').textContent = user.email;

  // Load profile
  try {
    currentProfile = await getUserProfile(user.id);
  } catch (e) {
    currentProfile = null;
  }

  // Check for pending username from signup
  const pendingUsername = localStorage.getItem('phantom-pending-username');
  if (pendingUsername && !currentProfile?.username) {
    document.getElementById('profileUsername').value = pendingUsername;
  } else {
    document.getElementById('profileUsername').value = currentProfile?.username || '';
  }

  const preview = document.getElementById('profileAvatarPreview');
  if (currentProfile?.avatar_url) {
    preview.innerHTML = `<img src="${currentProfile.avatar_url}" alt="Avatar">`;
  } else {
    preview.innerHTML = '<span class="profile-avatar-placeholder">?</span>';
  }

  // Update modal title for first-time setup
  const title = document.querySelector('#modalProfile .modal-title');
  if (title) {
    title.textContent = firstTime ? 'SET UP YOUR PROFILE' : 'YOUR PROFILE';
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

  if (!username) {
    toast('Username is required', 'error');
    return;
  }

  const { valid, error } = validateUsername(username);
  if (!valid) { toast(error, 'error'); return; }

  if (currentProfile?.username?.toLowerCase() !== username.toLowerCase()) {
    const available = await checkUsernameAvailable(username);
    if (!available) { toast('Username taken', 'error'); return; }
  }

  try {
    await upsertUserProfile(window._phantomUser.id, {
      username: username || null
    });
    currentProfile = { ...currentProfile, username };
    updateNavDisplay(username);

    // Clear pending username from signup
    localStorage.removeItem('phantom-pending-username');

    document.getElementById('modalProfile').classList.remove('open');
    isFirstTimeSetup = false;
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

  // Return whether profile setup is needed
  return !currentProfile?.username;
}
