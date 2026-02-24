import { signInWithEmail, signUpWithEmail, signInWithGoogle, signOut } from '../services/supabase.js';
import { showPage, toast } from '../utils/helpers.js';
import { onLogin } from './dashboard.js';

export function initAuth() {
  // Tab switching
  document.getElementById('tabLogin')?.addEventListener('click', () => switchTab('login'));
  document.getElementById('tabSignup')?.addEventListener('click', () => switchTab('signup'));

  // Login
  document.getElementById('btnLogin')?.addEventListener('click', handleLogin);

  // Signup
  document.getElementById('btnSignup')?.addEventListener('click', handleSignup);

  // Google OAuth
  document.getElementById('btnGoogleAuth')?.addEventListener('click', handleGoogleAuth);

  // Back to home
  document.getElementById('backToHome')?.addEventListener('click', () => showPage('landing'));

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
  const em = document.getElementById('signupEmail').value.trim();
  const pw = document.getElementById('signupPassword').value;
  if (!em || !pw) { setAuthErr('Fill in all fields'); return; }
  if (pw.length < 6) { setAuthErr('Password must be 6+ characters'); return; }

  setBtnLoad('btnSignup', 'signupBtnText', true, 'signup');
  try {
    await signUpWithEmail(em, pw);
    toast('Check your email to confirm your account!', 'success');
    switchTab('login');
  } catch (error) {
    setAuthErr(error.message);
  }
  setBtnLoad('btnSignup', 'signupBtnText', false, 'signup');
}

async function handleGoogleAuth() {
  try {
    await signInWithGoogle();
    // OAuth redirects — the onAuthStateChange callback handles the rest
  } catch (error) {
    setAuthErr(error.message);
  }
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
