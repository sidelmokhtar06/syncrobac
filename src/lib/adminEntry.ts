// Hidden admin entry (installed PWA has no address bar to type /admin).
// This is convenience, not security: access is protected by password + two-factor + RLS.
const KEY = 'syncrobac-admin-entry'

export const adminEntryEnabled = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export const enableAdminEntry = () => {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* fine: the gesture still navigates */
  }
}

export const disableAdminEntry = () => {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
