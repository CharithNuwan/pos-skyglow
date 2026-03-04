'use client';
export default function MobileNav() {
  function toggle() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('active');
  }
  return (
    <button className="sidebar-toggle-btn" onClick={toggle} aria-label="Menu">
      <i className="bi bi-list" style={{ fontSize: '1.4rem' }} />
    </button>
  );
}
