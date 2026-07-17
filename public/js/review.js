// Renders the BP review UI (All / Average / Graphs + summary) into a container.
// Usage: HomeBPReview.init(containerEl, userId)
const HomeBPReview = (() => {
  let barChart = null;
  let lineChart = null;
  const MAX_BARS = 14;

  // Inline plugin: dashed reference lines at clinical thresholds (systolic 130, diastolic 80).
  const thresholdLines = {
    id: 'thresholdLines',
    afterDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      const y = scales.y;
      if (!y || !chartArea) return;
      const { left, right } = chartArea;
      ctx.save();
      [{ v: 130, color: '#ef4444' }, { v: 80, color: '#f59e0b' }].forEach(({ v, color }) => {
        const yy = y.getPixelForValue(v);
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = color;
        ctx.moveTo(left, yy);
        ctx.lineTo(right, yy);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.font = '10px sans-serif';
        ctx.fillText(v + ' mmHg', left + 4, yy - 3);
      });
      ctx.restore();
    },
  };

  const r = (v) => (v == null ? null : Math.round(Number(v)));
  const u = (key) => `<span class="text-slate-400 text-xs">${t(key)}</span>`;

  // Summary value: BP on the first line, heart rate on a smaller red second line.
  function bpLine(o) {
    if (!o || o.systolic == null) return '-';
    return (
      `${r(o.systolic)}/${r(o.diastolic)} ${u('unit_mmhg')}` +
      `<div class="text-red-600 text-xs font-normal mt-1">` +
      `${t('hr_prefix')} ${r(o.heart_rate)} <span class="text-red-400">${t('unit_bpm')}</span></div>`
    );
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
        <div class="flex flex-wrap gap-2 mb-4">
          <button class="js-tf text-xs rounded-full px-3 py-1 bg-indigo-600 text-white" data-tf="ampm" data-i18n="tf_ampm"></button>
          <button class="js-tf text-xs rounded-full px-3 py-1 bg-slate-100 text-slate-600" data-tf="daily" data-i18n="tf_daily"></button>
          <button class="js-tf text-xs rounded-full px-3 py-1 bg-slate-100 text-slate-600" data-tf="weekly" data-i18n="tf_weekly"></button>
          <button class="js-tf text-xs rounded-full px-3 py-1 bg-slate-100 text-slate-600" data-tf="monthly" data-i18n="tf_monthly"></button>
        </div>
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
      `<th class="px-3 py-2 text-left font-medium">${t('col_time')}</th>` +
      `<th class="px-3 py-2 text-left font-medium">${t('col_sys')} ${t('unit_mmhg')}</th>` +
      `<th class="px-3 py-2 text-left font-medium">${t('col_dia')} ${t('unit_mmhg')}</th>` +
      `<th class="px-3 py-2 text-left font-medium">${t('col_hr')} ${t('unit_bpm')}</th>` +
      `<th class="px-3 py-2 text-left font-medium">${t('col_action')}</th>`;
    const body = rows
      .map(
        (row) => `<tr class="border-t">
          <td class="px-3 py-2 whitespace-nowrap">${fmtDate(row.date)}</td>
          <td class="px-3 py-2 whitespace-nowrap">${fmtHM(row.time)}</td>
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

  // Monday of the week containing d (local time).
  function weekStart(d) {
    const nd = new Date(d);
    const day = (nd.getDay() + 6) % 7; // Mon = 0
    nd.setDate(nd.getDate() - day);
    nd.setHours(0, 0, 0, 0);
    return nd;
  }

  // Aggregate avg_bp rows into chart items {label, systolic, diastolic, heart_rate}
  // by timeframe: 'ampm' (per date+AM/PM), 'daily', 'weekly', 'monthly'.
  function aggregate(rows, tf) {
    if (tf === 'ampm') {
      return rows.map((row) => ({
        label: `${fmtDate(row.date)} ${row.ampm}`,
        systolic: Number(row.systolic), diastolic: Number(row.diastolic), heart_rate: Number(row.heart_rate),
      }));
    }
    const buckets = new Map();
    rows.forEach((row) => {
      const d = new Date(row.date + 'T00:00:00');
      let key, label, sortKey;
      if (tf === 'daily') {
        key = row.date; sortKey = row.date; label = fmtDate(row.date);
      } else if (tf === 'weekly') {
        const ws = ymd(weekStart(d)); key = ws; sortKey = ws; label = fmtDate(ws);
      } else { // monthly
        const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0');
        key = `${y}-${m}`; sortKey = key; label = `${m}/${y}`;
      }
      let b = buckets.get(key);
      if (!b) { b = { sumS: 0, sumD: 0, sumH: 0, n: 0, label, sortKey }; buckets.set(key, b); }
      b.sumS += Number(row.systolic); b.sumD += Number(row.diastolic); b.sumH += Number(row.heart_rate); b.n++;
    });
    return [...buckets.values()]
      .sort((a, b) => (a.sortKey < b.sortKey ? -1 : 1))
      .map((b) => ({ label: b.label, systolic: b.sumS / b.n, diastolic: b.sumD / b.n, heart_rate: b.sumH / b.n }));
  }

  function drawCharts(canvasBp, canvasHr, items) {
    const data = items.slice(-MAX_BARS); // at most 14, most recent
    const labels = data.map((row) => row.label);

    // Theme-aware axis / legend colors.
    const dark = document.documentElement.classList.contains('hbp-dark');
    const tickColor = dark ? '#cbd5e1' : '#475569';
    const gridColor = dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

    if (barChart) barChart.destroy();
    barChart = new Chart(canvasBp.getContext('2d'), {
      type: 'bar',
      plugins: [thresholdLines],
      data: {
        labels,
        // Floating bar: diastolic is the base, the systolic segment is the
        // gap (systolic - diastolic) so the bar tops out at the systolic value.
        datasets: [
          { label: t('graph_dia_full'), data: data.map((row) => r(row.diastolic)), backgroundColor: '#06b6d4', maxBarThickness: 32 },
          { label: t('graph_sys_full'), data: data.map((row) => r(row.systolic) - r(row.diastolic)), backgroundColor: '#4f46e5', maxBarThickness: 32 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { color: tickColor } } },
        scales: {
          x: { stacked: true, ticks: { color: tickColor }, grid: { color: gridColor } },
          y: { stacked: true, beginAtZero: true, ticks: { color: tickColor }, grid: { color: gridColor } },
        },
      },
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
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { color: tickColor } } },
        scales: {
          x: { ticks: { color: tickColor }, grid: { color: gridColor } },
          y: { beginAtZero: false, ticks: { color: tickColor }, grid: { color: gridColor } },
        },
      },
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
    let timeframe = 'ampm';
    let allRows = [];
    let allSortDesc = true; // newest first by default
    let allPage = 0;
    const PAGE_SIZE = 50;

    // Renders the "All BP Reading" tab with sorting + 50-per-page pagination.
    function renderAllPane() {
      if (!allRows.length) { $('.js-pane-all').innerHTML = tableAll([]); return; }
      const sorted = [...allRows].sort((a, b) => {
        const ka = `${a.date}T${a.time}`, kb = `${b.date}T${b.time}`;
        if (ka === kb) return 0;
        const cmp = ka < kb ? -1 : 1;
        return allSortDesc ? -cmp : cmp;
      });
      const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
      if (allPage >= totalPages) allPage = totalPages - 1;
      if (allPage < 0) allPage = 0;
      const pageRows = sorted.slice(allPage * PAGE_SIZE, allPage * PAGE_SIZE + PAGE_SIZE);

      const controls = `<div class="flex items-center justify-between gap-2 mb-3">
        <span class="text-xs text-slate-500">${sorted.length} ${t('records')}</span>
        <button class="js-sort text-sm border rounded-lg px-3 py-1 hover:bg-slate-50">${allSortDesc ? t('sort_newest') : t('sort_oldest')}</button>
      </div>`;
      const pager = sorted.length > PAGE_SIZE ? `
        <div class="flex items-center justify-center gap-3 mt-4">
          <button class="js-all-prev border rounded-lg px-3 py-1 hover:bg-slate-50 disabled:opacity-40" ${allPage === 0 ? 'disabled' : ''}>${t('prev')}</button>
          <span class="text-sm text-slate-500">${t('page')} ${allPage + 1} / ${totalPages}</span>
          <button class="js-all-next border rounded-lg px-3 py-1 hover:bg-slate-50 disabled:opacity-40" ${allPage >= totalPages - 1 ? 'disabled' : ''}>${t('next')}</button>
        </div>` : '';

      $('.js-pane-all').innerHTML = controls + tableAll(pageRows) + pager;

      const sortBtn = $('.js-sort');
      if (sortBtn) sortBtn.addEventListener('click', () => { allSortDesc = !allSortDesc; allPage = 0; renderAllPane(); });
      const prevBtn = $('.js-all-prev');
      if (prevBtn) prevBtn.addEventListener('click', () => { allPage = Math.max(0, allPage - 1); renderAllPane(); });
      const nextBtn = $('.js-all-next');
      if (nextBtn) nextBtn.addEventListener('click', () => { allPage += 1; renderAllPane(); });
      wireDelete();
    }

    function drawGraph() {
      drawCharts($('.js-canvas-bp'), $('.js-canvas-hr'), aggregate(avgRows, timeframe));
    }

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
      if (tab === 'graph') drawGraph();
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

    let isLoading = false;
    async function load() {
      // Guard against re-entrancy: applyI18n() below fires window.onLangChange,
      // which some pages wire to reviewApi.reload() — without this guard that
      // would recurse into load() forever.
      if (isLoading) return;
      isLoading = true;
      const loadingHtml = `<p class="text-slate-400 py-6 text-center">${t('loading')}</p>`;
      $('.js-pane-all').innerHTML = loadingHtml;
      $('.js-pane-avg').innerHTML = loadingHtml;
      $('.js-summary').innerHTML = '';
      try {
        const [all, avg] = await Promise.all([
          api('bp-list', { user_id: userId, from: from.value, to: to.value }),
          api('avg-list', { user_id: userId, from: from.value, to: to.value }),
        ]);
        avgRows = avg.rows;
        allRows = all.rows;
        allPage = 0; // fresh data -> back to first page (sort order is preserved)
        $('.js-summary').innerHTML = summaryCards(avg.summary);
        $('.js-pane-avg').innerHTML = tableAvg(avg.rows);
        applyI18n();
        renderAllPane();
        activate(currentTab);
      } catch (e) {
        alert(e.message);
      } finally {
        isLoading = false;
      }
    }

    container.querySelectorAll('.js-t').forEach((b) =>
      b.addEventListener('click', () => activate(b.dataset.tab))
    );
    // Timeframe selector for the graph (AM-PM / daily / weekly / monthly).
    container.querySelectorAll('.js-tf').forEach((b) =>
      b.addEventListener('click', () => {
        timeframe = b.dataset.tf;
        container.querySelectorAll('.js-tf').forEach((x) => {
          const on = x.dataset.tf === timeframe;
          x.classList.toggle('bg-indigo-600', on);
          x.classList.toggle('text-white', on);
          x.classList.toggle('bg-slate-100', !on);
          x.classList.toggle('text-slate-600', !on);
        });
        drawGraph();
      })
    );
    $('.js-apply').addEventListener('click', load);

    load();
    return { reload: load };
  }

  return { init };
})();
