/* ============================================================
   Bayraktar TB2 — Chart.js Dashboard Charts
   ============================================================ */

const Charts = (() => {
  let radarChart, wingLoadBar, ptwBar, ttwBar;
  let budgetDonut, costBarChart;
  let clChart;

  const STATUS_COLORS = {
    green:  'rgba(46, 204, 113, 0.85)',
    yellow: 'rgba(241, 196, 15, 0.85)',
    red:    'rgba(231, 76, 60, 0.85)',
  };

  const CHART_DEFAULTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#ccc', font: { family: 'Inter', size: 11 } } }
    },
    scales: {}
  };

  function darkScale() {
    return {
      ticks: { color: '#999', font: { family: 'Inter', size: 10 } },
      grid: { color: 'rgba(255,255,255,0.06)' }
    };
  }

  /* ── Performance Radar Chart ── */
  function initRadarChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Wing Loading', 'Power/Weight', 'Thrust/Weight', 'Aspect Ratio', 'Flight Time', 'Top Speed'],
        datasets: [{
          label: 'Bayraktar TB2',
          data: [0, 0, 0, 0, 0, 0],
          backgroundColor: 'rgba(232, 168, 124, 0.15)',
          borderColor: '#e8a87c',
          borderWidth: 2,
          pointBackgroundColor: '#e8a87c',
          pointBorderColor: '#fff',
          pointRadius: 4
        }]
      },
      options: {
        ...CHART_DEFAULTS,
        scales: {
          r: {
            grid: { color: 'rgba(255,255,255,0.08)' },
            angleLines: { color: 'rgba(255,255,255,0.08)' },
            pointLabels: { color: '#ccc', font: { family: 'Inter', size: 11 } },
            ticks: { display: false },
            suggestedMin: 0,
            suggestedMax: 100
          }
        }
      }
    });
  }

  /* ── Gauge-style horizontal bars ── */
  function initGaugeBars(containerId) {
    // We'll build these as DOM-based gauges, not Chart.js
    // (Chart.js gauge plugin not needed — custom DOM is cleaner)
  }

  /* ── Budget Donut Chart ── */
  function initBudgetDonut(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    budgetDonut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [
            '#e74c3c', '#e8a87c', '#f1c40f', '#2ecc71',
            '#3498db', '#1abc9c', '#9b59b6', '#e67e22',
            '#34495e', '#95a5a6', '#d35400'
          ],
          borderColor: '#2b2b2b',
          borderWidth: 2
        }]
      },
      options: {
        ...CHART_DEFAULTS,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#ccc', font: { family: 'Inter', size: 11 }, padding: 12 }
          }
        }
      }
    });
  }

  /* ── Cost Bar Chart ── */
  function initCostBar(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    costBarChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Cost ($)',
          data: [],
          backgroundColor: 'rgba(232, 168, 124, 0.7)',
          borderColor: '#e8a87c',
          borderWidth: 1
        }]
      },
      options: {
        ...CHART_DEFAULTS,
        indexAxis: 'y',
        scales: {
          x: darkScale(),
          y: darkScale()
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  /* ── CL vs AoA Chart ── */
  function initCLChart(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    // Generate CL vs AoA data (thin airfoil theory + stall model)
    const aoaData = [];
    const clData = [];
    for (let a = -5; a <= 20; a += 0.5) {
      aoaData.push(a);
      clData.push(computeCL(a));
    }

    clChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: aoaData,
        datasets: [
          {
            label: 'CL (NACA 4412)',
            data: clData,
            borderColor: '#e8a87c',
            backgroundColor: 'rgba(232, 168, 124, 0.1)',
            borderWidth: 2,
            fill: true,
            pointRadius: 0,
            tension: 0.3
          },
          {
            label: 'Current AoA',
            data: [],
            borderColor: '#e74c3c',
            backgroundColor: '#e74c3c',
            pointRadius: 8,
            pointStyle: 'circle',
            showLine: false
          }
        ]
      },
      options: {
        ...CHART_DEFAULTS,
        scales: {
          x: {
            ...darkScale(),
            title: { display: true, text: 'Angle of Attack (°)', color: '#999' },
            type: 'linear',
            min: -5,
            max: 20
          },
          y: {
            ...darkScale(),
            title: { display: true, text: 'CL', color: '#999' }
          }
        }
      }
    });
  }

  function computeCL(aoa) {
    // NACA 4412 approximate: CL0 ≈ 0.4, slope ≈ 0.11/deg, stall ≈ 15°
    const cl0 = 0.4;
    const slope = 0.11;
    const stallAoA = 15;
    if (aoa <= stallAoA) {
      return cl0 + slope * aoa;
    } else {
      // Post-stall drop
      const clMax = cl0 + slope * stallAoA;
      const drop = (aoa - stallAoA) * 0.15;
      return Math.max(clMax - drop, 0.2);
    }
  }

  /* ── Update Functions ── */

  function updatePerformance(report) {
    if (!radarChart) return;

    // Normalize values to 0-100 scale for radar
    const normalize = (val, min, max) => Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));

    radarChart.data.datasets[0].data = [
      normalize(report.wingLoading.value, 0, 40),
      normalize(report.powerToWeight.value, 0, 250),
      normalize(report.thrustToWeight.value, 0, 2),
      normalize(report.aspectRatio.value, 0, 20),
      normalize(report.flightTime.value, 0, 30),
      normalize(report.topSpeed.kph, 0, 200)
    ];
    radarChart.update('none');
  }

  function updateBudget(costs) {
    if (!budgetDonut) return;

    const labelMap = {
      motor: 'Motor', esc: 'ESC', battery: 'Battery', servos: 'Servos',
      prop: 'Propeller', receiver: 'Receiver', fpv: 'FPV',
      mat_fuselage: 'Fuselage Mat.', mat_wing: 'Wing Mat.',
      mat_tail: 'Tail Mat.', mat_mount: 'Mount Mat.', misc: 'Hardware/Misc'
    };

    const entries = Object.entries(costs).filter(([k]) => k !== 'total' && costs[k] > 0);
    budgetDonut.data.labels = entries.map(([k]) => labelMap[k] || k);
    budgetDonut.data.datasets[0].data = entries.map(([, v]) => v);
    budgetDonut.update('none');

    if (costBarChart) {
      costBarChart.data.labels = entries.map(([k]) => labelMap[k] || k);
      costBarChart.data.datasets[0].data = entries.map(([, v]) => v);
      costBarChart.update('none');
    }
  }

  function updateCLMarker(aoa) {
    if (!clChart) return;
    const cl = computeCL(aoa);
    clChart.data.datasets[1].data = [{ x: aoa, y: cl }];
    clChart.update('none');
  }

  return {
    initRadarChart, initBudgetDonut, initCostBar, initCLChart,
    updatePerformance, updateBudget, updateCLMarker,
    computeCL
  };
})();
