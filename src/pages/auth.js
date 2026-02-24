import { signInWithEmail, signUpWithEmail, signOut, checkUsernameAvailable } from '../services/supabase.js';
import { showPage, toast } from '../utils/helpers.js';
import { onLogin } from './dashboard.js';
import { validateUsername } from '../utils/profanity.js';

export function initAuth() {
  // Tab switching
  document.getElementById('tabLogin')?.addEventListener('click', () => switchTab('login'));
  document.getElementById('tabSignup')?.addEventListener('click', () => switchTab('signup'));

  // Login
  document.getElementById('btnLogin')?.addEventListener('click', handleLogin);

  // Signup
  document.getElementById('btnSignup')?.addEventListener('click', handleSignup);

  // Back to home
  document.getElementById('backToHome')?.addEventListener('click', () => showPage('landing'));

  // Live username validation on signup
  let usernameTimeout;
  document.getElementById('signupUsername')?.addEventListener('input', () => {
    clearTimeout(usernameTimeout);
    usernameTimeout = setTimeout(async () => {
      const username = document.getElementById('signupUsername').value.trim();
      const hint = document.getElementById('signupUsernameHint');
      if (!username) { hint.textContent = ''; hint.className = 'profile-username-hint'; return; }
      const { valid, error } = validateUsername(username);
      if (!valid) { hint.textContent = error; hint.className = 'profile-username-hint error'; return; }
      const available = await checkUsernameAvailable(username);
      if (available) {
        hint.textContent = 'Available!';
        hint.className = 'profile-username-hint success';
      } else {
        hint.textContent = 'Username taken';
        hint.className = 'profile-username-hint error';
      }
    }, 400);
  });

  // Enter key on login page
  document.addEventListener('keydown', e => {
    const pg = document.querySelector('.page.active')?.id;
    if (pg === 'page-login' && e.key === 'Enter') {
      const isLogin = document.getElementById('tabLogin').classList.contains('active');
      isLogin ? handleLogin() : handleSignup();
    }
  });
}

function switchTab(tab) {
  document.getElementById('formLogin').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('formSignup').style.display = tab === 'signup' ? 'block' : 'none';
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabSignup').classList.toggle('active', tab === 'signup');
  document.getElementById('authError').textContent = '';
}

async function handleLogin() {
  const em = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPassword').value;
  if (!em || !pw) { setAuthErr('Fill in all fields'); return; }

  setBtnLoad('btnLogin', 'loginBtnText', true, 'login');
  try {
    const user = await signInWithEmail(em, pw);
    onLogin(user);
  } catch (error) {
    setAuthErr(error.message);
  }
  setBtnLoad('btnLogin', 'loginBtnText', false, 'login');
}

async function handleSignup() {
  const username = document.getElementById('signupUsername').value.trim();
  const em = document.getElementById('signupEmail').value.trim();
  const pw = document.getElementById('signupPassword').value;
  if (!username || !em || !pw) { setAuthErr('Fill in all fields'); return; }
  if (pw.length < 6) { setAuthErr('Password must be 6+ characters'); return; }

  // Validate username
  const { valid, error } = validateUsername(username);
  if (!valid) { setAuthErr(error); return; }

  // Check username availability
  const available = await checkUsernameAvailable(username);
  if (!available) { setAuthErr('Username is already taken'); return; }

  setBtnLoad('btnSignup', 'signupBtnText', true, 'signup');
  try {
    await signUpWithEmail(em, pw);
    // Store username for after email confirmation + first login
    localStorage.setItem('phantom-pending-username', username);
    toast('Check your email to confirm your account!', 'success');
    switchTab('login');
  } catch (error) {
    setAuthErr(error.message);
  }
  setBtnLoad('btnSignup', 'signupBtnText', false, 'signup');
}

export async function handleLogout() {
  await signOut();
  window._phantomUser = null;
  showPage('landing');
}

function setAuthErr(m) {
  document.getElementById('authError').textContent = m;
}

function setBtnLoad(bid, tid, on, type) {
  document.getElementById(bid).disabled = on;
  document.getElementById(tid).innerHTML = on
    ? '<span class="spinner"></span>'
    : (type === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT');
}
