const CHART_COLORS = {
  bright: ['#ffd700','#ff6b6b','#4ecdc4','#45b7d1','#96ceb4','#ffeaa7','#dfe6e9','#a29bfe','#fd79a8','#6c5ce7'],
  pastel: ['#ffd93d','#ff8a5c','#6c5b7b','#355c7d','#99b898','#feceab','#e84a5f','#2a363b','#f8b500','#00b4d9']
}

function chartSuggest(data) {
  const values = data.map(Number).filter(n => !isNaN(n))
  const labels = data.filter(d => isNaN(Number(d)) && d.trim())
  const nums = data.filter(d => !isNaN(Number(d))).map(Number)
  const result = { chartType: 'bar', title: '', data: { labels: [], datasets: [] }, options: {}, insights: [], warnings: [] }

  if (nums.length === 0) {
    result.warnings.push('No numeric data found')
    return result
  }

  const sum = nums.reduce((a, b) => a + b, 0)
  const avg = sum / nums.length
  const sorted = [...nums].sort((a, b) => a - b)
  const median = sorted.length % 2 === 0 ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)]
  const min = sorted[0]
  const max = sorted[sorted.length - 1]

  result.insights.push(`${nums.length} data points, range: ${min} - ${max}, avg: ${avg.toFixed(1)}`)

  const q1 = sorted[Math.floor(sorted.length * 0.25)]
  const q3 = sorted[Math.floor(sorted.length * 0.75)]
  const iqr = q3 - q1
  const outliers = nums.filter(n => n < q1 - 1.5 * iqr || n > q3 + 1.5 * iqr)
  if (outliers.length > 0) {
    result.warnings.push(`${outliers.length} outlier(s) detected: ${outliers.join(', ')}`)
  }

  if (nums.some(n => n < 0)) {
    result.warnings.push('Negative values detected')
  }

  if (nums.length > 10) {
    result.chartType = 'line'
    result.insights.push('More than 10 data points — line chart recommended for trend visibility')
    const increasing = nums.every((n, i) => i === 0 || n > nums[i - 1])
    const decreasing = nums.every((n, i) => i === 0 || n < nums[i - 1])
    if (increasing) result.insights.push('Upward trend detected')
    if (decreasing) result.insights.push('Downward trend detected')
  } else if (nums.length <= 5) {
    result.chartType = 'pie'
    result.insights.push('Few data points — pie chart for composition')
  } else {
    const unique = new Set(nums.map(n => Math.round(n)))
    if (unique.size <= 5) {
      result.chartType = 'bar'
      result.insights.push('Categorical data — bar chart for comparison')
    } else {
      result.chartType = 'bar'
      result.insights.push('Multiple categories — bar chart recommended')
    }
  }

  const colors = CHART_COLORS.bright.slice(0, nums.length)
  result.data = {
    labels: labels.length === nums.length ? labels : nums.map((_, i) => String(i + 1)),
    datasets: [{
      label: 'Values',
      data: nums,
      backgroundColor: result.chartType === 'line' ? colors[0] : colors,
      borderColor: result.chartType === 'line' ? colors[0] : colors,
      borderWidth: 1,
      tension: 0.3,
      fill: result.chartType === 'line'
    }]
  }

  result.options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: nums.length <= 10 },
      tooltip: { enabled: true }
    },
    scales: result.chartType !== 'pie' && result.chartType !== 'doughnut' ? {
      y: { beginAtZero: true },
      x: { grid: { display: false } }
    } : undefined
  }

  return result
}

function chartParseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return null
  const headers = lines[0].split(',').map(h => h.trim())
  const data = { labels: [], datasets: [] }

  if (headers.length >= 2) {
    const labelCol = headers[0]
    const labels = []
    const values = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim())
      if (cols.length >= 2) {
        labels.push(cols[0])
        values.push(parseFloat(cols[1]) || 0)
      }
    }
    data.labels = labels
    data.datasets = [{ label: headers[1], data: values, backgroundColor: CHART_COLORS.bright.slice(0, values.length), borderWidth: 1 }]
  }
  return data
}

window.chartSuggest = chartSuggest
window.chartParseCSV = chartParseCSV
