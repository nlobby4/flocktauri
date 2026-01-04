// Helper to inject scripts into the page context
function injectScript(fileName, type) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(fileName);
  script.type = type; 
  (document.head || document.documentElement).appendChild(script);
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.tagName === 'SCRIPT' && node.src && 
         (node.src.includes('flockmod.js') || node.src.includes('flockmod.js%3F'))) {
        
        // 1. Stop the original script immediately
        node.parentNode.removeChild(node);
        
        // 2. Inject your replacement core script
        injectScript('flockmod.js', 'text/javascript');
        injectScript('homography.js', 'module');
        injectScript('injected.js', 'text/javascript');
        
        observer.disconnect();
        console.log('flockmod.js replaced and mods injected.');
      }
    }
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});