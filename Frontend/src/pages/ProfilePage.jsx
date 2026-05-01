import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateProfile, changePassword } from '../api/users';

const MAX_AVATAR_MB = 2;

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  // ── Name / Avatar tab
  const [name, setName]     = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null); // { text, type }

  // ── Password tab
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwMsg, setPwMsg]           = useState(null);

  const [tab, setTab] = useState('profile'); // 'profile' | 'password'
  const avatarRef = useRef(null);

  // Keep form in sync if user object changes (e.g., after nav)
  useEffect(() => {
    setName(user?.name || '');
    setAvatarPreview(user?.avatar || null);
    setAvatar(user?.avatar || null);
  }, [user]);

  /* ── Avatar picker ─────────────────────────────────────────────────────── */
  const onAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileMsg({ text: 'Please select an image file.', type: 'error' });
      return;
    }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      setProfileMsg({ text: `Image too large — max ${MAX_AVATAR_MB} MB.`, type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
      setAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
    setAvatar(null);
    if (avatarRef.current) avatarRef.current.value = '';
  };

  /* ── Save profile ──────────────────────────────────────────────────────── */
  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setProfileMsg({ text: 'Name cannot be empty.', type: 'error' });
      return;
    }
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const payload = { name: name.trim() };
      // Only send avatar if it changed
      if (avatar !== user?.avatar) payload.avatar = avatar;

      const { data } = await updateProfile(payload);
      updateUser(data);
      setProfileMsg({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      setProfileMsg({ text: err.response?.data?.message || 'Failed to save profile.', type: 'error' });
    } finally {
      setProfileSaving(false);
    }
  };

  /* ── Change password ───────────────────────────────────────────────────── */
  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (newPw.length < 6) {
      setPwMsg({ text: 'New password must be at least 6 characters.', type: 'error' });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ text: 'Passwords do not match.', type: 'error' });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      await changePassword({ currentPassword: currentPw, newPassword: newPw });
      setPwMsg({ text: 'Password changed successfully!', type: 'success' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      setPwMsg({ text: err.response?.data?.message || 'Failed to change password.', type: 'error' });
    } finally {
      setPwSaving(false);
    }
  };

  const isGoogleOnly = !!(user?.avatar && !user?.email?.includes('_')) && !user?.hasPassword;

  /* ── Derived initials ──────────────────────────────────────────────────── */
  const initials = (user?.name || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">

      {/* Navbar */}
      <nav className="border-b border-white/70 bg-white/80 backdrop-blur-md sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Back button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-200">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <span className="font-extrabold tracking-tight text-slate-800 text-lg">PixelBoard</span>
          </div>

          <div className="w-24" /> {/* spacer to center logo */}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Account Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your profile, avatar, and security settings.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">

          {/* ── Left: Avatar card ─────────────────────────────────────────── */}
          <div className="md:w-56 shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center gap-4">
              {/* Avatar */}
              <div className="relative group">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={user?.name}
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ring-4 ring-white shadow-lg">
                    <span className="text-white text-3xl font-bold">{initials}</span>
                  </div>
                )}
                {/* Hover overlay */}
                <button
                  onClick={() => avatarRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                  title="Change photo"
                >
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </button>
              </div>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />

              <div className="text-center">
                <p className="font-semibold text-slate-800 text-sm">{user?.name}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[150px]">{user?.email}</p>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={() => avatarRef.current?.click()}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                  </svg>
                  Upload Photo
                </button>
                {avatarPreview && (
                  <button
                    onClick={removeAvatar}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-500 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    Remove Photo
                  </button>
                )}
              </div>

              <p className="text-[10px] text-slate-400 text-center">JPG, PNG, GIF · Max {MAX_AVATAR_MB} MB</p>
            </div>
          </div>

          {/* ── Right: Tabs ──────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Tab switcher */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 mb-6 w-fit">
              <button
                onClick={() => setTab('profile')}
                className={`px-5 py-2 text-sm font-semibold rounded-lg transition
                  ${tab === 'profile'
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700'}`}
              >
                Profile Info
              </button>
              <button
                onClick={() => setTab('password')}
                className={`px-5 py-2 text-sm font-semibold rounded-lg transition
                  ${tab === 'password'
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700'}`}
              >
                Password
              </button>
            </div>

            {/* ── Profile Info tab ────────────────────────────────────────── */}
            {tab === 'profile' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-base font-bold text-slate-800 mb-5">Profile Information</h2>

                <form onSubmit={handleProfileSave} className="space-y-5">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Display Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={50}
                      placeholder="Your full name"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                    />
                  </div>

                  {/* Email (read-only) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-400 bg-slate-50 cursor-not-allowed pr-24"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                        Read-only
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Email cannot be changed.</p>
                  </div>

                  {/* Feedback */}
                  {profileMsg && (
                    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium
                      ${profileMsg.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-red-50 border-red-200 text-red-600'}`}>
                      {profileMsg.type === 'success'
                        ? <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        : <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01"/></svg>
                      }
                      {profileMsg.text}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-sm shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {profileSaving ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                          Saving…
                        </>
                      ) : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ── Password tab ────────────────────────────────────────────── */}
            {tab === 'password' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-base font-bold text-slate-800 mb-1">Change Password</h2>
                <p className="text-xs text-slate-500 mb-5">
                  {isGoogleOnly
                    ? 'You signed in with Google. Password change is not available for OAuth-only accounts.'
                    : 'Choose a strong password of at least 6 characters.'}
                </p>

                {isGoogleOnly ? (
                  <div className="flex items-center gap-3 px-4 py-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p className="text-sm text-amber-700">Your account uses Google Sign-In. Password management is handled by Google.</p>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordSave} className="space-y-4">
                    {/* Current password */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrent ? 'text' : 'password'}
                          value={currentPw}
                          onChange={(e) => setCurrentPw(e.target.value)}
                          placeholder="Enter current password"
                          required
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400
                                     focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition pr-10"
                        />
                        <button type="button" tabIndex={-1}
                          onClick={() => setShowCurrent(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                          {showCurrent
                            ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                          }
                        </button>
                      </div>
                    </div>

                    {/* New password */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">New Password</label>
                      <div className="relative">
                        <input
                          type={showNew ? 'text' : 'password'}
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                          placeholder="At least 6 characters"
                          required
                          minLength={6}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400
                                     focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition pr-10"
                        />
                        <button type="button" tabIndex={-1}
                          onClick={() => setShowNew(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                          {showNew
                            ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                          }
                        </button>
                      </div>
                      {/* Strength indicator */}
                      {newPw.length > 0 && (
                        <div className="mt-1.5 flex gap-1">
                          {[1,2,3,4].map(i => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                              newPw.length >= i * 3
                                ? i <= 1 ? 'bg-red-400' : i <= 2 ? 'bg-amber-400' : i <= 3 ? 'bg-blue-400' : 'bg-emerald-400'
                                : 'bg-slate-200'
                            }`} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Confirm password */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        placeholder="Repeat new password"
                        required
                        className={`w-full px-4 py-2.5 border rounded-xl text-sm text-slate-800 placeholder-slate-400
                                   focus:outline-none focus:ring-2 focus:border-blue-400 transition
                                   ${confirmPw && confirmPw !== newPw
                                     ? 'border-red-300 focus:ring-red-500/20'
                                     : 'border-slate-200 focus:ring-blue-500/20'}`}
                      />
                      {confirmPw && confirmPw !== newPw && (
                        <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                      )}
                    </div>

                    {/* Feedback */}
                    {pwMsg && (
                      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium
                        ${pwMsg.type === 'success'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-red-50 border-red-200 text-red-600'}`}>
                        {pwMsg.type === 'success'
                          ? <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                          : <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01"/></svg>
                        }
                        {pwMsg.text}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={pwSaving || !currentPw || !newPw || !confirmPw}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-sm shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {pwSaving ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                            </svg>
                            Saving…
                          </>
                        ) : 'Change Password'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
