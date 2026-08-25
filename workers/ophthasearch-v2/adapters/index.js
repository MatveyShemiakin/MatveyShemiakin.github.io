function boundedTimeout(value, fallback = 2500) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(10000, Math.max(10, Math.round(number)));
}

async function runOne(name, adapter, track, options) {
  const timeoutMs = boundedTimeout(options.timeoutMs);
  const controller = new AbortController();
  let timer;
  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => {
      controller.abort(`OphthaSearch ${name} deadline exceeded`);
      resolve({ status: 'timeout', records: [], error: 'deadline-exceeded' });
    }, timeoutMs);
  });

  const adapterPromise = Promise.resolve()
    .then(() => adapter(track, { ...(options.sharedDeps || {}), signal: controller.signal }))
    .then((value) => ({ status: 'fulfilled', records: Array.isArray(value?.records) ? value.records : [], total: Number(value?.total || value?.records?.length || 0) }))
    .catch((error) => ({ status: controller.signal.aborted ? 'timeout' : 'rejected', records: [], error: String(error?.message || error || 'adapter-error') }));

  const result = await Promise.race([adapterPromise, timeoutPromise]);
  clearTimeout(timer);
  return result;
}

export async function runAdaptersWithDeadlines(track, adapters = {}, options = {}) {
  const entries = Object.entries(adapters).filter(([, adapter]) => typeof adapter === 'function');
  const settled = await Promise.all(entries.map(async ([name, adapter]) => [name, await runOne(name, adapter, track, options)]));
  return Object.fromEntries(settled);
}
