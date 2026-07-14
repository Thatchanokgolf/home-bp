// Renders the BP review UI (All / Average / Graphs + summary) into a container.
// Usage: HomeBPReview.init(containerEl, userId)
const HomeBPReview = (() => {
  let barChart = null;
  let lineChart = null;
  const MAX_BARS = 14;

  const r = (v) => (v == null ? null : Math.round(Number(v)));
  const u = (key) => `<span class="text-slate-400 text-xs">${t(key)}</span>`;

  // Summary value: "120/80 mmHg · HR 72 bpm" (integers)
  function bpLine(o) {
    if (!o || o.systolic == null) return '-';
    return `${r(o.systolic)}/${r(o.diastolic)} ${u('unit_mmhg')} · ${t('hr_prefix')} ${r(o.heart_rate)} ${u('unit_bpm')}`;
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
        <button class="js-t -mb-px border-b-2 px-4 py-2 text-sm font-medium" data-tab="all" data-i18n="tab_all"></button>
        <button class="js-t -mb-px border-b-2 px-4 py-2 text-sm font-medium" data-tab="avg" data-i18n="tab_avg"></button>
        <button class="js-t -mb-px border-b-2 px-4 py-2 text-sm font-medium" data-tab="graph" data-i18n="tab_graph"></button>
      </div>

      <div class="js-pane-all"></div>
      <div class="js-pane-avg hidden"></div>
      <div class="js-pane-graph hidden">
        <div class="relative w-full" style="height:280px"><canvas class="js-canvas-bp"></canvas></div>
        <div class="relative w-full mt-8" style="height:220px"><canvas class="js-canvas-hr"></canvas></div>
      </div>
    `;
  }

  function summaryCards(s) {
    const card = (labelKey, value, sub) => `
      <div class="bg-white rounded-xl border p-3 shadow-sm">
        <div class="text-xs text-slate-500" data-i18n="${labelKey}"></div>
        <div class="text-base font-semibold text-slate-800">${value}</div>
        ${sub ? `<div class="text-xs text-slate-400 mt-0.5">${sub}</div>` : ''}
      </div>`;
    return (
      card('sum_am', bpLine(s.am)) +
      card('sum_pm', bpLine(s.pm)) +
      card('sum_24', bpLine(s.all)) +
      card('sum_freq', `${s.count} / ${s.max_expected}`, t('times'))
    );
  }

  // All BP readings: Date (d/m/y only, no time/AM-PM), Sys, Dia, HR, delete
  function tableAll(rows, canDelete) {
    if (!rows.length) return `<p class="text-slate-400 py-6 text-center">${t('no_data')}</p>`;
    const head =
      `<th class="px-3 py-2 text-left font-medium">${t('col_date')}</th>` +
      `<th class="px-3 py-2 text-left font-medium">${t('col_sys')} ${t('unit_mmhg')}</th>` +
      `<th class="px-3 py-2 text-left font-medium">${t('col_dia')} ${t('unit_mmhg')}</th>` +
      `<th class="px-3 py-2 text-left font-medium">${t('col_hr')} ${t('unit_bpm')}</th>` +
      `<th class="px-3 py-2 text-left font-medium">${t('col_action')}</th>`;
    const body = rows
      .map(
        (row) => `<tr class="border-t">
          <td class="px-3 py-2 whitespace-nowrap">${fmtDate(row.date)}</td>
          <td class="px-3 py-2">${row.systolic}</td>
          <td class="px-3 py-2">${row.diastolic}</td>
          <td class="px-3 py-2">${row.heart_rate}</td>
          <td class="px-3 py-2"><button class="js-del text-red-600 hover:underline" data-id="${row.id}">${t('delete')}</button></td>
        </tr>`
      )
      .join('');
    return `<div class="overflow-x-auto"><table class="w-full text-sm bg-white rounded-xl border">
      <thead class="bg-slate-50 text-slate-600">${head}</thead><tbody>${body}</tbody></table></div>`;
  }

  // Average BP readings: Date (d/m/y only), Sys, Dia, HR — all integers
  function tableAvg(rows) {
    if (!rows.length) return `<p class="text-slate-400 py-6 text-center">${t('no_data')}</p>`;
    const head =
      `<th class="px-3 py-2 text-left font-medium">${t('col_date')}</th>` +
      `<th class="px-3 py-2 text-left font-medium">${t('col_sys')} ${t('unit_mmhg')}</th>` +
      `<th class="px-3 py-2 text-left font-medium">${t('col_dia')} ${t('unit_mmhg')}</th>` +
      `<th class="px-3 py-2 text-left font-medium">${t('col_hr')} ${t('unit_bpm')}</th>`;
    const body = rows
      .map(
        (row) => `<tr class="border-t">
          <td class="px-3 py-2 whitespace-nowrap">${fmtDate(row.date)} <span class="text-slate-400 text-xs">${row.ampm}</span></td>
          <td class="px-3 py-2">${r(row.systolic)}</td>
          <td class="px-3 py-2">${r(row.diastolic)}</td>
          <td class="px-3 py-2">${r(row.heart_rate)}</td>
        </tr>`
      )
      .join('');
    return `<div class="overflow-x-auto"><table class="w-full text-sm bg-white rounded-xl border">
      <thead class="bg-slate-50 text-slate-600">${head}</thead><tbody>${body}</tbody></table></div>`;
  }

  function drawCharts(canvasBp, canvasHr, rows) {
    const data = rows.slice(-MAX_BARS); // at most 14, most recent
    const labels = data.map((row) => `${fmtDate(row.date)} ${row.ampm}`);

    if (barChart) barChart.destroy();
    barChart = new Chart(canvasBp.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: t('graph_sys_full'), data: data.map((row) => r(row.systolic)), backgroundColor: '#4f46e5' },
          { label: t('graph_dia_full'), data: data.map((row) => r(row.diastolic)), backgroundColor: '#06b6d4' },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } },
    });

    if (lineChart) lineChart.destroy();
    lineChart = new Chart(canvasHr.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: t('graph_hr_full'), data: data.map((row) => r(row.heart_rate)),
            borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.2)', tension: 0.3, fill: true },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: false } } },
    });
  }

  // Shared delete modal (one per page, appended to body).
  function ensureDeleteModal() {
    let m = document.getElementById('hbpDeleteModal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'hbpDeleteModal';
    m.className = 'hidden fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50';
    m.innerHTML = `
      <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 class="text-lg font-semibold mb-2 text-slate-800 js-dtitle"></h3>
        <p class="text-sm text-slate-500 mb-3 js-dprompt"></p>
        <input type="password" class="js-dpw w-full border rounded-lg px-3 py-2 mb-4" />
        <div class="flex gap-2">
          <button class="js-dok flex-1 bg-red-600 text-white rounded-lg py-2 hover:bg-red-700 disabled:opacity-50"></button>
          <button class="js-dcancel flex-1 border rounded-lg py-2 hover:bg-slate-50"></button>
        </div>
      </div>`;
    document.body.appendChild(m);
    return m;
  }

  function init(container, userId) {
    container.innerHTML = template();
    const $ = (sel) => container.querySelector(sel);
    const from = $('.js-from');
    const to = $('.js-to');
    from.value = ymd(daysAgo(6)); // last 7 days incl. today
    to.value = ymd(new Date());

    let avgRows = [];
    let currentTab = 'all';

    function activate(tab) {
      currentTab = tab;
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
      if (tab === 'graph') drawCharts($('.js-canvas-bp'), $('.js-canvas-hr'), avgRows);
    }

    function wireDelete() {
      const modal = ensureDeleteModal();
      container.querySelectorAll('.js-del').forEach((btn) => {
        btn.addEventListener('click', () => {
          modal.querySelector('.js-dtitle').textContent = t('delete_title');
          modal.querySelector('.js-dprompt').textContent = t('delete_confirm_pw');
          modal.querySelector('.js-dok').textContent = t('delete');
          modal.querySelector('.js-dcancel').textContent = t('cancel');
          const pw = modal.querySelector('.js-dpw');
          pw.value = '';
          modal.classList.remove('hidden');
          modal.querySelector('.js-dcancel').onclick = () => modal.classList.add('hidden');
          modal.querySelector('.js-dok').onclick = async () => {
            const ok = modal.querySelector('.js-dok');
            ok.disabled = true;
            try {
              await api('delete-bp', { reading_id: Number(btn.dataset.id), password: pw.value });
              modal.classList.add('hidden');
              load();
            } catch (e) {
              alert(e.message);
            } finally {
              ok.disabled = false;
            }
          };
        });
      });
    }

    async function load() {
      try {
        const [all, avg] = await Promise.all([
          api('bp-list', { user_id: userId, from: from.value, to: to.value }),
          api('avg-list', { user_id: userId, from: from.value, to: to.value }),
        ]);
        avgRows = avg.rows;
        $('.js-summary').innerHTML = summaryCards(avg.summary);
        $('.js-pane-all').innerHTML = tableAll(all.rows, true);
        $('.js-pane-avg').innerHTML = tableAvg(avg.rows);
        applyI18n();
        wireDelete();
        activate(currentTab);
      } catch (e) {
        alert(e.message);
      }
    }

    container.querySelectorAll('.js-t').forEach((b) =>
      b.addEventListener('click', () => activate(b.dataset.tab))
    );
    $('.js-apply').addEventListener('click', load);

    load();
    return { reload: load };
  }

  return { init };
})();
