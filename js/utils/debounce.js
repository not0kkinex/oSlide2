function createRenderDebouncer() {
  let timeout
  let pending = []
  return {
    schedule(fn) {
      pending.push(fn)
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        const batch = pending.slice()
        pending = []
        for (const f of batch) f()
      }, 16)
    },
    flush() {
      clearTimeout(timeout)
      const batch = pending.slice()
      pending = []
      for (const f of batch) f()
    }
  }
}

window.createRenderDebouncer = createRenderDebouncer
