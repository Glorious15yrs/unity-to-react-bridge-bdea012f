export default function Page() {
  return (
    <main style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <iframe
        src="/game/index.html"
        title="Subway Surfers"
        allow="autoplay; fullscreen; gamepad; accelerometer; gyroscope"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
      />
    </main>
  )
}
