// HayOSClient.js - Standalone client for iframe apps
(function() {
    'use strict';

    const SYSTEM_SETTINGS_LOCAL_STORAGE_KEY = 'hayos.settings';
    const SYSTEM_SETTINGS_BOOTSTRAP_LOCAL_STORAGE_KEY = 'hayos.features.systemSettingsBootstrap';
    const SYSTEM_SETTINGS_BOOTSTRAP_URL_PARAM = 'settingsBootstrap';
    const DEFAULT_SYSTEM_SETTINGS = {
      version: 1,
      language: 'en',
      theme: 'black',
      updatedAt: new Date(0).toISOString(),
    };
    const ALLOWED_DAISY_THEMES = new Set([
      'light', 'dark', 'cupcake', 'bumblebee', 'emerald', 'corporate', 'synthwave', 'retro',
      'cyberpunk', 'valentine', 'halloween', 'garden', 'forest', 'aqua', 'lofi', 'pastel',
      'fantasy', 'wireframe', 'black', 'luxury', 'dracula', 'cmyk', 'autumn', 'business',
      'acid', 'lemonade', 'night', 'coffee', 'winter', 'dim', 'nord', 'sunset', 'caramellatte',
      'abyss', 'silk',
    ]);
    const LEGACY_LANGUAGE_KEYS = ['hayos.language', 'ui.language', 'language'];
    const LEGACY_THEME_KEYS = ['hayos.theme', 'ui.theme', 'selectedTheme', 'theme'];

    function parseFlag(value) {
      if (typeof value === 'boolean') return value;
      if (typeof value !== 'string') return null;
      const normalized = value.trim().toLowerCase();
      if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
        return true;
      }
      if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
        return false;
      }
      return null;
    }

    function isSystemSettingsBootstrapEnabled() {
      try {
        const url = new URL(window.location.href);
        const queryOverride = parseFlag(url.searchParams.get(SYSTEM_SETTINGS_BOOTSTRAP_URL_PARAM));
        if (queryOverride !== null) {
          return queryOverride;
        }
      } catch {
        // ignore URL parsing failure
      }
      try {
        const stored = parseFlag(window.localStorage.getItem(SYSTEM_SETTINGS_BOOTSTRAP_LOCAL_STORAGE_KEY));
        if (stored !== null) {
          return stored;
        }
      } catch {
        // ignore localStorage read failure
      }
      return true;
    }
  
    if (window.HayOSClient) {
      // no-op: avoid duplicate-load console noise
      return;
    }
  
    /**
     * HayOSClient - Communication bridge between iframe apps and HayOS shell
     */
    class HayOSClient {
      /**
       * @param {string} appId - Your app's unique identifier (must match appRegistry)
       */
      constructor(appId) {
        if (!appId || typeof appId !== 'string') {
          throw new Error('appId is required and must be a string');
        }
  
        this.appId = appId;
        this.pending = new Map();
        this.authStateListeners = [];
        this.languageListeners = [];
        this.socialProfileListeners = [];
        this.friendsChangedListeners = [];
        this.debugTraceListeners = [];
        this.hostContextListeners = [];
        this.systemSettingsBootstrapEnabled = isSystemSettingsBootstrapEnabled();
        this._messageHandler = this._handleMessage.bind(this);
        
        // Start listening for messages from parent (HayOS shell)
        window.addEventListener('message', this._messageHandler);
        
        // initialization successful
      }
      _normalizeLanguage(language, fallback = DEFAULT_SYSTEM_SETTINGS.language) {
        const normalized = typeof language === 'string' ? language.trim().toLowerCase() : '';
        return normalized === 'hy' || normalized === 'en' ? normalized : fallback;
      }
      _normalizeTheme(theme, fallback = DEFAULT_SYSTEM_SETTINGS.theme) {
        const normalized = typeof theme === 'string' ? theme.trim() : '';
        if (!normalized) return fallback;
        return ALLOWED_DAISY_THEMES.has(normalized) ? normalized : fallback;
      }
      _readFirstStorageValue(keys) {
        for (const key of keys) {
          try {
            const value = window.localStorage.getItem(key);
            if (typeof value === 'string' && value.trim().length > 0) {
              return value;
            }
          } catch {
            // ignore localStorage read failures
          }
        }
        return null;
      }
      _readLegacySystemSettings() {
        const rawLanguage = this._readFirstStorageValue(LEGACY_LANGUAGE_KEYS);
        const rawTheme = this._readFirstStorageValue(LEGACY_THEME_KEYS);
        return {
          version: 1,
          language: this._normalizeLanguage(rawLanguage, DEFAULT_SYSTEM_SETTINGS.language),
          theme: this._normalizeTheme(rawTheme, DEFAULT_SYSTEM_SETTINGS.theme),
          updatedAt: new Date().toISOString(),
        };
      }
      _readCachedSystemSettings() {
        try {
          const raw = window.localStorage.getItem(SYSTEM_SETTINGS_LOCAL_STORAGE_KEY);
          if (!raw) {
            const migrated = this._readLegacySystemSettings();
            try {
              window.localStorage.setItem(SYSTEM_SETTINGS_LOCAL_STORAGE_KEY, JSON.stringify(migrated));
            } catch {
              // ignore storage write failures
            }
            return migrated;
          }
          const parsed = JSON.parse(raw);
          if (!parsed || typeof parsed !== 'object') {
            const migrated = this._readLegacySystemSettings();
            try {
              window.localStorage.setItem(SYSTEM_SETTINGS_LOCAL_STORAGE_KEY, JSON.stringify(migrated));
            } catch {
              // ignore storage write failures
            }
            return migrated;
          }
          const hasCurrentVersion = parsed.version === 1;
          const legacyFallback = this._readLegacySystemSettings();
          const normalized = {
            version: 1,
            language: this._normalizeLanguage(parsed.language, legacyFallback.language),
            theme: this._normalizeTheme(parsed.theme, legacyFallback.theme),
            updatedAt: typeof parsed.updatedAt === 'string' && parsed.updatedAt.trim().length > 0
              ? parsed.updatedAt
              : legacyFallback.updatedAt,
          };
          if (!hasCurrentVersion) {
            try {
              window.localStorage.setItem(SYSTEM_SETTINGS_LOCAL_STORAGE_KEY, JSON.stringify(normalized));
            } catch {
              // ignore storage write failures
            }
          }
          return normalized;
        } catch {
          return this._readLegacySystemSettings();
        }
      }
      _patchSystemSettingsInStorage(patch) {
        const existing = this._readCachedSystemSettings();
        const next = {
          version: 1,
          language: Object.prototype.hasOwnProperty.call(patch || {}, 'language')
            ? this._normalizeLanguage(patch.language, existing.language)
            : existing.language,
          theme: Object.prototype.hasOwnProperty.call(patch || {}, 'theme')
            ? this._normalizeTheme(patch.theme, existing.theme)
            : existing.theme,
          updatedAt: patch && typeof patch.updatedAt === 'string' && patch.updatedAt.trim().length > 0
            ? patch.updatedAt
            : new Date().toISOString(),
        };
        try {
          window.localStorage.setItem(SYSTEM_SETTINGS_LOCAL_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore storage write failures
        }
        return next;
      }
      _syncSystemModuleValueInBackground(key) {
        this._sendRequest({ kind: 'module.getValue', key })
          .then((response) => {
            if (!response.ok || response.action !== 'module.getValue') return;
            if (key === 'ui.language') {
              this._patchSystemSettingsInStorage({ language: response.value });
              return;
            }
            if (key === 'ui.theme') {
              this._patchSystemSettingsInStorage({ theme: response.value });
            }
          })
          .catch(() => {
            // ignore background sync failures
          });
      }
      _emitDebug(detail) {
        try {
          window.dispatchEvent(new CustomEvent('hayos:client-debug', {
            detail: {
              appId: this.appId,
              hop: 'client',
              ts: Date.now(),
              ...(detail || {}),
            },
          }));
        } catch {
          // ignore debug event failures
        }
      }

      _isAuthOrPermissionSyncError(response) {
        if (!response || response.ok) return false;
        const errorText = typeof response.error === 'string' ? response.error.toLowerCase() : '';
        return errorText.includes('missing or insufficient permissions')
          || errorText.includes('not authenticated')
          || errorText.includes('auth context is missing');
      }

      async _waitForAuthenticatedSession(options = {}) {
        const retries = Number.isFinite(options.retries) ? Math.max(1, Math.floor(options.retries)) : 3;
        const delayMs = Number.isFinite(options.delayMs) ? Math.max(40, Math.floor(options.delayMs)) : 140;
        let lastError = null;

        for (let attempt = 0; attempt < retries; attempt += 1) {
          try {
            const user = await this.getCurrentUser();
            if (!user || typeof user.uid !== 'string' || user.uid.trim().length === 0) {
              throw new Error('Not authenticated');
            }
            const idToken = await this.getIdToken(attempt > 0);
            if (!idToken) {
              throw new Error('Failed to get ID token');
            }
            return { user, idToken };
          } catch (error) {
            lastError = error;
            if (attempt >= retries - 1) break;
            await new Promise((resolve) => window.setTimeout(resolve, delayMs * (attempt + 1)));
          }
        }

        if (lastError instanceof Error) throw lastError;
        throw new Error('Not authenticated');
      }

      async _sendFirestoreRequestWithAuthRetry(action, expectedAction, fallbackError) {
        await this._waitForAuthenticatedSession({ retries: 3, delayMs: 120 });

        let response = await this._sendRequest(action);
        if (this._isAuthOrPermissionSyncError(response)) {
          this._emitDebug({
            stage: 'firestore.auth_retry',
            action: action && action.kind ? action.kind : '',
            error: response && response.error ? response.error : '',
          });
          await this.getIdToken(true).catch(() => null);
          await new Promise((resolve) => window.setTimeout(resolve, 180));
          response = await this._sendRequest(action);
        }

        if (!response.ok || response.action !== expectedAction) {
          throw new Error(response.error || fallbackError);
        }
        return response;
      }

/**
 * Firestore: get document(s)
 * @param {string} collection
 * @param {string} [documentId]
 * @returns {Promise<any>}
 */
async firestoreGet(collection, documentId) {
    const response = await this._sendFirestoreRequestWithAuthRetry({
      kind: 'firestore.get',
      collection,
      documentId
    }, 'firestore.get', 'Failed to get document');
    return response.data;
  }
  
  /**
   * Firestore: add document
   * @param {string} collection
   * @param {Object} data
   * @returns {Promise<string>} Document ID
   */
  async firestoreAdd(collection, data) {
    const response = await this._sendFirestoreRequestWithAuthRetry({
      kind: 'firestore.add',
      collection,
      data
    }, 'firestore.add', 'Failed to add document');
    return response.id;
  }
  
  /**
   * Firestore: update document
   * @param {string} collection
   * @param {string} documentId
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async firestoreUpdate(collection, documentId, data) {
    await this._sendFirestoreRequestWithAuthRetry({
      kind: 'firestore.update',
      collection,
      documentId,
      data
    }, 'firestore.update', 'Failed to update document');
  }
  
  /**
   * Firestore: delete document
   * @param {string} collection
   * @param {string} documentId
   * @returns {Promise<void>}
   */
  async firestoreDelete(collection, documentId) {
    await this._sendFirestoreRequestWithAuthRetry({
      kind: 'firestore.delete',
      collection,
      documentId
    }, 'firestore.delete', 'Failed to delete document');
  }
  
  /**
   * Firestore: query documents
   * @param {string} collection
   * @param {Object} queryParams
   * @returns {Promise<Array>}
   */
  async firestoreQuery(collection, queryParams) {
    const response = await this._sendFirestoreRequestWithAuthRetry({
      kind: 'firestore.query',
      collection,
      queryParams
    }, 'firestore.query', 'Failed to query documents');
    return response.data;
  }
      /**
       * Handle incoming messages from HayOS shell
       * @private
       */
      _handleMessage(event) {
        // Security: You might want to check event.origin here
        // For development, we accept all origins
        
        const data = event.data;
        if (!data) return;
        
        if (data.type === 'hayos:response') {
          const traceId = typeof data.requestId === 'string' ? data.requestId : '';
          this._emitDebug({
            stage: 'response.received',
            traceId,
            ok: data.ok === true,
            action: data.action || '',
            error: data.error || '',
          });
          const callback = this.pending.get(data.requestId);
          if (callback) {
            callback(data);
            this.pending.delete(data.requestId);
          } else {
            this._emitDebug({
              stage: 'response.late_or_unknown',
              traceId,
              ok: data.ok === true,
              action: data.action || '',
              error: data.error || '',
            });
          }
          return;
        }

        if (
          data.type === 'hayos:systemEvent' &&
          data.event === 'languageChanged' &&
          data.payload &&
          (data.payload.language === 'hy' || data.payload.language === 'en')
        ) {
          this._patchSystemSettingsInStorage({ language: data.payload.language });
          this.languageListeners.forEach((callback) => {
            try {
              callback(data.payload.language);
            } catch (error) {
              console.error('Error in language listener:', error);
            }
          });
          return;
        }

        if (
          data.type === 'hayos:systemEvent' &&
          data.event === 'themeChanged' &&
          data.payload &&
          typeof data.payload.theme === 'string'
        ) {
          this._patchSystemSettingsInStorage({ theme: data.payload.theme });
          return;
        }

        if (
          data.type === 'hayos:systemEvent' &&
          data.event === 'settings.bootstrap' &&
          data.payload &&
          typeof data.payload === 'object'
        ) {
          this._patchSystemSettingsInStorage({
            language: data.payload.language,
            theme: data.payload.theme,
          });
          return;
        }

        if (
          data.type === 'hayos:systemEvent' &&
          data.event === 'social.profile.updated' &&
          data.payload &&
          typeof data.payload.uid === 'string'
        ) {
          const payload = {
            uid: data.payload.uid.trim(),
            updatedAt: typeof data.payload.updatedAt === 'string' ? data.payload.updatedAt : '',
            schemaVersion: typeof data.payload.schemaVersion === 'number' && Number.isFinite(data.payload.schemaVersion)
              ? Math.max(1, Math.floor(data.payload.schemaVersion))
              : 2,
          };
          this.socialProfileListeners.forEach((callback) => {
            try {
              callback(payload);
            } catch (error) {
              console.error('Error in social profile listener:', error);
            }
          });
          return;
        }

        if (
          data.type === 'hayos:systemEvent' &&
          data.event === 'friends.changed' &&
          data.payload &&
          typeof data.payload === 'object'
        ) {
          const payload = data.payload;
          const normalized = {
            reason: typeof payload.reason === 'string' ? payload.reason : 'unknown',
            actorUid: typeof payload.actorUid === 'string' ? payload.actorUid.trim() : '',
            peerUid: typeof payload.peerUid === 'string' ? payload.peerUid.trim() : '',
            at: typeof payload.at === 'string' ? payload.at : new Date().toISOString(),
          };
          this.friendsChangedListeners.forEach((listener) => {
            listener(normalized);
          });
          return;
        }

        if (
          data.type === 'hayos:systemEvent' &&
          data.event === 'debug.trace' &&
          data.payload &&
          typeof data.payload === 'object'
        ) {
          this.debugTraceListeners.forEach((callback) => {
            try {
              callback(data.payload);
            } catch (error) {
              console.error('Error in debug trace listener:', error);
            }
          });
          return;
        }

        if (
          data.type === 'hayos:moduleEvent' &&
          data.event === 'host.context.update' &&
          data.payload &&
          typeof data.payload.hostAppId === 'string' &&
          typeof data.payload.mountId === 'string' &&
          typeof data.payload.mode === 'string' &&
          typeof data.payload.sessionId === 'string'
        ) {
          this.hostContextListeners.forEach((callback) => {
            try {
              callback(data.payload);
            } catch (error) {
              console.error('Error in host context listener:', error);
            }
          });
          return;
        }
        
        // Also handle auth state change broadcasts
        if (data.type === 'hayos:authStateChanged') {
          this._notifyAuthStateListeners(data.user);
        }
      }
  
      /**
       * Send request to HayOS shell
       * @private
       */
      _sendRequest(action) {
        return new Promise((resolve) => {
          const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          
          const request = {
            type: 'hayos:request',
            requestId: requestId,
            sourceAppId: this.appId,
            action: action
          };
          
          this.pending.set(requestId, resolve);
          this._emitDebug({
            stage: 'request.sent',
            traceId: requestId,
            action: action && action.kind ? action.kind : '',
          });
          
          // Send to parent window (HayOS shell)
          window.parent.postMessage(request, '*');
          
          // Timeout for safety
          setTimeout(() => {
            if (this.pending.has(requestId)) {
              this.pending.delete(requestId);
              this._emitDebug({
                stage: 'request.timeout',
                traceId: requestId,
                action: action && action.kind ? action.kind : '',
              });
              resolve({
                type: 'hayos:response',
                requestId: requestId,
                ok: false,
                error: 'Request timeout'
              });
            }
          }, 30000);
        });
      }

      _isHostedContext() {
        const params = new URLSearchParams(window.location.search);
        const hostAppId = params.get('hostAppId');
        const hostSessionId = params.get('hostSessionId');
        const moduleMode = params.get('moduleMode');
        return Boolean(hostAppId && hostSessionId && moduleMode);
      }

      _postModuleEvent(eventName, payload) {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('hostSessionId') || undefined;
        window.parent.postMessage({
          type: 'hayos:moduleEvent',
          event: eventName,
          payload: payload || {},
          sessionId,
          fromAppId: this.appId,
        }, '*');
      }
  
      /**
       * Get current authenticated user
       * @returns {Promise<{uid: string, email: string|null, displayName: string|null, photoURL: string|null}|null>}
       */
      async getCurrentUser() {
        const response = await this._sendRequest({ kind: 'auth.getUser' });
        if (!response.ok || response.action !== 'auth.getUser') return null;
        return response.user;
      }
  
      /**
       * Get ID token for current user
       * @param {boolean} forceRefresh - Force token refresh
       * @returns {Promise<string|null>}
       */
      async getIdToken(forceRefresh = false) {
        const response = await this._sendRequest({ 
          kind: 'auth.getIdToken', 
          forceRefresh: forceRefresh 
        });
        if (!response.ok || response.action !== 'auth.getIdToken') return null;
        return response.idToken;
      }
  
      /**
       * Sign out current user
       * @returns {Promise<boolean>}
       */
      async signOut() {
        const response = await this._sendRequest({ kind: 'auth.signOut' });
        return response.ok && response.action === 'auth.signOut';
      }

      async firebaseConfigGet() {
        const response = await this._sendRequest({ kind: 'firebase.config.get' });
        if (!response.ok || response.action !== 'firebase.config.get') {
          throw new Error(response.error || 'Failed to load firebase config');
        }
        return response.data;
      }

      /**
       * Resolve an OS module value by key (via HayOS broker)
       * @param {string} key
       * @returns {Promise<any|null>}
       */
      async getModuleValue(key) {
        if (this.systemSettingsBootstrapEnabled && key === 'ui.language') {
          const cached = this._readCachedSystemSettings().language;
          this._syncSystemModuleValueInBackground('ui.language');
          return cached;
        }
        if (this.systemSettingsBootstrapEnabled && key === 'ui.theme') {
          const cached = this._readCachedSystemSettings().theme;
          this._syncSystemModuleValueInBackground('ui.theme');
          return cached;
        }
        const response = await this._sendRequest({
          kind: 'module.getValue',
          key,
        });
        if (!response.ok || response.action !== 'module.getValue') return null;
        return typeof response.value === 'undefined' ? null : response.value;
      }

      async getLanguage() {
        const language = await this.getModuleValue('ui.language');
        return language === 'hy' || language === 'en' ? language : 'en';
      }

      async listApps(capabilityOrOptions) {
        const options = typeof capabilityOrOptions === 'string'
          ? { capability: capabilityOrOptions }
          : (capabilityOrOptions || {});
        const response = await this._sendRequest({
          kind: 'apps.list',
          ...options,
        });
        if (!response.ok || response.action !== 'apps.list') {
          return [];
        }
        return Array.isArray(response.apps) ? response.apps : [];
      }

      async listModules(options) {
        const moduleType = options && typeof options.moduleType === 'string'
          ? options.moduleType.trim()
          : '';
        if (!moduleType) return [];
        const hostAppId = options && typeof options.hostAppId === 'string' && options.hostAppId.trim().length > 0
          ? options.hostAppId.trim()
          : this.appId;
        return this.listApps({
          moduleType,
          hostAppId,
          includeHostOnly: true,
        });
      }

      buildHostedModuleSrc(moduleApp, options) {
        const hostSessionId = options && typeof options.hostSessionId === 'string'
          ? options.hostSessionId.trim()
          : '';
        const actorUid = options && typeof options.actorUid === 'string'
          ? options.actorUid.trim()
          : '';
        const moduleMode = options && typeof options.moduleMode === 'string'
          ? options.moduleMode.trim()
          : '';
        if (!hostSessionId || !actorUid || !moduleMode) {
          throw new Error('buildHostedModuleSrc requires hostSessionId, actorUid, and moduleMode');
        }
        const query = {
          appId: moduleApp.id,
          hostAppId: options && typeof options.hostAppId === 'string' && options.hostAppId.trim().length > 0
            ? options.hostAppId.trim()
            : this.appId,
          hostSessionId,
          actorUid,
          moduleMode,
          device: options && options.device === 'desktop' ? 'desktop' : 'mobile',
        };
        const rawParams = options && options.params && typeof options.params === 'object'
          ? options.params
          : {};
        Object.entries(rawParams).forEach(([key, value]) => {
          if (!key || value === null || typeof value === 'undefined') return;
          query[key] = String(value);
        });
        const params = new URLSearchParams(query);
        return `${moduleApp.iframePath}?${params.toString()}`;
      }

      async setLanguage(language) {
        const action = {
          kind: 'system.language.set',
          language,
        };
        let response = await this._sendRequest(action);
        const shouldRetry = this._isHostedContext()
          && (!response.ok || response.action !== 'system.language.set')
          && response.error === 'Request timeout';
        if (shouldRetry) {
          const retryDelayMs = 400 + Math.floor(Math.random() * 120);
          this._emitDebug({
            stage: 'request.retry.scheduled',
            traceId: typeof response.requestId === 'string' ? response.requestId : '',
            action: 'system.language.set',
            error: response.error || '',
          });
          await new Promise((resolve) => window.setTimeout(resolve, retryDelayMs));
          this._emitDebug({
            stage: 'request.retry.sent',
            traceId: typeof response.requestId === 'string' ? response.requestId : '',
            action: 'system.language.set',
          });
          response = await this._sendRequest(action);
        }
        if (!response.ok || response.action !== 'system.language.set') {
          throw new Error(response.error || 'Failed to set language');
        }
        this._patchSystemSettingsInStorage({ language: response.language });
        return response.language;
      }

      onLanguageChanged(callback) {
        if (typeof callback !== 'function') {
          throw new Error('Callback must be a function');
        }
        this.languageListeners.push(callback);
        return () => {
          const index = this.languageListeners.indexOf(callback);
          if (index > -1) {
            this.languageListeners.splice(index, 1);
          }
        };
      }

      onSocialProfileUpdated(callback) {
        if (typeof callback !== 'function') {
          throw new Error('Callback must be a function');
        }
        this.socialProfileListeners.push(callback);
        return () => {
          const index = this.socialProfileListeners.indexOf(callback);
          if (index > -1) {
            this.socialProfileListeners.splice(index, 1);
          }
        };
      }

      onFriendsChanged(callback) {
        if (typeof callback !== 'function') {
          throw new Error('Callback must be a function');
        }
        this.friendsChangedListeners.push(callback);
        return () => {
          const index = this.friendsChangedListeners.indexOf(callback);
          if (index > -1) {
            this.friendsChangedListeners.splice(index, 1);
          }
        };
      }

      onDebugTrace(callback) {
        if (typeof callback !== 'function') {
          throw new Error('Callback must be a function');
        }
        this.debugTraceListeners.push(callback);
        return () => {
          const index = this.debugTraceListeners.indexOf(callback);
          if (index > -1) {
            this.debugTraceListeners.splice(index, 1);
          }
        };
      }

      onHostContextUpdate(callback) {
        if (typeof callback !== 'function') {
          throw new Error('Callback must be a function');
        }
        this.hostContextListeners.push(callback);
        return () => {
          const index = this.hostContextListeners.indexOf(callback);
          if (index > -1) {
            this.hostContextListeners.splice(index, 1);
          }
        };
      }

      announceModuleReady(payload) {
        this._postModuleEvent('module.ready', payload || {});
      }

      requestHostResize(height) {
        const numericHeight = Number(height);
        if (!Number.isFinite(numericHeight) || numericHeight <= 0) return;
        this._postModuleEvent('module.resize', { height: Math.round(numericHeight) });
      }

      reportModuleError(message, details) {
        const cleanMessage = typeof message === 'string' && message.trim().length > 0
          ? message.trim()
          : 'Unknown module error';
        this._postModuleEvent('module.error', {
          message: cleanMessage,
          ...(details || {}),
        });
      }

      emitModuleNavigate(target, params) {
        const cleanTarget = typeof target === 'string' ? target.trim() : '';
        if (!cleanTarget) return;
        this._postModuleEvent('module.navigate', {
          target: cleanTarget,
          ...(params || {}),
        });
      }

      updateHostedModuleContext(target, context) {
        if (!target || typeof target.postMessage !== 'function') {
          throw new Error('updateHostedModuleContext requires a valid target window');
        }
        target.postMessage({
          type: 'hayos:moduleEvent',
          event: 'host.context.update',
          payload: context,
          sessionId: context && typeof context.sessionId === 'string' ? context.sessionId : undefined,
          fromAppId: this.appId,
        }, '*');
      }

      mountHostedModule(iframe, moduleApp, options) {
        const src = this.buildHostedModuleSrc(moduleApp, options);
        iframe.src = src;
        const baseContext = {
          hostAppId: options && typeof options.hostAppId === 'string' && options.hostAppId.trim().length > 0
            ? options.hostAppId.trim()
            : this.appId,
          mountId: moduleApp.id,
          mode: options.moduleMode,
          params: Object.fromEntries(Object.entries(options && options.params ? options.params : {})),
          sessionId: options.hostSessionId,
          ...(options && options.context ? options.context : {}),
        };
        const pushContext = (context) => {
          if (!iframe.contentWindow) return;
          this.updateHostedModuleContext(iframe.contentWindow, context);
        };
        const onLoad = () => pushContext(baseContext);
        iframe.addEventListener('load', onLoad);
        return {
          unmount: () => {
            iframe.removeEventListener('load', onLoad);
            iframe.src = 'about:blank';
          },
          updateContext: (next) => {
            pushContext(next);
          },
        };
      }

      unmountHostedModule(iframe) {
        iframe.src = 'about:blank';
      }
  
      /**
       * Get current theme
       * @returns {Promise<Object|null>}
       */
      async getTheme() {
        const response = await this._sendRequest({ kind: 'theme.get' });
        if (!response.ok || response.action !== 'theme.get') return null;
        return response.theme;
      }
  
      /**
       * Set theme
       * @param {Object} theme - Theme object
       * @returns {Promise<Object>}
       */
      async setTheme(theme) {
        const response = await this._sendRequest({ 
          kind: 'theme.set', 
          value: theme 
        });
        if (!response.ok || response.action !== 'theme.set') {
          throw new Error(response.error || 'Failed to set theme');
        }
        return response.theme;
      }

      _normalizeSocialVisibility(value) {
        return value === 'public' || value === 'private' || value === 'followers' ? value : 'followers';
      }

      _normalizeSocialProfile(raw) {
        const row = raw && typeof raw === 'object' ? raw : {};
        const uid = typeof row.uid === 'string' ? row.uid.trim() : '';
        const username = typeof row.username === 'string'
          ? row.username.trim()
          : (typeof row.displayName === 'string' ? row.displayName.trim() : '');
        const photoUrl = typeof row.photoUrl === 'string'
          ? row.photoUrl.trim()
          : (typeof row.avatarUrl === 'string' ? row.avatarUrl.trim() : '');
        const normalizedPhoto = photoUrl.length > 0 ? photoUrl : null;
        const schemaVersion = typeof row.schemaVersion === 'number' && Number.isFinite(row.schemaVersion)
          ? Math.max(1, Math.floor(row.schemaVersion))
          : 2;
        return {
          uid,
          username,
          displayName: username,
          bio: typeof row.bio === 'string' ? row.bio : '',
          photoUrl: normalizedPhoto,
          avatarUrl: normalizedPhoto,
          defaultVisibility: this._normalizeSocialVisibility(row.defaultVisibility),
          usernameVisibility: this._normalizeSocialVisibility(row.usernameVisibility || row.defaultVisibility),
          photoVisibility: this._normalizeSocialVisibility(row.photoVisibility || row.defaultVisibility),
          schemaVersion,
          createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
          updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : '',
        };
      }

      _normalizeSocialProfileSearchResult(raw) {
        const row = raw && typeof raw === 'object' ? raw : {};
        const uid = typeof row.uid === 'string' ? row.uid.trim() : '';
        const username = typeof row.username === 'string'
          ? row.username.trim()
          : (typeof row.displayName === 'string' ? row.displayName.trim() : '');
        const photoUrl = typeof row.photoUrl === 'string'
          ? row.photoUrl.trim()
          : (typeof row.avatarUrl === 'string' ? row.avatarUrl.trim() : '');
        const normalizedPhoto = photoUrl.length > 0 ? photoUrl : null;
        return {
          uid,
          username,
          displayName: username,
          photoUrl: normalizedPhoto,
          avatarUrl: normalizedPhoto,
        };
      }

      async socialProfileGet(uid) {
        const response = await this._sendRequest({ kind: 'social.profile.get', uid });
        if (!response.ok || response.action !== 'social.profile.get') {
          throw new Error(response.error || 'Failed to fetch profile');
        }
        return this._normalizeSocialProfile(response.data);
      }

      async socialProfileSearch(query, limit) {
        const response = await this._sendRequest({ kind: 'social.profile.search', query, limit });
        if (!response.ok || response.action !== 'social.profile.search') {
          throw new Error(response.error || 'Failed to search profiles');
        }
        const rows = Array.isArray(response.data) ? response.data : [];
        return rows.map((row) => this._normalizeSocialProfileSearchResult(row));
      }

      async socialProfileUpdate(payload) {
        const response = await this._sendRequest({ kind: 'social.profile.update', data: payload || {} });
        if (!response.ok || response.action !== 'social.profile.update') {
          throw new Error(response.error || 'Failed to update profile');
        }
        return this._normalizeSocialProfile(response.data);
      }

      async socialFollowCreate(targetUid) {
        const response = await this._sendRequest({ kind: 'social.follow.create', targetUid });
        if (!response.ok || response.action !== 'social.follow.create') {
          throw new Error(response.error || 'Failed to follow user');
        }
        return response.data;
      }

      async socialFollowDelete(targetUid) {
        const response = await this._sendRequest({ kind: 'social.follow.delete', targetUid });
        if (!response.ok || response.action !== 'social.follow.delete') {
          throw new Error(response.error || 'Failed to unfollow user');
        }
        return response.data;
      }

      async socialFollowListFollowers(uid) {
        const response = await this._sendRequest({ kind: 'social.follow.listFollowers', uid });
        if (!response.ok || response.action !== 'social.follow.listFollowers') {
          throw new Error(response.error || 'Failed to list followers');
        }
        return Array.isArray(response.data) ? response.data : [];
      }

      async socialFollowListFollowing(uid) {
        const response = await this._sendRequest({ kind: 'social.follow.listFollowing', uid });
        if (!response.ok || response.action !== 'social.follow.listFollowing') {
          throw new Error(response.error || 'Failed to list following');
        }
        return Array.isArray(response.data) ? response.data : [];
      }

      async socialFriendList(uid) {
        const response = await this._sendRequest({ kind: 'social.friend.list', uid });
        if (!response.ok || response.action !== 'social.friend.list') {
          throw new Error(response.error || 'Failed to list friends');
        }
        return Array.isArray(response.data) ? response.data : [];
      }

      async friendsRequestSend(targetUid) {
        const response = await this._sendRequest({ kind: 'friends.request.send', targetUid });
        if (!response.ok || response.action !== 'friends.request.send') {
          throw new Error(response.error || 'Failed to send friend request');
        }
        return response.data;
      }

      async friendsRequestAccept(peerUid) {
        const response = await this._sendRequest({ kind: 'friends.request.accept', peerUid });
        if (!response.ok || response.action !== 'friends.request.accept') {
          throw new Error(response.error || 'Failed to accept friend request');
        }
        return response.data;
      }

      async friendsRequestReject(peerUid) {
        const response = await this._sendRequest({ kind: 'friends.request.reject', peerUid });
        if (!response.ok || response.action !== 'friends.request.reject') {
          throw new Error(response.error || 'Failed to reject friend request');
        }
        return response.data;
      }

      async friendsRequestCancel(peerUid) {
        const response = await this._sendRequest({ kind: 'friends.request.cancel', peerUid });
        if (!response.ok || response.action !== 'friends.request.cancel') {
          throw new Error(response.error || 'Failed to cancel friend request');
        }
        return response.data;
      }

      async friendsRemove(peerUid) {
        const response = await this._sendRequest({ kind: 'friends.remove', peerUid });
        if (!response.ok || response.action !== 'friends.remove') {
          throw new Error(response.error || 'Failed to remove friend');
        }
        return response.data;
      }

      async friendsList(scope) {
        const response = await this._sendRequest({ kind: 'friends.list', scope });
        if (!response.ok || response.action !== 'friends.list') {
          throw new Error(response.error || 'Failed to list friends');
        }
        return response.data;
      }

      async friendsRequestsList(params) {
        const response = await this._sendRequest({
          kind: 'friends.requests.list',
          direction: params && params.direction,
          status: params && params.status,
        });
        if (!response.ok || response.action !== 'friends.requests.list') {
          throw new Error(response.error || 'Failed to list friend requests');
        }
        return Array.isArray(response.data) ? response.data : [];
      }

      async friendsAreFriends(peerUid) {
        const response = await this._sendRequest({ kind: 'friends.areFriends', peerUid });
        if (!response.ok || response.action !== 'friends.areFriends') {
          throw new Error(response.error || 'Failed to resolve friend relation');
        }
        const payload = response.data && typeof response.data === 'object' ? response.data : {};
        return payload.areFriends === true;
      }

      async friendsBlockCreate(targetUid) {
        const response = await this._sendRequest({ kind: 'friends.block.create', targetUid });
        if (!response.ok || response.action !== 'friends.block.create') {
          throw new Error(response.error || 'Failed to block user');
        }
        return response.data;
      }

      async friendsBlockDelete(targetUid) {
        const response = await this._sendRequest({ kind: 'friends.block.delete', targetUid });
        if (!response.ok || response.action !== 'friends.block.delete') {
          throw new Error(response.error || 'Failed to unblock user');
        }
        return response.data;
      }

      async friendsBlockList() {
        const response = await this._sendRequest({ kind: 'friends.block.list' });
        if (!response.ok || response.action !== 'friends.block.list') {
          throw new Error(response.error || 'Failed to list blocked users');
        }
        return Array.isArray(response.data) ? response.data : [];
      }

      async teeezerqBlackHoleList() {
        const response = await this._sendRequest({ kind: 'teeezerq.blackHole.list' });
        if (!response.ok || response.action !== 'teeezerq.blackHole.list') {
          throw new Error(response.error || 'Failed to list black-hole portals');
        }
        const rows = Array.isArray(response.data) ? response.data : [];
        return rows.map((row) => {
          const item = row && typeof row === 'object' ? row : {};
          const visibility = item.visibility === 'public' || item.visibility === 'friends' || item.visibility === 'private'
            ? item.visibility
            : null;
          return {
            id: typeof item.id === 'string' ? item.id : '',
            kind: 'black_hole',
            friendUid: typeof item.friendUid === 'string' ? item.friendUid : '',
            planetId: typeof item.planetId === 'string' ? item.planetId : '',
            planetName: typeof item.planetName === 'string' ? item.planetName : '',
            description: typeof item.description === 'string' ? item.description : '',
            visibility,
            relationship: typeof item.relationship === 'string' ? item.relationship : '',
          };
        });
      }

      async planetCreate(payload) {
        const response = await this._sendRequest({ kind: 'planet.create', data: payload || {} });
        if (!response.ok || response.action !== 'planet.create') {
          throw new Error(response.error || 'Failed to create planet');
        }
        return response.data;
      }

      async planetConnect(planetId) {
        const response = await this._sendRequest({ kind: 'planet.connect', planetId });
        if (!response.ok || response.action !== 'planet.connect') {
          throw new Error(response.error || 'Failed to connect planet');
        }
        return response.data;
      }

      async planetContextGet() {
        const response = await this._sendRequest({ kind: 'planet.context.get' });
        if (!response.ok || response.action !== 'planet.context.get') {
          throw new Error(response.error || 'Failed to get planet context');
        }
        const data = response.data && typeof response.data === 'object' ? response.data : {};
        const planetRaw = data.planet && typeof data.planet === 'object' ? data.planet : null;
        const planet = planetRaw
          ? {
            id: typeof planetRaw.id === 'string' ? planetRaw.id : '',
            name: typeof planetRaw.name === 'string' ? planetRaw.name : '',
            description: typeof planetRaw.description === 'string' ? planetRaw.description : '',
            visibility: planetRaw.visibility === 'public' || planetRaw.visibility === 'friends' || planetRaw.visibility === 'private'
              ? planetRaw.visibility
              : null,
            ownerUserId: typeof planetRaw.ownerUserId === 'string' ? planetRaw.ownerUserId : '',
            legacySpaceId: typeof planetRaw.legacySpaceId === 'string' ? planetRaw.legacySpaceId : null,
          }
          : null;
        return {
          connectedPlanetId: typeof data.connectedPlanetId === 'string' && data.connectedPlanetId.trim().length > 0
            ? data.connectedPlanetId.trim()
            : null,
          planet,
        };
      }

      async planetList() {
        const response = await this._sendRequest({ kind: 'planet.list' });
        if (!response.ok || response.action !== 'planet.list') {
          throw new Error(response.error || 'Failed to list planets');
        }
        const rows = Array.isArray(response.data) ? response.data : [];
        return rows.map((row) => {
          const item = row && typeof row === 'object' ? row : {};
          return {
            id: typeof item.id === 'string' ? item.id : '',
            name: typeof item.name === 'string' ? item.name : '',
            description: typeof item.description === 'string' ? item.description : '',
            visibility: item.visibility === 'public' || item.visibility === 'friends' || item.visibility === 'private'
              ? item.visibility
              : null,
            ownerUserId: typeof item.ownerUserId === 'string' ? item.ownerUserId : '',
            legacySpaceId: typeof item.legacySpaceId === 'string' ? item.legacySpaceId : null,
          };
        });
      }

      async planetListRecords(planetId) {
        const response = await this._sendRequest({ kind: 'planet.listRecords', planetId });
        if (!response.ok || response.action !== 'planet.listRecords') {
          throw new Error(response.error || 'Failed to list planet records');
        }
        return Array.isArray(response.data) ? response.data : [];
      }

      async globalSpaceListRecords(spaceId) {
        const response = await this._sendRequest({ kind: 'globalSpace.listRecords', spaceId });
        if (!response.ok || response.action !== 'globalSpace.listRecords') {
          throw new Error(response.error || 'Failed to list global-space records');
        }
        return Array.isArray(response.data) ? response.data : [];
      }

      async globalSpaceGetSchema(spaceId) {
        const response = await this._sendRequest({ kind: 'globalSpace.getSchema', spaceId });
        if (!response.ok || response.action !== 'globalSpace.getSchema') {
          throw new Error(response.error || 'Failed to read global-space schema');
        }
        return Array.isArray(response.data) ? response.data : [];
      }

      async planetAppStateGet(params) {
        const response = await this._sendRequest({
          kind: 'planet.appState.get',
          planetId: params && typeof params.planetId === 'string' ? params.planetId : undefined,
          targetAppId: params && typeof params.targetAppId === 'string' ? params.targetAppId : undefined,
        });
        if (!response.ok || response.action !== 'planet.appState.get') {
          throw new Error(response.error || 'Failed to read planet app state');
        }
        return response.data || null;
      }

      async planetAppStateSet(data, params) {
        const response = await this._sendRequest({
          kind: 'planet.appState.set',
          planetId: params && typeof params.planetId === 'string' ? params.planetId : undefined,
          targetAppId: params && typeof params.targetAppId === 'string' ? params.targetAppId : undefined,
          data: data && typeof data === 'object' ? data : {},
        });
        if (!response.ok || response.action !== 'planet.appState.set') {
          throw new Error(response.error || 'Failed to update planet app state');
        }
        return response.data;
      }

      async socialFeedList(params) {
        const response = await this._sendRequest({
          kind: 'social.feed.list',
          ownerUid: params && typeof params.ownerUid === 'string' ? params.ownerUid : undefined,
          limit: params && typeof params.limit === 'number' ? params.limit : undefined,
        });
        if (!response.ok || response.action !== 'social.feed.list') {
          throw new Error(response.error || 'Failed to load feed');
        }
        return Array.isArray(response.data) ? response.data : [];
      }

      async socialFeedCreatePost(payload) {
        const response = await this._sendRequest({ kind: 'social.feed.createPost', data: payload || {} });
        if (!response.ok || response.action !== 'social.feed.createPost') {
          throw new Error(response.error || 'Failed to create post');
        }
        return response.data;
      }

      async socialFeedDeletePost(postId) {
        const response = await this._sendRequest({ kind: 'social.feed.deletePost', postId });
        if (!response.ok || response.action !== 'social.feed.deletePost') {
          throw new Error(response.error || 'Failed to delete post');
        }
        return response.data;
      }

      async socialDmOpenThread(peerUid) {
        const response = await this._sendRequest({ kind: 'social.dm.openThread', peerUid });
        if (!response.ok || response.action !== 'social.dm.openThread') {
          throw new Error(response.error || 'Failed to open thread');
        }
        return response.data;
      }

      async socialDmListMessages(threadId, cursor, limit) {
        const response = await this._sendRequest({ kind: 'social.dm.listMessages', threadId, cursor, limit });
        if (!response.ok || response.action !== 'social.dm.listMessages') {
          throw new Error(response.error || 'Failed to list messages');
        }
        return Array.isArray(response.data) ? response.data : [];
      }

      async socialDmListThreads() {
        const response = await this._sendRequest({ kind: 'social.dm.listThreads' });
        if (!response.ok || response.action !== 'social.dm.listThreads') {
          throw new Error(response.error || 'Failed to list threads');
        }
        return Array.isArray(response.data) ? response.data : [];
      }

      async socialDmSendMessage(threadId, text, clientMessageId) {
        const response = await this._sendRequest({ kind: 'social.dm.sendMessage', threadId, text, clientMessageId });
        if (!response.ok || response.action !== 'social.dm.sendMessage') {
          throw new Error(response.error || 'Failed to send message');
        }
        return response.data;
      }

      async socialDmDeleteMessage(threadId, messageId) {
        const response = await this._sendRequest({ kind: 'social.dm.deleteMessage', threadId, messageId });
        if (!response.ok || response.action !== 'social.dm.deleteMessage') {
          throw new Error(response.error || 'Failed to delete message');
        }
        return response.data;
      }

      async socialBlockCreate(targetUid) {
        const response = await this._sendRequest({ kind: 'social.block.create', targetUid });
        if (!response.ok || response.action !== 'social.block.create') {
          throw new Error(response.error || 'Failed to block user');
        }
        return response.data;
      }

      async socialBlockDelete(targetUid) {
        const response = await this._sendRequest({ kind: 'social.block.delete', targetUid });
        if (!response.ok || response.action !== 'social.block.delete') {
          throw new Error(response.error || 'Failed to unblock user');
        }
        return response.data;
      }

      async socialBlockList() {
        const response = await this._sendRequest({ kind: 'social.block.list' });
        if (!response.ok || response.action !== 'social.block.list') {
          throw new Error(response.error || 'Failed to list blocked users');
        }
        return Array.isArray(response.data) ? response.data : [];
      }

      async storageQuotaGet(uid) {
        const response = await this._sendRequest({ kind: 'storage.quota.get', uid });
        if (!response.ok || response.action !== 'storage.quota.get') {
          throw new Error(response.error || 'Failed to fetch storage quota');
        }
        return response.data;
      }

      async storageFilesList(params) {
        const response = await this._sendRequest({
          kind: 'storage.files.list',
          uid: params && typeof params.uid === 'string' ? params.uid : undefined,
          limit: params && typeof params.limit === 'number' ? params.limit : undefined,
        });
        if (!response.ok || response.action !== 'storage.files.list') {
          throw new Error(response.error || 'Failed to list storage files');
        }
        return Array.isArray(response.data) ? response.data : [];
      }

      async storageFilesGet(fileId, uid) {
        const response = await this._sendRequest({ kind: 'storage.files.get', fileId, uid });
        if (!response.ok || response.action !== 'storage.files.get') {
          throw new Error(response.error || 'Failed to get storage file');
        }
        return response.data;
      }

      async storageFilesGetDownloadUrl(fileId, uid) {
        const response = await this._sendRequest({ kind: 'storage.files.getDownloadUrl', fileId, uid });
        if (!response.ok || response.action !== 'storage.files.getDownloadUrl') {
          throw new Error(response.error || 'Failed to get storage file download url');
        }
        return response.data;
      }

      async storageFilesDelete(fileId) {
        const response = await this._sendRequest({ kind: 'storage.files.delete', fileId });
        if (!response.ok || response.action !== 'storage.files.delete') {
          throw new Error(response.error || 'Failed to delete storage file');
        }
        return response.data;
      }

      async storageUploadInit(payload) {
        const response = await this._sendRequest({ kind: 'storage.upload.init', data: payload || {} });
        if (!response.ok || response.action !== 'storage.upload.init') {
          throw new Error(response.error || 'Failed to initialize upload session');
        }
        return response.data;
      }

      async storageUploadComplete(sessionId) {
        const response = await this._sendRequest({ kind: 'storage.upload.complete', sessionId });
        if (!response.ok || response.action !== 'storage.upload.complete') {
          throw new Error(response.error || 'Failed to complete upload session');
        }
        return response.data;
      }

      async storageUploadWriteChunk(sessionId, chunkBase64, chunkIndex, totalChunks) {
        const response = await this._sendRequest({
          kind: 'storage.upload.writeChunk',
          sessionId,
          chunkBase64,
          chunkIndex: typeof chunkIndex === 'number' ? Math.floor(chunkIndex) : undefined,
          totalChunks: typeof totalChunks === 'number' ? Math.floor(totalChunks) : undefined,
        });
        if (!response.ok || response.action !== 'storage.upload.writeChunk') {
          throw new Error(response.error || 'Failed to upload chunk');
        }
        return response.data;
      }

      async storageUploadCancel(sessionId) {
        const response = await this._sendRequest({ kind: 'storage.upload.cancel', sessionId });
        if (!response.ok || response.action !== 'storage.upload.cancel') {
          throw new Error(response.error || 'Failed to cancel upload session');
        }
        return response.data;
      }

      async filesList(params) {
        const response = await this._sendRequest({
          kind: 'files.list',
          space: params && typeof params.space === 'string' ? params.space : undefined,
          uid: params && typeof params.uid === 'string' ? params.uid : undefined,
          spaceId: params && typeof params.spaceId === 'string' ? params.spaceId : undefined,
          directoryId: params && typeof params.directoryId === 'string' ? params.directoryId : undefined,
          limit: params && typeof params.limit === 'number' ? params.limit : undefined,
          query: params && typeof params.query === 'string' ? params.query : undefined,
        });
        if (!response.ok || response.action !== 'files.list') {
          throw new Error(response.error || 'Failed to list files');
        }
        return Array.isArray(response.data) ? response.data : [];
      }

      async filesGet(fileId, params) {
        const response = await this._sendRequest({
          kind: 'files.get',
          fileId,
          space: params && typeof params.space === 'string' ? params.space : undefined,
          uid: params && typeof params.uid === 'string' ? params.uid : undefined,
          spaceId: params && typeof params.spaceId === 'string' ? params.spaceId : undefined,
        });
        if (!response.ok || response.action !== 'files.get') {
          throw new Error(response.error || 'Failed to get file');
        }
        return response.data;
      }

      async filesSearch(params) {
        const response = await this._sendRequest({
          kind: 'files.search',
          query: params && typeof params.query === 'string' ? params.query : '',
          space: params && typeof params.space === 'string' ? params.space : undefined,
          uid: params && typeof params.uid === 'string' ? params.uid : undefined,
          spaceId: params && typeof params.spaceId === 'string' ? params.spaceId : undefined,
          directoryId: params && typeof params.directoryId === 'string' ? params.directoryId : undefined,
          limit: params && typeof params.limit === 'number' ? params.limit : undefined,
        });
        if (!response.ok || response.action !== 'files.search') {
          throw new Error(response.error || 'Failed to search files');
        }
        return Array.isArray(response.data) ? response.data : [];
      }

      async filesRename(fileId, name, params) {
        const response = await this._sendRequest({
          kind: 'files.rename',
          fileId,
          name,
          space: params && typeof params.space === 'string' ? params.space : undefined,
          uid: params && typeof params.uid === 'string' ? params.uid : undefined,
          spaceId: params && typeof params.spaceId === 'string' ? params.spaceId : undefined,
        });
        if (!response.ok || response.action !== 'files.rename') {
          throw new Error(response.error || 'Failed to rename file');
        }
        return response.data;
      }

      async filesMove(fileId, parentId, params) {
        const response = await this._sendRequest({
          kind: 'files.move',
          fileId,
          parentId: typeof parentId === 'string' ? parentId : null,
          space: params && typeof params.space === 'string' ? params.space : undefined,
          uid: params && typeof params.uid === 'string' ? params.uid : undefined,
          spaceId: params && typeof params.spaceId === 'string' ? params.spaceId : undefined,
        });
        if (!response.ok || response.action !== 'files.move') {
          throw new Error(response.error || 'Failed to move file');
        }
        return response.data;
      }

      async filesDelete(fileId, params) {
        const response = await this._sendRequest({
          kind: 'files.delete',
          fileId,
          space: params && typeof params.space === 'string' ? params.space : undefined,
          uid: params && typeof params.uid === 'string' ? params.uid : undefined,
          spaceId: params && typeof params.spaceId === 'string' ? params.spaceId : undefined,
        });
        if (!response.ok || response.action !== 'files.delete') {
          throw new Error(response.error || 'Failed to delete file');
        }
        return response.data;
      }

      async filesCreateFolder(name, params) {
        const response = await this._sendRequest({
          kind: 'files.createFolder',
          name,
          parentId: params && typeof params.parentId === 'string' ? params.parentId : null,
          space: params && typeof params.space === 'string' ? params.space : undefined,
          uid: params && typeof params.uid === 'string' ? params.uid : undefined,
          spaceId: params && typeof params.spaceId === 'string' ? params.spaceId : undefined,
        });
        if (!response.ok || response.action !== 'files.createFolder') {
          throw new Error(response.error || 'Failed to create folder');
        }
        return response.data;
      }

      async filesUploadInit(data, params) {
        const response = await this._sendRequest({
          kind: 'files.upload.init',
          data: data || {},
          space: params && typeof params.space === 'string' ? params.space : undefined,
        });
        if (!response.ok || response.action !== 'files.upload.init') {
          throw new Error(response.error || 'Failed to initialize file upload');
        }
        return response.data;
      }

      async filesUploadComplete(sessionId, params) {
        const response = await this._sendRequest({
          kind: 'files.upload.complete',
          sessionId,
          space: params && typeof params.space === 'string' ? params.space : undefined,
        });
        if (!response.ok || response.action !== 'files.upload.complete') {
          throw new Error(response.error || 'Failed to complete file upload');
        }
        return response.data;
      }

      async tetrNotesList(limit) {
        const response = await this._sendRequest({
          kind: 'tetr.notes.list',
          limit: typeof limit === 'number' ? Math.floor(limit) : undefined,
        });
        if (!response.ok || response.action !== 'tetr.notes.list') {
          throw new Error(response.error || 'Failed to list tetr notes');
        }
        return Array.isArray(response.data) ? response.data : [];
      }

      async tetrNotesCreate(payload) {
        const response = await this._sendRequest({
          kind: 'tetr.notes.create',
          data: payload && typeof payload === 'object' ? payload : {},
        });
        if (!response.ok || response.action !== 'tetr.notes.create') {
          throw new Error(response.error || 'Failed to create tetr note');
        }
        return response.data;
      }

      async tetrNotesUpdate(noteId, payload) {
        const response = await this._sendRequest({
          kind: 'tetr.notes.update',
          noteId: typeof noteId === 'string' ? noteId : '',
          data: payload && typeof payload === 'object' ? payload : {},
        });
        if (!response.ok || response.action !== 'tetr.notes.update') {
          throw new Error(response.error || 'Failed to update tetr note');
        }
        return response.data;
      }

      async tetrNotesDelete(noteId) {
        const response = await this._sendRequest({
          kind: 'tetr.notes.delete',
          noteId: typeof noteId === 'string' ? noteId : '',
        });
        if (!response.ok || response.action !== 'tetr.notes.delete') {
          throw new Error(response.error || 'Failed to delete tetr note');
        }
        return response.data;
      }
  
      /**
       * Ensure user is authenticated
       * @returns {Promise<{user: Object, idToken: string}>}
       * @throws {Error} If not authenticated
       */
      async ensureAuthenticated() {
        return this._waitForAuthenticatedSession({ retries: 3, delayMs: 160 });
      }
  
      /**
       * Subscribe to auth state changes
       * @param {Function} callback - (user) => void
       * @returns {Function} Unsubscribe function
       */
      onAuthStateChanged(callback) {
        if (typeof callback !== 'function') {
          throw new Error('Callback must be a function');
        }
  
        this.authStateListeners.push(callback);
        
        // Initial check
        this.getCurrentUser().then(user => {
          if (user) callback(user);
        });
  
        // Return unsubscribe function
        return () => {
          const index = this.authStateListeners.indexOf(callback);
          if (index > -1) {
            this.authStateListeners.splice(index, 1);
          }
        };
      }
  
      /**
       * Notify all auth state listeners
       * @private
       */
      _notifyAuthStateListeners(user) {
        this.authStateListeners.forEach(callback => {
          try {
            callback(user);
          } catch (error) {
            console.error('Error in auth state listener:', error);
          }
        });
      }
  
      /**
       * Clean up event listeners
       */
      destroy() {
        window.removeEventListener('message', this._messageHandler);
        this.pending.clear();
        this.authStateListeners = [];
        this.languageListeners = [];
        this.socialProfileListeners = [];
        this.friendsChangedListeners = [];
        this.debugTraceListeners = [];
        this.hostContextListeners = [];
      }
    }
  
    // Make available globally
    window.HayOSClient = HayOSClient;
    
    // client loaded
  })();
