(() => {
  const form = els.jobForm;
  if (!form) return;

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

  // Keep this file focused on displaying vehicle-tier pricing only.
  // Job creation is handled by app.js using direct table writes, which are
  // already covered by the authenticated RLS policies for this owner session.
  els.newJobBtn.addEventListener('click', () => setTimeout(async () => {
    await ensurePricingLoaded();
    refreshJobServiceLabels();
  }, 0));

  els.jobVehicle.addEventListener('change', refreshJobServiceLabels);
  els.jobCustomer.addEventListener('change', () => queueMicrotask(refreshJobServiceLabels));
})();