document.addEventListener('DOMContentLoaded', function() {
  const header = document.getElementById('navbar');
  const navLogo = document.getElementById('navLogo');
  if (!header || !navLogo) return;

  function onScroll() {
    if (window.scrollY > (window.innerHeight - 50)) {
      header.classList.add('scrolled');
      navLogo.classList.add('show');
    } else {
      header.classList.remove('scrolled');
      navLogo.classList.remove('show');
    }
  }

  // Also hide the large hero logo/button when scrolled past first screen
  const logoButton = document.querySelector('.logo-button');
  function toggleHeroLogo() {
    if (!logoButton) return;
    if (window.scrollY > (window.innerHeight - 50)) {
      logoButton.classList.add('hidden');
    } else {
      logoButton.classList.remove('hidden');
    }
  }

  // call together
  function handleScroll() {
    onScroll();
    toggleHeroLogo();
  }

  onScroll();
  toggleHeroLogo();
  window.addEventListener('scroll', handleScroll, { passive: true });
});
