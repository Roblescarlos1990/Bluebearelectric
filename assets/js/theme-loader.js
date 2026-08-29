(() => {
  const saved = localStorage.getItem('blueBearTheme');
  if (!saved) return;
  try {
    const theme = JSON.parse(saved);
    Object.entries(theme).forEach(([key, value]) => {
      if (value) document.documentElement.style.setProperty(`--${key}`, value);
    });
  } catch (error) {
    console.warn('Could not load saved Blue Bear theme.', error);
  }
})();
