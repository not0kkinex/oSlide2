/**
 * Toast Notification Manager
 * Displays temporary notifications at bottom-right
 */
const Toast = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  LOADING: 'loading',

  /**
   * Shows a toast notification
   * @param {string} message - Text to display
   * @param {string} [type='info'] - Toast type constant
   * @param {number} [duration=3000] - Auto-hide ms (0 = persistent)
   * @returns {{dismiss: Function}} Control object
   */
  show(message, type = 'info', duration = 3000) {
    const container = this._getContainer()
    const toast = document.createElement('div')
    toast.className = 'toast toast-' + type

    const icons = {
      success: 'check-circle',
      error: 'alert-circle',
      warning: 'alert-triangle',
      info: 'info',
      loading: 'loader'
    }

    toast.innerHTML =
      '<div class="toast-content">' +
        '<i data-lucide="' + (icons[type] || 'info') + '" class="toast-icon"></i>' +
        '<span class="toast-message">' + this._escapeHTML(message) + '</span>' +
      '</div>'

    container.appendChild(toast)
    if (window.lucide) lucide.createIcons()

    const dismiss = () => {
      toast.classList.add('removing')
      setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast) }, 300)
    }

    if (duration > 0) setTimeout(dismiss, duration)

    return { dismiss: dismiss }
  },

  /**
   * Shows an error toast with automatic console.error logging
   * @param {string|Error} error - Error message or object
   * @param {string} [context='Operation'] - Label for the error log
   * @returns {{dismiss: Function}}
   */
  error(error, context) {
    if (context === void 0) context = 'Operation'
    var message = error instanceof Error ? error.message : String(error)
    console.error('[' + context + '] ' + message)
    return this.show('Error: ' + message, this.ERROR, 5000)
  },

  _getContainer() {
    var container = document.getElementById('toast-container')
    if (!container) {
      container = document.createElement('div')
      container.id = 'toast-container'
      document.body.appendChild(container)
      // Styles are set in toast.css; set minimal fallback inline
      container.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none'
    }
    return container
  },

  _escapeHTML(text) {
    var d = document.createElement('div')
    d.textContent = text
    return d.innerHTML
  }
}

window.Toast = Toast
window.Toast.SUCCESS = 'success'
window.Toast.ERROR = 'error'
window.Toast.WARNING = 'warning'
window.Toast.INFO = 'info'
window.Toast.LOADING = 'loading'
