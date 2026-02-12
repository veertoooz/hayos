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
        this._messageHandler = this._handleMessage.bind(this);
        
        // Start listening for messages from parent (HayOS shell)
        window.addEventListener('message', this._messageHandler);
        
        console.log(`HayOSClient initialized for app: ${appId}`);
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
          const callback = this.pending.get(data.requestId);
          if (callback) {
            callback(data);
            this.pending.delete(data.requestId);
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
          
          // Send to parent window (HayOS shell)
          window.parent.postMessage(request, '*');
          
          // Timeout for safety
          setTimeout(() => {
            if (this.pending.has(requestId)) {
              this.pending.delete(requestId);
              resolve({
                type: 'hayos:response',
                requestId: requestId,
                ok: false,
                error: 'Request timeout'
              });
            }
          }, 10000);
        });
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

      async listApps(capability) {
        const response = await this._sendRequest({
          kind: 'apps.list',
          capability,
        });
        if (!response.ok || response.action !== 'apps.list') {
          return [];
        }
        return Array.isArray(response.apps) ? response.apps : [];
      }

      async setLanguage(language) {
        const response = await this._sendRequest({
          kind: 'system.language.set',
          language,
        });
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
      }
    }
  
    // Make available globally
    window.HayOSClient = HayOSClient;
    
    console.log('HayOSClient loaded successfully');
  })();
