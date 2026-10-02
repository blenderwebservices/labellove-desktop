/**
 * LabelLove - Instant Theme Initializer (Anti-FOUC)
 * Executes immediately in <head> to prevent theme flash before stylesheet/app mounts.
 */
(function() {
  try {
    var pref = localStorage.getItem('labellove_theme_preference') || 'system';
    var theme = pref;
    if (pref === 'system') {
      theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme-preference', pref);
  } catch(e) {}
})();
