(() => {
  const dialog = document.getElementById('estimateDialog');
  if (!dialog) return;

  const form = dialog.querySelector('form');
  const customer = document.getElementById('estimateCustomer');
  const vehicle = document.getElementById('estimateVehicle');
  const service = document.getElementById('estimateService');
  const price = document.getElementById('estimatePrice');
  const openButton = document.getElementById('newEstimateBtn');
  const submitButton = form.querySelector('button[type="submit"]');

  function pickOnlyCustomer() {
    if (!customer.value && customer.options.length === 2) {
      customer.selectedIndex = 1;
      customer.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function pickOnlyVehicle() {
    if (!vehicle.value && vehicle.options.length === 2) vehicle.selectedIndex = 1;
  }

  function prepareEstimate() {
    pickOnlyCustomer();
    pickOnlyVehicle();
  }

  openButton?.addEventListener('click', () => queueMicrotask(prepareEstimate));

  form.addEventListener('click', event => {
    if (!event.target.closest('button[type="submit"]')) return;
    prepareEstimate();
    if (!customer.value) {
      event.preventDefault();
      alert('Choose a customer before saving the estimate.');
      customer.focus();
      return;
    }
    if (!service.value) {
      event.preventDefault();
      alert('Choose a service before saving the estimate.');
      service.focus();
      return;
    }
    if (price.value === '') {
      const selected = state.services.find(item => item.id === service.value);
      if (selected) price.value = Number(selected.base_price || 0).toFixed(2);
    }
  }, true);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    prepareEstimate();

    if (!form.reportValidity()) return;

    const fd = new FormData(form);
    const oldText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Saving…';

    try {
      const { data, error } = await db.rpc('create_estimate_with_item', {
        p_customer_id: fd.get('customer_id'),
        p_vehicle_id: fd.get('vehicle_id') || null,
        p_service_id: fd.get('service_id'),
        p_unit_price: Number(fd.get('unit_price') || 0),
        p_status: fd.get('status') || 'draft',
        p_valid_until: fd.get('valid_until') || null,
        p_notes: fd.get('notes') || ''
      });
      if (error) throw error;
      if (!data) throw new Error('Estimate was not created.');

      dialog.close();
      await loadAll();
      showView('growth');
    } catch (error) {
      alert(error?.message || 'Unable to save estimate.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = oldText;
    }
  }, true);

})();
