// Simple HTML sanitizer for rich text content
// Allows basic formatting tags but strips potentially dangerous ones

const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li'];
const ALLOWED_ATTRS = [];

export function sanitizeHtml(html) {
  if (!html) return '';
  
  // Create a temporary DOM element to parse HTML
  if (typeof window !== 'undefined') {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Remove all non-allowed elements and attributes
    const walker = document.createTreeWalker(
      temp,
      NodeFilter.SHOW_ELEMENT,
      null,
      false
    );
    
    const elementsToRemove = [];
    
    while (walker.nextNode()) {
      const node = walker.currentNode;
      
      if (!ALLOWED_TAGS.includes(node.tagName.toLowerCase())) {
        // If tag is not allowed, replace with its text content
        elementsToRemove.push(node);
      } else {
        // Remove all attributes (we don't allow any for security)
        while (node.attributes.length > 0) {
          node.removeAttribute(node.attributes[0].name);
        }
      }
    }
    
    // Remove disallowed elements (replace with text content)
    elementsToRemove.forEach(element => {
      const textNode = document.createTextNode(element.textContent);
      element.parentNode.replaceChild(textNode, element);
    });
    
    return temp.innerHTML;
  }
  
  // Server-side fallback - just strip all HTML for safety
  return html.replace(/<[^>]*>/g, '');
}

// Utility to clean HTML for display
export function cleanHtmlForDisplay(html) {
  const sanitized = sanitizeHtml(html);
  
  // Convert empty paragraphs to line breaks
  return sanitized
    .replace(/<p><\/p>/g, '<br>')
    .replace(/<p><br><\/p>/g, '<br>');
}