(() => {
  const wholesale = document.getElementById('tradeWholesale');
  const retail = document.getElementById('tradeRetail');
  const profit = document.getElementById('tradeProfit');
  const margin = document.getElementById('tradeMargin');

  function money(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  function updateMargin() {
    if (!wholesale || !retail || !profit || !margin) return;
    const cost = Math.max(0, Number(wholesale.value || 0));
    const sale = Math.max(0, Number(retail.value || 0));
    const gross = Math.max(0, sale - cost);
    const pct = sale > 0 ? Math.round((gross / sale) * 100) : 0;
    profit.textContent = money(gross);
    margin.textContent = pct + '%';
  }

  wholesale?.addEventListener('input', updateMargin);
  retail?.addEventListener('input', updateMargin);
  updateMargin();

  document.querySelectorAll('.trade-copy').forEach(button => {
    button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copyTarget || '');
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.textContent.trim());
        const original = button.textContent;
        button.textContent = 'Copied';
        button.classList.add('copied');
        setTimeout(() => {
          button.textContent = original;
          button.classList.remove('copied');
        }, 1400);
      } catch {
        button.textContent = 'Select text above';
      }
    });
  });
})();