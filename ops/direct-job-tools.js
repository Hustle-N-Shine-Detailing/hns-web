(() => {
  const form = els.jobForm;
  if (!form) return;

  const submitButton = form.querySelector('button[type="submit"]');

  function tierRow(serviceId, tier) {
    return (state.servicePriceTiers || []).find(item => item.service_id === serviceId && item.vehicle_tier === tier) || null;
  }

  function tierForVehicle(vehicleId) {
    if (!vehicleId) return '';
    return state.vehiclePriceTiers?.[vehicleId] || state.vehicles.find(v => v.id === vehicleId)?.price_tier || '';
  }

  function refreshJobServiceLabels() {
    const tier = tierForVehicle(els.jobVehicle.value);
    [...els.jobService.options].forEach(option => {
      if (!option.value) return;
      const service = state.services.find(item => item.id === option.value);
      if (!service) return;
      const tiered = tier ? tierRow(service.id, tier) : null;
      const amount = Number(tiered?.price ?? service.base_price ?? 0);
      const plus = tiered?.starting_price ? '+' : '';
      option.textContent = `${service.name} — ${money(amount)}${plus}`;
    });
  }

  async function ensurePricingLoaded() {
    state.servicePriceTiers = state.servicePriceTiers || [];
    state.vehiclePriceTiers = state.vehiclePriceTiers || {};
    if (state.servicePriceTiers.length && Object.keys(state.vehiclePriceTiers).length) return;

    const [tierRes, vehicleRes] = await Promise.all([
      db.from('service_price_tiers').select('service_id,vehicle_tier,price,starting_price').eq('business_id', state.businessId),
      db.from('vehicles').select('id,price_tier').eq('business_id', state.businessId)
    ]);
    if (!tierRes.error) state.servicePriceTiers = tierRes.data || [];
    if (!vehicleRes.error) state.vehiclePriceTiers = Object.fromEntries((vehicleRes.data || []).map(v => [v.id, v.price_tier || '']));
  }

  els.newJobBtn.addEventListener('click', () => setTimeout(async () => {
    await ensurePricingLoaded();
    refreshJobServiceLabels();
  }, 0));

  els.jobVehicle.addEventListener('change', refreshJobServiceLabels);
  els.jobCustomer.addEventListener('change', () => queueMicrotask(refreshJobServiceLabels));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (!form.reportValidity()) return;
    const fd = new FormData(form);
    const serviceId = fd.get('service_id');
    if (!serviceId) return alert('Choose a service before creating the job.');

    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Creating…';

    try {
      const { data, error } = await db.rpc('create_job_with_service', {
        p_customer_id: fd.get('customer_id'),
        p_vehicle_id: fd.get('vehicle_id') || null,
        p_service_id: serviceId,
        p_scheduled_start: new Date(fd.get('scheduled_start')).toISOString(),
        p_status: fd.get('status') || 'scheduled',
        p_address: fd.get('address') || '',
        p_internal_notes: fd.get('internal_notes') || ''
      });
      if (error) throw error;
      if (!data) throw new Error('Job was not created.');

      form.reset();
      els.jobDialog.close();
      await loadAll();
      showView('jobs');
    } catch (error) {
      alert(error?.message || 'Unable to create job.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }, true);
})();