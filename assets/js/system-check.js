(function () {
  const scriptStatus = document.getElementById('js-check');
  const imageStatus = document.getElementById('img-check');
  const securityConfigStatus = document.getElementById('security-config-check');
  const quoteApiStatus = document.getElementById('quote-api-check');
  const image = document.querySelector('[data-system-check-image]');

  if (scriptStatus) scriptStatus.textContent = 'JavaScript loaded successfully';
  if (!image || !imageStatus) return;

  const reportImageState = () => {
    imageStatus.textContent = image.naturalWidth
      ? 'Image loaded successfully'
      : 'IMAGE FAILED — assets/images/site/logo.jpg is missing';
  };

  image.addEventListener('load', reportImageState);
  image.addEventListener('error', reportImageState);
  if (image.complete) reportImageState();

  async function checkServerlessApi() {
    try {
      const response = await fetch('/api/security-config', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const config = response.ok ? await response.json() : null;
      if (!response.ok || typeof config?.turnstileEnabled !== 'boolean') {
        throw new Error('Unexpected security-config response.');
      }
      if (securityConfigStatus) {
        securityConfigStatus.textContent = 'Security config API loaded successfully';
      }
    } catch {
      if (securityConfigStatus) securityConfigStatus.textContent = 'SECURITY CONFIG API FAILED';
    }

    try {
      const response = await fetch('/api/quote', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (response.status !== 405) throw new Error('Unexpected quote API response.');
      if (quoteApiStatus) quoteApiStatus.textContent = 'Quote API method guard loaded successfully';
    } catch {
      if (quoteApiStatus) quoteApiStatus.textContent = 'QUOTE API FAILED';
    }
  }

  void checkServerlessApi();
})();
