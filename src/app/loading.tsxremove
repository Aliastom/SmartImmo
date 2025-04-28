// Ce composant est affiché automatiquement par Next.js lors du chargement initial ou navigation SSR.
// Il doit être simple, rapide à afficher, et stylé comme ton loader global.

export default function GlobalAppLoading() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(128,128,128,0.55)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
    }}>
      <div className="animate-spin rounded-full border-4 border-blue-400 border-t-transparent h-16 w-16 mb-4" />
      <span style={{ color: 'white', fontWeight: 600, fontSize: 18 }}>Chargement...</span>
    </div>
  );
}
