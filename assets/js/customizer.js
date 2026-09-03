(() => {
  const form = document.querySelector('#themeForm');
  if (!form) return;
  const output = document.querySelector('#cssOutput');
  const defaults = {
    yellow: '#ffc400',
    blue2: '#0d8bff',
    bg: '#050b14',
    panel: '#0b1a2e',
    'button-radius': '12px',
    'card-radius': '20px',
    'section-space': '70px',
  };
  const units = { 'button-radius': 'px', 'card-radius': 'px', 'section-space': 'px' };
  const read = () =>
    Object.fromEntries(
      [...new FormData(form).entries()].map(([k, v]) => [k, units[k] ? `${v}${units[k]}` : v]),
    );
  const apply = (theme) => {
    Object.entries(theme).forEach(([k, v]) =>
      document.documentElement.style.setProperty(`--${k}`, v),
    );
    output.value =
      ':root{\n' +
      Object.entries(theme)
        .map(([k, v]) => `  --${k}:${v};`)
        .join('\n') +
      '\n}';
  };
  form.addEventListener('input', (e) => {
    const theme = read();
    apply(theme);
    const label = document.querySelector(`[data-value="${e.target.name}"]`);
    if (label) label.textContent = theme[e.target.name];
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const theme = read();
    localStorage.setItem('blueBearTheme', JSON.stringify(theme));
    apply(theme);
    alert('Preview theme saved in this browser. Copy the CSS to theme.css to publish it.');
  });
  document.querySelector('#resetTheme').addEventListener('click', () => {
    localStorage.removeItem('blueBearTheme');
    Object.entries(defaults).forEach(([k, v]) =>
      document.documentElement.style.setProperty(`--${k}`, v),
    );
    location.reload();
  });
  document.querySelector('#copyCss').addEventListener('click', async () => {
    await navigator.clipboard.writeText(output.value);
    alert('CSS copied.');
  });
  const saved = localStorage.getItem('blueBearTheme');
  apply(saved ? JSON.parse(saved) : defaults);
})();
