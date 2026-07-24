export function showToast(message, duration = 1000) {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: #fff;
    padding: 10px 16px;
    border-radius: 4px;
    z-index: 9999;
  `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, duration);
}