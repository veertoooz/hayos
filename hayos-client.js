// HayOSClient.js - Standalone client for iframe apps
(function() {
    'use strict';
  
    if (window.HayOSClient) {
      console.warn('HayOSClient is already loaded');
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
        this.debugTraceListeners = [];
        this.hostContextListeners = [];
        this._messageHandler = this._handleMessage.bind(this);
        
        // Start listening for messages from parent (HayOS shell)
        window.addEventListener('message', this._messageHandler);
        
        console.log(`HayOSClient initialized for app: ${appId}`);
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
  // Add after the setTheme method in public/hayos-client.js

/**
 * Firestore: get document(s)
 * @param {string} collection
 * @param {string} [documentId]
 * @returns {Promise<any>}
 */
async firestoreGet(collection, documentId) {
    const response = await this._sendRequest({
      kind: 'firestore.get',
      collection,
      documentId
    });
    if (!response.ok || response.action !== 'firestore.get') {
      throw new Error(response.error || 'Failed to get document');
    }
    return response.data;
  }
  
  /**
   * Firestore: add document
   * @param {string} collection
   * @param {Object} data
   * @returns {Promise<string>} Document ID
   */
  async firestoreAdd(collection, data) {
    const response = await this._sendRequest({
      kind: 'firestore.add',
      collection,
      data
    });
    if (!response.ok || response.action !== 'firestore.add') {
      throw new Error(response.error || 'Failed to add document');
    }
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
    const response = await this._sendRequest({
      kind: 'firestore.update',
      collection,
      documentId,
      data
    });
    if (!response.ok || response.action !== 'firestore.update') {
      throw new Error(response.error || 'Failed to update document');
    }
  }
  
  /**
   * Firestore: delete document
   * @param {string} collection
   * @param {string} documentId
   * @returns {Promise<void>}
   */
  async firestoreDelete(collection, documentId) {
    const response = await this._sendRequest({
      kind: 'firestore.delete',
      collection,
      documentId
    });
    if (!response.ok || response.action !== 'firestore.delete') {
      throw new Error(response.error || 'Failed to delete document');
    }
  }
  
  /**
   * Firestore: query documents
   * @param {string} collection
   * @param {Object} queryParams
   * @returns {Promise<Array>}
   */
  async firestoreQuery(collection, queryParams) {
    const response = await this._sendRequest({
      kind: 'firestore.query',
      collection,
      queryParams
    });
    if (!response.ok || response.action !== 'firestore.query') {
      throw new Error(response.error || 'Failed to query documents');
    }
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

      async socialDmSendMessage(threadId, text) {
        const response = await this._sendRequest({ kind: 'social.dm.sendMessage', threadId, text });
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
  
      /**
       * Ensure user is authenticated
       * @returns {Promise<{user: Object, idToken: string}>}
       * @throws {Error} If not authenticated
       */
      async ensureAuthenticated() {
        const user = await this.getCurrentUser();
        if (!user) {
          throw new Error('Not authenticated');
        }
  
        const idToken = await this.getIdToken();
        if (!idToken) {
          throw new Error('Failed to get ID token');
        }
  
        return { user, idToken };
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
        this.debugTraceListeners = [];
        this.hostContextListeners = [];
      }
    }
  
    // Make available globally
    window.HayOSClient = HayOSClient;
    
    console.log('HayOSClient loaded successfully');
  })();
