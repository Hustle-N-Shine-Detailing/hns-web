(() => {
  const stages = ['new', 'contacted', 'scheduled', 'completed', 'closed'];

  function link(label, href) {
    const node = document.createElement('a');
    node.className = 'btn mini';
    node.textContent = label;
    node.href = href;
    return node;
  }

  function makeSelect(lead) {
    const select = document.createElement('select');
    select.className = 'status-select';
    stages.forEach(stage => {
      const option = document.createElement('option');
      option.value = stage;
      option.textContent = stage;
      option.selected = lead.status === stage;
      select.appendChild(option);
    });
    select.addEventListener('change', async () => {
      const previous = lead.status;
      select.disabled = true;
      const { error } = await db.from('booking_requests').update({ status: select.value }).eq('id', lead.id);
      select.disabled = false;
      if (error) { select.value = previous; return alert(error.message); }
      lead.status = select.value;
    });
    return select;
  }

  async function convertLead(lead, button) {
    button.disabled = true;
    button.textContent = 'Adding…';
    try {
      const { data, error } = await db.rpc('convert_booking_request_to_customer', { p_booking_request_id: lead.id });
      if (error) throw error;
      if (!data) throw new Error('The customer was not created.');
      lead.converted_customer_id = data;
      lead.converted_at = new Date().toISOString();
      lead.status = lead.status === 'new' ? 'contacted' : lead.status;
      await loadAll();
      showView('customers');
      showAppNotice(`${lead.customer_name} is now in Customers. Add their exact vehicle, then create an estimate or job.`);
    } catch (error) {
      console.error('Booking lead conversion failed.', error);
      alert(error?.message || 'Unable to add this booking lead to customers.');
      button.disabled = false;
      button.textContent = 'Add customer';
    }
  }

  renderLeads = function(container, leads) {
    container.replaceChildren();
    if (!leads.length) return empty(container, 'No booking requests yet.');
    leads.forEach(lead => {
      const actions = document.createElement('div');
      actions.className = 'lead-actions';
      actions.appendChild(makeSelect(lead));
      if (lead.phone) actions.appendChild(link('Call', `tel:${String(lead.phone).replace(/[^0-9+]/g, '')}`));
      if (lead.email) actions.appendChild(link('Email', `mailto:${lead.email}`));
      if (lead.converted_customer_id) {
        const saved = document.createElement('span');
        saved.className = 'pill completed';
        saved.textContent = 'Customer saved';
        actions.appendChild(saved);
      } else {
        const convert = document.createElement('button');
        convert.type = 'button';
        convert.className = 'btn primary mini';
        convert.textContent = 'Add customer';
        convert.addEventListener('click', () => convertLead(lead, convert));
        actions.appendChild(convert);
      }

      const details = document.createElement('div');
      details.appendChild(row(
        lead.customer_name,
        [fmtDate(lead.created_at), lead.vehicle, lead.service, lead.city, lead.phone].filter(Boolean).join(' • '),
        null,
        actions
      ));
      if (lead.customer_notes) {
        const note = document.createElement('div');
        note.className = 'lead-note';
        note.textContent = lead.customer_notes;
        details.firstElementChild.querySelector('.row-main').appendChild(note);
      }
      container.appendChild(details.firstElementChild);
    });
  };

  if (state.leads?.length) {
    renderLeads(els.freshLeads, state.leads.slice(0, 5));
    renderLeads(els.leadsList, state.leads);
  }
})();
