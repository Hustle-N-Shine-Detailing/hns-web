(() => {
  state.servicePriceTiers = state.servicePriceTiers || [];
  state.vehiclePriceTiers = state.vehiclePriceTiers || {};

  const tierLabels = {
    sedan: 'Car / Sedan',
    suv: 'Truck / SUV',
    oversized: 'Oversized / Van / RV',
    specialty: 'Boat / Powersports / Specialty'
  };

  function addVehicleTierField() {
    if (document.getElementById('vehiclePriceTier')) return;
    const grid = els.vehicleForm?.querySelector('.form-grid');
    const customerLabel = els.vehicleCustomer?.closest('label');
    if (!grid || !customerLabel) return;
    const label = document.createElement('label');
    label.className = 'full';
    label.textContent = 'Price tier';
    const select = document.createElement('select');
    select.id = 'vehiclePriceTier';
    select.name = 'price_tier';
    select.required = true;
    select.innerHTML = `
      <option value="">Choose vehicle price tier</option>
      <option value="sedan">Car / Sedan</option>
      <option value="suv">Truck / SUV</option>
      <option value="oversized">Oversized / Van / RV</option>
      <option value="specialty">Boat / Powersports / Specialty</option>`;
    label.appendChild(select);
    customerLabel.insertAdjacentElement('afterend', label);
  }

  function addEstimateTierField() {
    if (document.getElementById('estimateTier')) return;
    const vehicle = document.getElementById('estimateVehicle');
    const vehicleLabel = vehicle?.closest('label');
    if (!vehicleLabel) return;
    const label = document.createElement('label');
    label.className = 'full';
    label.textContent = 'Vehicle price tier';
    const select = document.createElement('select');
    select.id = 'estimateTier';
    select.required = true;
    select.innerHTML = `
      <option value="">Choose price tier</option>
      <option value="sedan">Car / Sedan</option>
      <option value="suv">Truck / SUV</option>
      <option value="oversized">Oversized / Van / RV</option>
      <option value="specialty">Boat / Powersports / Specialty</option>`;
    label.appendChild(select);
    vehicleLabel.insertAdjacentElement('afterend', label);
  }

  function tierRow(serviceId, tier) {
    return state.servicePriceTiers.find(item => item.service_id === serviceId && item.vehicle_tier === tier) || null;
  }

  function serviceById(id) {
    return state.services.find(item => item.id === id) || null;
  }

  function selectedVehicleTier(vehicleId) {
    if (!vehicleId) return '';
    return state.vehiclePriceTiers[vehicleId] || '';
  }

  function priceText(row) {
    if (!row || row.price === null || row.price === undefined) return 'Quote';
    return `${money(row.price)}${row.starting_price ? '+' : ''}`;
  }

  function refreshEstimateServiceLabels() {
    const serviceSelect = document.getElementById('estimateService');
    const tierSelect = document.getElementById('estimateTier');
    if (!serviceSelect || !tierSelect) return;
    const tier = tierSelect.value;
    [...serviceSelect.options].forEach(option => {
      if (!option.value) return;
      const service = serviceById(option.value);
      if (!service) return;
      const tiered = tier ? tierRow(service.id, tier) : null;
      option.textContent = `${service.name} — ${tiered ? priceText(tiered) : money(service.base_price)}`;
    });
  }

  function updateEstimatePrice() {
    const vehicleSelect = document.getElementById('estimateVehicle');
    const tierSelect = document.getElementById('estimateTier');
    const serviceSelect = document.getElementById('estimateService');
    const priceInput = document.getElementById('estimatePrice');
    if (!tierSelect || !serviceSelect || !priceInput) return;

    if (!tierSelect.value && vehicleSelect?.value) {
      tierSelect.value = selectedVehicleTier(vehicleSelect.value);
    }

    refreshEstimateServiceLabels();
    const service = serviceById(serviceSelect.value);
    if (!service) return;
    const tiered = tierSelect.value ? tierRow(service.id, tierSelect.value) : null;
    priceInput.value = Number(tiered?.price ?? service.base_price ?? 0).toFixed(2);
    priceInput.dataset.startingPrice = tiered?.starting_price ? 'true' : 'false';
  }

  async function rememberVehicleTier() {
    const vehicleSelect = document.getElementById('estimateVehicle');
    const tierSelect = document.getElementById('estimateTier');
    if (!vehicleSelect?.value || !tierSelect?.value) return;
    const vehicleId = vehicleSelect.value;
    const tier = tierSelect.value;
    if (state.vehiclePriceTiers[vehicleId] === tier) return;
    state.vehiclePriceTiers[vehicleId] = tier;
    const vehicle = state.vehicles.find(item => item.id === vehicleId);
    if (vehicle) vehicle.price_tier = tier;
    const { error } = await db.from('vehicles').update({ price_tier: tier }).eq('id', vehicleId).eq('business_id', state.businessId);
    if (error) console.error('Unable to remember vehicle price tier', error);
  }

  function bindEstimatePricing() {
    const open = document.getElementById('newEstimateBtn');
    const vehicle = document.getElementById('estimateVehicle');
    const tier = document.getElementById('estimateTier');
    const service = document.getElementById('estimateService');
    if (!vehicle || !tier || !service) return;

    open?.addEventListener('click', () => setTimeout(() => {
      if (vehicle.value) tier.value = selectedVehicleTier(vehicle.value);
      updateEstimatePrice();
    }, 0));

    vehicle.addEventListener('change', () => {
      tier.value = selectedVehicleTier(vehicle.value);
      updateEstimatePrice();
    });
    tier.addEventListener('change', () => {
      updateEstimatePrice();
      rememberVehicleTier();
    });
    service.addEventListener('change', updateEstimatePrice);
  }

  function renderTieredServices() {
    if (!els.servicesList || !state.services?.length) return;
    els.servicesList.replaceChildren();
    state.services.forEach(service => {
      const tiers = ['sedan','suv','oversized']
        .map(tier => {
          const item = tierRow(service.id, tier);
          return item ? `${tierLabels[tier]} ${priceText(item)}` : '';
        })
        .filter(Boolean);
      const pricing = tiers.length ? tiers.join(' • ') : `Base ${money(service.base_price)}`;
      const sub = [service.description, pricing, service.duration_minutes ? `${service.duration_minutes} min` : ''].filter(Boolean).join(' • ');
      els.servicesList.appendChild(row(service.name, sub, service.active ? 'active' : 'inactive'));
    });
  }

  async function loadPricingData() {
    if (!state.businessId) return;
    const [tierRes, vehicleRes] = await Promise.all([
      db.from('service_price_tiers').select('service_id,vehicle_tier,price,starting_price').eq('business_id', state.businessId),
      db.from('vehicles').select('id,price_tier').eq('business_id', state.businessId)
    ]);
    if (tierRes.error) throw tierRes.error;
    if (vehicleRes.error) throw vehicleRes.error;
    state.servicePriceTiers = tierRes.data || [];
    state.vehiclePriceTiers = Object.fromEntries((vehicleRes.data || []).map(item => [item.id, item.price_tier || '']));
    state.vehicles.forEach(vehicle => { vehicle.price_tier = state.vehiclePriceTiers[vehicle.id] || ''; });
    renderTieredServices();
    updateEstimatePrice();
  }

  addVehicleTierField();
  addEstimateTierField();
  bindEstimatePricing();

  const previousLoadAll = loadAll;
  loadAll = async function() {
    await previousLoadAll();
    await loadPricingData();
  };

  if (state.businessId) loadPricingData().catch(error => console.error(error));
})();
