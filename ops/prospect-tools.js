(() => {
  const stages = ['new', 'researching', 'contacted', 'follow_up', 'quote_sent', 'won', 'lost'];

  renderProspects = function() {
    els.prospectsList.replaceChildren();
    if (!state.prospects.length) return empty(els.prospectsList, 'No prospects yet. Add Boise / Treasure Valley businesses you want to land.');

    state.prospects.forEach(p => {
      const select = document.createElement('select');
      select.className = 'status-select';
      select.dataset.prospectId = p.id;

      stages.forEach(stage => {
        const option = document.createElement('option');
        option.value = stage;
        option.textContent = stage.replaceAll('_', ' ');
        option.selected = p.stage === stage;
        select.appendChild(option);
      });

      select.addEventListener('change', async () => {
        const previousStage = p.stage || 'new';
        const requestedStage = select.value;
        select.disabled = true;

        try {
          const { data, error } = await db.rpc('update_prospect_stage', {
            p_prospect_id: p.id,
            p_stage: requestedStage,
          });
          if (error) throw error;
          if (data !== requestedStage) throw new Error('Prospect stage was not saved.');

          p.stage = data;
          select.value = data;
        } catch (error) {
          select.value = previousStage;
          console.error('Unable to update prospect stage.', error);
          alert(error?.message || 'Unable to update prospect stage.');
        } finally {
          select.disabled = false;
        }
      });

      const sub = [
        p.category,
        [p.city, p.state].filter(Boolean).join(', '),
        p.estimated_vehicles ? `${p.estimated_vehicles} vehicles` : '',
        Number(p.estimated_monthly_value) ? `${money(p.estimated_monthly_value)}/mo est.` : '',
        p.next_follow_up_at ? `Follow up ${fmtDate(p.next_follow_up_at)}` : ''
      ].filter(Boolean).join(' • ');

      els.prospectsList.appendChild(row(p.company_name, sub, null, select));
    });
  };

  if (state?.prospects) renderProspects();
})();
