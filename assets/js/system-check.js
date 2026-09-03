(function () {
  const scriptStatus = document.getElementById('js-check');
  const imageStatus = document.getElementById('img-check');
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
})();
