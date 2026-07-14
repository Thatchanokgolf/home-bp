// Renders the BP review UI (All / Average / Bar Graph + summary) into a container.
// Usage: HomeBPReview.init(containerEl, userId)
const HomeBPReview = (() => {
  let chart = null;

  function fmt(v) {
    return v == null ? '-' : Number(v).toFixed(0);
  }
  function fmt1(v) {
    return v == null ? '-' : Number(v).toFixed(1);
  }
  function bp(o) {
    if (!o || o.systolic == null) return '-';
    return `${fmt1(o.systolic)}/${fmt1(o.diastolic)} · ${fmt1(o.heart_rate)}`;
  }

  function template() {
    return `
      <div class="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label class="block text-xs text-slate-500 mb-1" data-i18n="date_from"></label>
          <input type="date" class="js-from border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label class="block text-xs text-slate-500 mb-1" data-i18n="date_to"></label>
          <input type="date" class="js-to border rounded-lg px-3 py-2" />
        </div>
        <button class="js-apply bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700" data-i18n="apply"></button>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 js-summary"></div>

      <div class="flex gap-2 mb-4 border-b">
        <button class="js-t js-t-all -mb-px border-b-2 px-4 py-2 text-sm font-medium" data-tab="all" data-i18n="tab_all"></button>
        <button class="js-t js-t-avg -mb-px border-b-2 px-4 py-2 text-sm font-medium" data-tab="avg" data-i18n="tab_avg"></button>
        <button class="js-t js-t-graph -mb-px border-b-2 px-4 py-2 text-sm font-medium" data-tab="graph" data-i18n="tab_graph"></button>
      </div>

      <div class="js-pane-all"></div>
      <div class="js-pane-avg hidden"></div>
      <div class="js-pane-graph hidden"><canvas class="js-canvas" height="140"></canvas></div>
    `;
  }

  function summaryCards(s) {
    const card = (labelKey, value, sub) => `
      <div class="bg-white rounded-xl border p-3 shadow-sm">
        <div class="text-xs text-slate-500" data-i18n="${labelKey}"></div>
        <div class="text-lg font-semibold text-slate-800">${value}</div>
        ${sub ? `<div class="text-xs text-slate-400 mt-0.5">${sub}</div>` : ''}
      </div>`;
    return (
      card('sum_am', bp(s.am)) +
      card('sum_pm', bp(s.pm)) +
      card('sum_24', bp(s.all)) +
      card('sum_freq', `${s.count} / ${s.max_expected}`, `${t('times')}`)
    );
  }

  function tableAll(rows) {
    if (!rows.length) return `<p class="text-slate-400 py-6 text-center" data-i18n="no_data">${t('no_data')}</p>`;
    const head = ['col_date', 'col_time', 'col_ampm', 'col_sys', 'col_dia', 'col_hr']
      .map((k) => `<th class="px-3 py-2 text-left font-medium">${t(k)}</th>`)
      .join('');
    const body = rows
      .map(
        (r) => `<tr class="border-t">
          <td class="px-3 py-2">${r.date}</td>
          <td class="px-3 py-2">${String(r.time).slice(0, 5)}</td>
          <td class="px-3 py-2">${r.ampm}</td>
          <td class="px-3 py-2">${r.systolic}</td>
          <td class="px-3 py-2">${r.diastolic}</td>
          <td class="px-3 py-2">${r.heart_rate}</td>
        </tr>`
      )
      .join('');
    return `<div class="overflow-x-auto"><table class="w-full text-sm bg-white rounded-xl border">
      <thead class="bg-slate-50 text-slate-600">${head}</thead><tbody>${body}</tbody></table></div>`;
  }

  function tableAvg(rows) {
    if (!rows.length) return `<p class="text-slate-400 py-6 text-center">${t('no_data')}</p>`;
    const head = ['col_date', 'col_ampm', 'col_sys', 'col_dia', 'col_hr']
      .map((k) => `<th class="px-3 py-2 text-left font-medium">${t(k)}</th>`)
      .join('');
    const body = rows
      .map(
        (r) => `<tr class="border-t">
          <td class="px-3 py-2">${r.date}</td>
          <td class="px-3 py-2">${r.ampm}</td>
          <td class="px-3 py-2">${fmt1(r.systolic)}</td>
          <td class="px-3 py-2">${fmt1(r.diastolic)}</td>
          <td class="px-3 py-2">${fmt1(r.heart_rate)}</td>
        </tr>`
      )
      .join('');
    return `<div class="overflow-x-auto"><table class="w-full text-sm bg-white rounded-xl border">
      <thead class="bg-slate-50 text-slate-600">${head}</thead><tbody>${body}</tbody></table></div>`;
  }

  function drawChart(canvas, rows) {
    const labels = rows.map((r) => `${String(r.date).slice(5)} ${r.ampm}`);
    if (chart) chart.destroy();
    chart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: t('graph_sys'), data: rows.map((r) => Number(r.systolic)), backgroundColor: '#4f46e5' },
          { label: t('graph_dia'), data: rows.map((r) => Number(r.diastolic)), backgroundColor: '#06b6d4' },
          { label: t('graph_hr'), data: rows.map((r) => Number(r.heart_rate)), backgroundColor: '#f59e0b' },
        ],
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } } },
    });
  }

  function init(container, userId) {
    container.innerHTML = template();
    const $ = (sel) => container.querySelector(sel);
    const from = $('.js-from');
    const to = $('.js-to');
    from.value = ymd(daysAgo(6)); // last 7 days incl. today
    to.value = ymd(new Date());

    let avgRows = [];

    function activate(tab) {
      container.querySelectorAll('.js-t').forEach((b) => {
        const on = b.dataset.tab === tab;
        b.classList.toggle('border-indigo-600', on);
        b.classList.toggle('text-indigo-600', on);
        b.classList.toggle('border-transparent', !on);
        b.classList.toggle('text-slate-500', !on);
      });
      $('.js-pane-all').classList.toggle('hidden', tab !== 'all');
      $('.js-pane-avg').classList.toggle('hidden', tab !== 'avg');
      $('.js-pane-graph').classList.toggle('hidden', tab !== 'graph');
      if (tab === 'graph') drawChart($('.js-canvas'), avgRows);
    }

    async function load() {
      try {
        const [all, avg] = await Promise.all([
          api('bp-list', { user_id: userId, from: from.value, to: to.value }),
          api('avg-list', { user_id: userId, from: from.value, to: to.value }),
        ]);
        avgRows = avg.rows;
        $('.js-summary').innerHTML = summaryCards(avg.summary);
        $('.js-pane-all').innerHTML = tableAll(all.rows);
        $('.js-pane-avg').innerHTML = tableAvg(avg.rows);
        applyI18n();
        const current = container.querySelector('.js-t.text-indigo-600')?.dataset.tab || 'all';
        activate(current);
      } catch (e) {
        alert(e.message);
      }
    }

    container.querySelectorAll('.js-t').forEach((b) =>
      b.addEventListener('click', () => activate(b.dataset.tab))
    );
    $('.js-apply').addEventListener('click', load);

    activate('all');
    load();
    return { reload: load };
  }

  return { init };
})();
