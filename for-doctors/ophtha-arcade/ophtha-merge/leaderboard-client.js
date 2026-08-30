const WORKER_ORIGIN = 'https://matveyshemiakin-github-io.matvei-shemyakin.workers.dev';

function apiUrl(path) {
  if (globalThis.location?.hostname?.endsWith('workers.dev')) return path;
  return `${WORKER_ORIGIN}${path}`;
}

async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok === false) {
    const error = new Error(body.error || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

export async function loadLeaderboard(mode = 'classic', limit = 20) {
  return request(`/api/ophtha-merge/leaderboard?mode=${encodeURIComponent(mode)}&limit=${limit}`);
}

export async function submitScore(profile, state, durationMs) {
  return request('/api/ophtha-merge/score', {
    method: 'POST',
    body: JSON.stringify({
      playerId: profile.playerId,
      displayName: profile.displayName,
      score: state.score,
      maxTile: state.maxTile,
      moves: state.moves,
      durationMs: Math.max(0, Math.round(durationMs)),
      mode: state.mode
    })
  });
}
