const chartInstances = new Map()

function chartDestroy(elId) {
  const inst = chartInstances.get(elId)
  if (inst) { inst.destroy(); chartInstances.delete(elId) }
}

function chartRender(canvas, el) {
  if (!canvas || !el) return
  chartDestroy(el.id)

  const data = el.chartData || { labels: ['A','B','C'], datasets: [{ label: 'Veri', data: [10,20,30], backgroundColor: ['#ffd700','#ff6b6b','#4ecdc4'] }] }
  const type = el.chartType || 'bar'
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    animation: { duration: 300 },
    plugins: {
      legend: {
        display: type !== 'bar' && type !== 'line' || (data.datasets?.[0]?.data?.length || 0) <= 10,
        position: 'bottom',
        labels: { boxWidth: 12, padding: 8, font: { size: 10 } }
      },
      tooltip: { enabled: true }
    }
  }

  if (type !== 'pie' && type !== 'doughnut' && type !== 'polarArea') {
    options.scales = {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  }

  try {
    const inst = new Chart(ctx, { type, data, options })
    chartInstances.set(el.id, inst)
  } catch (e) {
    console.warn('Chart render error:', e)
  }
}

window.chartInstances = chartInstances
window.chartDestroy = chartDestroy
window.chartRender = chartRender
