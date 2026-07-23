/* ============================================================
   Bayraktar TB2 — Hash-Based SPA Router
   ============================================================ */

const Router = (() => {
  const pages = [
    { id: 'overview',    hash: '#overview',    label: 'Overview' },
    { id: 'model',       hash: '#model',       label: 'Aircraft Model' },
    { id: 'electronics', hash: '#electronics', label: 'Electronics' },
    { id: 'materials',   hash: '#materials',   label: 'Materials' },
    { id: 'performance', hash: '#performance', label: 'Performance' },
    { id: 'budget',      hash: '#budget',      label: 'Budget' },
    { id: 'airfoil',     hash: '#airfoil',     label: 'Airfoil Sim' },
    { id: 'flight-sim',  hash: '#flight-sim',  label: 'Flight Controls' }
  ];

  let _onNavigate = null;

  function navigate(hash) {
    const page = pages.find(p => p.hash === hash) || pages[0];

    // Hide all pages
    document.querySelectorAll('.page-section').forEach(s => {
      s.classList.remove('page-active');
    });

    // Show target page
    const target = document.getElementById('page-' + page.id);
    if (target) target.classList.add('page-active');

    // Update nav active state
    document.querySelectorAll('.nav-link').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === page.hash);
    });

    if (_onNavigate) _onNavigate(page);
  }

  function init(onNavigate) {
    _onNavigate = onNavigate;
    window.addEventListener('hashchange', () => navigate(location.hash));
    // Initial route
    if (!location.hash) location.hash = '#overview';
    else navigate(location.hash);
  }

  return { pages, init, navigate };
})();
