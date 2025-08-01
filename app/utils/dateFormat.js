/**
 * Date formatting utilities that avoid hydration issues
 */

/**
 * Format date consistently for server and client rendering
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  try {
    const d = new Date(date);
    // Use specific locale and options to ensure consistency
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

/**
 * Format number consistently for server and client rendering
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
  try {
    // Use specific locale to ensure consistency
    return num.toLocaleString('en-US');
  } catch (error) {
    console.error('Error formatting number:', error);
    return num.toString();
  }
}