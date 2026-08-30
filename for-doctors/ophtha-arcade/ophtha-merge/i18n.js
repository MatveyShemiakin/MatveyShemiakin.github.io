const TILE_LABELS = {
  ru: new Map([
    [2, 'Капля'],
    [4, 'Хрусталик'],
    [8, 'Роговица'],
    [16, 'Радужка'],
    [32, 'Сетчатка'],
    [64, 'ИОЛ'],
    [128, 'ОСТ'],
    [256, 'Лазер'],
    [512, 'Микроскоп']
  ]),
  en: new Map([
    [2, 'Drop'],
    [4, 'Crystalline lens'],
    [8, 'Cornea'],
    [16, 'Iris'],
    [32, 'Retina'],
    [64, 'IOL'],
    [128, 'OCT'],
    [256, 'Laser'],
    [512, 'Microscope']
  ])
};

const UI = {
  ru: {
    profileLevel: 'Уровень',
    defaultDoctor: 'Доктор',
    gameOverTime: '60 секунд закончились',
    gameOverMoves: 'Ходов больше нет',
    score: 'Счёт',
    tile: 'плитка',
    undoDone: 'Последний ход отменён',
    newGame: 'Новая партия',
    milestoneLevel: 'уровень',
    milestoneCopyPrefix: 'Плитка',
    milestoneCopySuffix: 'достигнута. Игра продолжается — следующего предела нет.',
    saved: 'Прогресс сохранён',
    autosave: 'Прогресс сохраняется автоматически',
    currentRank: 'Ваш текущий ранг',
    leaderboardUnavailable: 'Рейтинг временно недоступен. Игра и локальный прогресс продолжают работать.',
    firstInRanking: 'Будьте первым в рейтинге.',
    offline: 'Офлайн: локальная игра доступна.',
    loading: 'Загрузка…',
    rankingEmpty: 'Рейтинг пока пуст.',
    rankingLoadFailed: 'Не удалось загрузить рейтинг. Попробуйте позже.',
    sharePoints: 'очков',
    shareChallenge: 'Сможете выше?',
    resultCopied: 'Результат скопирован',
    on: 'Вкл',
    off: 'Выкл',
    restored: 'Партия восстановлена'
  },
  en: {
    profileLevel: 'Level',
    defaultDoctor: 'Doctor',
    gameOverTime: '60 seconds are up',
    gameOverMoves: 'No moves left',
    score: 'Score',
    tile: 'tile',
    undoDone: 'Last move undone',
    newGame: 'New game',
    milestoneLevel: 'level',
    milestoneCopyPrefix: 'Tile',
    milestoneCopySuffix: 'reached. The game continues — there is no final cap.',
    saved: 'Progress saved',
    autosave: 'Progress saves automatically',
    currentRank: 'Your current rank',
    leaderboardUnavailable: 'Leaderboard is temporarily unavailable. Local play and progress still work.',
    firstInRanking: 'Be the first on the leaderboard.',
    offline: 'Offline: local game is available.',
    loading: 'Loading…',
    rankingEmpty: 'The leaderboard is empty.',
    rankingLoadFailed: 'Could not load the leaderboard. Try again later.',
    sharePoints: 'points',
    shareChallenge: 'Can you beat it?',
    resultCopied: 'Result copied',
    on: 'On',
    off: 'Off',
    restored: 'Game restored'
  }
};

function normalizeLanguage(language) {
  return String(language || '').toLowerCase().startsWith('en') ? 'en' : 'ru';
}

export function tileLabel(value, language = 'ru') {
  const lang = normalizeLanguage(language);
  const exact = TILE_LABELS[lang].get(Number(value));
  if (exact) return exact;
  const level = Math.log2(Number(value) || 1024);
  return level === 10 ? 'Legendary IOL' : `Legendary IOL · L${Math.max(1, level - 9)}`;
}

export function uiText(key, language = 'ru') {
  const lang = normalizeLanguage(language);
  return UI[lang][key] ?? UI.ru[key] ?? String(key);
}

export function pageLanguage(documentElement = globalThis.document?.documentElement) {
  return normalizeLanguage(documentElement?.lang || 'ru');
}
