(function () {
  const HANDOFF_KEY = 'hop.contract.handoff.v1';
  const DRAFT_KEY = 'hop.contract.geerDraft.v1';
  const LEGACY_TEXT_KEY = 'hop.geer.handoffText';
  const LEGACY_SOURCE_KEY = 'hop.geer.handoffSource';

  function safeParse(json, fallback) {
    try {
      return JSON.parse(json);
    } catch (_error) {
      return fallback;
    }
  }

  function normalizeSourceType(sourceType) {
    const value = (sourceType || '').toLowerCase();
    if (value === 'custom') return 'custom';
    if (value === 'library') return 'library';
    return 'greech';
  }

  function normalizeLanguage(language) {
    return language === 'hy' ? 'hy' : 'en';
  }

  function setHandoff(payload) {
    const text = (payload && payload.text ? String(payload.text) : '').trim();
    if (!text) return null;

    const handoff = {
      id: `handoff-${Date.now()}`,
      text,
      sourceType: normalizeSourceType(payload.sourceType),
      sourceApp: (payload.sourceApp || 'greech').toLowerCase(),
      selectedTextId: payload.selectedTextId || '',
      language: normalizeLanguage(payload.language),
      context: payload.context || {},
      createdAt: Date.now(),
    };

    localStorage.setItem(HANDOFF_KEY, JSON.stringify(handoff));
    localStorage.setItem(LEGACY_TEXT_KEY, handoff.text);
    localStorage.setItem(LEGACY_SOURCE_KEY, handoff.sourceType === 'custom' ? 'custom' : 'greech');
    return handoff;
  }

  function getHandoff() {
    const raw = localStorage.getItem(HANDOFF_KEY);
    const value = safeParse(raw || '', null);
    if (value && value.text) return value;

    const legacyText = (localStorage.getItem(LEGACY_TEXT_KEY) || '').trim();
    if (!legacyText) return null;
    return {
      id: 'legacy-handoff',
      text: legacyText,
      sourceType: normalizeSourceType(localStorage.getItem(LEGACY_SOURCE_KEY) || 'greech'),
      sourceApp: 'legacy',
      selectedTextId: '',
      language: 'hy',
      context: {},
      createdAt: 0,
    };
  }

  function clearHandoff() {
    localStorage.removeItem(HANDOFF_KEY);
    localStorage.removeItem(LEGACY_TEXT_KEY);
    localStorage.removeItem(LEGACY_SOURCE_KEY);
  }

  function setGeerDraft(payload) {
    const record = {
      text: payload && payload.text ? String(payload.text) : '',
      sourceType: normalizeSourceType(payload && payload.sourceType),
      language: normalizeLanguage(payload && payload.language),
      updatedAt: Date.now(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(record));
    localStorage.setItem('hop.geer.draftText', record.text);
    localStorage.setItem('hop.geer.draftSource', record.sourceType === 'custom' ? 'custom' : 'greech');
    return record;
  }

  function getGeerDraft() {
    const raw = localStorage.getItem(DRAFT_KEY);
    const value = safeParse(raw || '', null);
    if (value && typeof value.text === 'string') return value;

    return {
      text: localStorage.getItem('hop.geer.draftText') || '',
      sourceType: normalizeSourceType(localStorage.getItem('hop.geer.draftSource') || 'custom'),
      language: 'hy',
      updatedAt: 0,
    };
  }

  window.HopContract = {
    setHandoff,
    getHandoff,
    clearHandoff,
    setGeerDraft,
    getGeerDraft,
    keys: {
      handoff: HANDOFF_KEY,
      draft: DRAFT_KEY,
    },
  };
})();
