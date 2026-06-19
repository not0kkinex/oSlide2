const ThemeManager = {
  current: 'dark',
  systemDark: false,

  init(theme) {
    this.systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.systemDark = e.matches;
      if (this.current === 'system') this.apply();
    });
    this.current = theme || 'dark';
    this.apply();
  },

  apply() {
    const theme = this.current === 'system'
      ? (this.systemDark ? 'dark' : 'light')
      : this.current;
    this._setCSS(theme);
    document.documentElement.setAttribute('data-theme', this.current);
  },

  _setCSS(theme) {
    // Clear legacy inline styles
    const vars = ['--bg', '--surface', '--surface2', '--surface3', '--border', '--text', '--text2', '--bg-app', '--bg-surface', '--bg-elevated', '--bg-input', '--border-subtle', '--border-default', '--text-primary', '--text-muted', '--text-hint', '--bg-primary', '--bg-secondary', '--bg-tertiary', '--text-dim'];
    vars.forEach(v => document.documentElement.style.removeProperty(v));
    
    // Set actual active theme attribute (resolved system theme)
    document.documentElement.setAttribute('data-active-theme', theme);
  },

  setTheme(theme) {
    this.current = theme;
    this.apply();
  },

  getTheme() {
    return this.current;
  }
};

window.ThemeManager = ThemeManager;
