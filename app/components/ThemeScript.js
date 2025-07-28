// This component injects a script to apply theme immediately
// preventing any flash of incorrect colors

export default function ThemeScript() {
  const themeScript = `
    (function() {
      try {
        // Get the server-rendered theme from HTML attribute
        const htmlElement = document.documentElement;
        const serverTheme = htmlElement.getAttribute('data-site-theme') || 'ocean-blue';
        
        // Cache the server theme in localStorage for consistency
        localStorage.setItem('site-color-theme', serverTheme);
        
        // Theme is already applied server-side, so we're just caching it
      } catch (e) {
        // Fallback to default theme if anything fails
        console.warn('Failed to cache theme:', e);
      }
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: themeScript,
      }}
    />
  );
}