// Applies the saved theme before first paint (no flash). External file: the CSP forbids inline scripts.
try {
  var t = localStorage.getItem('syncrobac-theme') || 'system'
  if (t === 'system') t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  document.documentElement.dataset.theme = t
} catch (e) {
  document.documentElement.dataset.theme = 'dark'
}
