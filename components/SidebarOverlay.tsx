'use client';
export default function SidebarOverlay() {
  function close() {
    document.querySelector('.sidebar')?.classList.remove('open');
    document.getElementById('sidebarOverlay')?.classList.remove('active');
  }
  return <div className="sidebar-overlay" id="sidebarOverlay" onClick={close} />;
}
