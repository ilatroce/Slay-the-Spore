(function () {
  const RUN_SAVE_KEY = 'slayTheSporeRunStateV1';
  const RUN_SAVE_VERSION = 1;

  function normalizeMutationChoices(choices) {
    const source = choices && typeof choices === 'object' ? choices : {};
    return {
      tier1: source.tier1 || null,
      tier2: source.tier2 || null,
      tier3: source.tier3 || null
    };
  }

  function cloneMutationStateForSave(state) {
    const source = state && typeof state === 'object' ? state : {};
    return {
      evolutionCount: Math.max(0, Number(source.evolutionCount) || 0),
      choices: normalizeMutationChoices(source.choices)
    };
  }

  function deckToIds(deck) {
    return (Array.isArray(deck) ? deck : [])
      .map((entry) => {
        if (typeof entry === 'string') return entry;
        return entry && typeof entry === 'object' ? entry.id : '';
      })
      .filter(Boolean);
  }

  function idsToDeck(ids) {
    if (typeof getCardById !== 'function') return [];
    return (Array.isArray(ids) ? ids : [])
      .map((id) => getCardById(id))
      .filter(Boolean);
  }

  function loadRunState() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(RUN_SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function saveRunState(state) {
    if (typeof localStorage === 'undefined') return false;
    try {
      localStorage.setItem(RUN_SAVE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      return false;
    }
  }

  function clearRunState() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(RUN_SAVE_KEY);
    } catch (error) {
      // Ignore localStorage failures so the game still runs.
    }
  }

  if (typeof window !== 'undefined') {
    window.SLAY_THE_SPORE_RUN_SAVE_KEY = RUN_SAVE_KEY;
    window.SLAY_THE_SPORE_RUN_SAVE_VERSION = RUN_SAVE_VERSION;
    window.normalizeMutationChoices = normalizeMutationChoices;
    window.cloneMutationStateForSave = cloneMutationStateForSave;
    window.deckToIds = deckToIds;
    window.idsToDeck = idsToDeck;
    window.loadRunState = loadRunState;
    window.saveRunState = saveRunState;
    window.clearRunState = clearRunState;
  }
})();
