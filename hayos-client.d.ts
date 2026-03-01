interface HayOSSocialProfile {
    uid: string;
    username: string;
    displayName: string;
    bio: string;
    photoUrl: string | null;
    avatarUrl: string | null;
    defaultVisibility: 'followers' | 'public' | 'private';
    usernameVisibility: 'followers' | 'public' | 'private';
    photoVisibility: 'followers' | 'public' | 'private';
    schemaVersion: number;
    createdAt: string;
    updatedAt: string;
}

interface HayOSSocialProfileSearchResult {
    uid: string;
    username: string;
    displayName: string;
    photoUrl: string | null;
    avatarUrl: string | null;
}

interface HayOSPlanetSummary {
    id: string;
    name: string;
    description?: string;
    visibility?: HayOSPlanetVisibility | null;
    ownerUserId?: string;
    legacySpaceId?: string | null;
}

interface HayOSTeezerQBlackHolePortal {
    id: string;
    kind: 'black_hole';
    friendUid: string;
    planetId: string;
    planetName: string;
    description?: string;
    visibility?: HayOSPlanetVisibility | null;
    relationship?: 'friends.v1.accepted' | string;
}

type HayOSPlanetVisibility = 'friends';

interface HayOSTetrNote {
    id: string;
    ownerUid: string;
    title: string;
    content: string;
    preview: string;
    pinned: boolean;
    shared: boolean;
    status: 'active' | 'deleted';
    createdAt: string;
    updatedAt: string;
}

interface HayOSFriendsListParams {
    scope?: 'friends' | 'blocked' | 'all';
    limit?: number;
}

interface HayOSFriendsRequestsListParams {
    direction?: 'inbound' | 'outbound' | 'all';
    status?: 'pending' | 'accepted' | 'rejected' | 'canceled';
    limit?: number;
}

interface HayOSFriendsReadParams {
    uid: string;
    limit?: number;
}

declare class HayOSClient {
    constructor(appId: string);

    getCurrentUser(): Promise<{
        uid: string;
        email: string | null;
        displayName: string | null;
        photoURL: string | null;
    } | null>;

    getIdToken(forceRefresh?: boolean): Promise<string | null>;

    signOut(): Promise<boolean>;
    firebaseConfigGet(): Promise<{
        apiKey: string;
        authDomain: string;
        projectId: string;
        appId: string;
        measurementId?: string;
        storageBucket: string;
    }>;

    getModuleValue<T = unknown>(key: string): Promise<T | null>;
    listApps(capabilityOrOptions?: 'wallpaperProvider' | {
        capability?: 'wallpaperProvider';
        moduleType?: string;
        hostAppId?: string;
        includeHostOnly?: boolean;
    }): Promise<Array<{
        id: string;
        name: string;
        iframePath: string;
        launchIframePath?: string;
        wallpaperIframePath?: string;
        builtin: boolean;
        wallpaperProvider?: boolean;
        moduleType?: string;
        moduleId?: string;
        moduleContractVersion?: number;
        hostOnly?: boolean;
        allowedHosts?: string[];
        title?: string;
        icon?: string;
        emoji?: string;
        emojiCombo?: string;
        order?: number;
    }>>;
    listModules(options: {
        moduleType: string;
        hostAppId?: string;
    }): Promise<Array<{
        id: string;
        name: string;
        iframePath: string;
        launchIframePath?: string;
        wallpaperIframePath?: string;
        builtin: boolean;
        wallpaperProvider?: boolean;
        moduleType?: string;
        moduleId?: string;
        moduleContractVersion?: number;
        hostOnly?: boolean;
        allowedHosts?: string[];
        title?: string;
        icon?: string;
        emoji?: string;
        emojiCombo?: string;
        order?: number;
    }>>;
    buildHostedModuleSrc(
        moduleApp: { id: string; iframePath: string },
        options: {
            hostSessionId: string;
            actorUid: string;
            moduleMode: string;
            hostAppId?: string;
            params?: Record<string, string | number | boolean>;
            device?: 'mobile' | 'desktop';
        },
    ): string;
    getLanguage(): Promise<'hy' | 'en'>;
    setLanguage(language: 'hy' | 'en'): Promise<'hy' | 'en'>;
    onLanguageChanged(callback: (language: 'hy' | 'en') => void): () => void;
    onSocialProfileUpdated(callback: (payload: { uid: string; updatedAt: string; schemaVersion: number }) => void): () => void;
    onFriendsChanged(callback: (payload: { reason: string; actorUid: string; peerUid: string; at: string }) => void): () => void;
    onDebugTrace(callback: (payload: Record<string, unknown>) => void): () => void;
    onHostContextUpdate(callback: (context: {
        hostAppId: string;
        mountId: string;
        mode: string;
        params: Record<string, unknown>;
        sessionId: string;
    }) => void): () => void;
    announceModuleReady(payload?: Record<string, unknown>): void;
    requestHostResize(height: number): void;
    reportModuleError(message: string, details?: Record<string, unknown>): void;
    emitModuleNavigate(target: string, params?: Record<string, unknown>): void;
    updateHostedModuleContext(
        target: Window,
        context: {
            hostAppId: string;
            mountId: string;
            mode: string;
            params: Record<string, unknown>;
            sessionId: string;
        },
    ): void;
    mountHostedModule(
        iframe: HTMLIFrameElement,
        moduleApp: { id: string; iframePath: string },
        options: {
            hostSessionId: string;
            actorUid: string;
            moduleMode: string;
            hostAppId?: string;
            params?: Record<string, string | number | boolean>;
            device?: 'mobile' | 'desktop';
            context?: Partial<{
                hostAppId: string;
                mountId: string;
                mode: string;
                params: Record<string, unknown>;
                sessionId: string;
            }>;
        },
    ): {
        unmount: () => void;
        updateContext: (next: {
            hostAppId: string;
            mountId: string;
            mode: string;
            params: Record<string, unknown>;
            sessionId: string;
        }) => void;
    };
    unmountHostedModule(iframe: HTMLIFrameElement): void;

    getTheme(): Promise<any | null>;

    setTheme(theme: any): Promise<any>;

    socialProfileGet(uid?: string): Promise<HayOSSocialProfile>;
    socialProfileSearch(query: string, limit?: number): Promise<HayOSSocialProfileSearchResult[]>;
    socialProfileUpdate(payload: Record<string, unknown>): Promise<HayOSSocialProfile>;
    socialFollowCreate(targetUid: string): Promise<any>;
    socialFollowDelete(targetUid: string): Promise<any>;
    socialFollowListFollowers(uid?: string): Promise<any[]>;
    socialFollowListFollowing(uid?: string): Promise<any[]>;
    socialFriendList(uid?: string): Promise<any[]>;
    friendsRequestSend(targetUid: string): Promise<any>;
    friendsRequestAccept(peerUid: string): Promise<any>;
    friendsRequestReject(peerUid: string): Promise<any>;
    friendsRequestCancel(peerUid: string): Promise<any>;
    friendsRemove(peerUid: string): Promise<any>;
    friendsList(params?: 'friends' | 'blocked' | 'all' | HayOSFriendsListParams): Promise<any>;
    friendsRequestsList(params?: HayOSFriendsRequestsListParams): Promise<any[]>;
    friendsRead(params: HayOSFriendsReadParams): Promise<any[]>;
    friendsAreFriends(peerUid: string): Promise<boolean>;
    friendsBlockCreate(targetUid: string): Promise<any>;
    friendsBlockDelete(targetUid: string): Promise<any>;
    friendsBlockList(): Promise<any[]>;
    teeezerqBlackHoleList(): Promise<HayOSTeezerQBlackHolePortal[]>;
    planetCreate(payload: {
        name: string;
        slug?: string;
        description?: string;
        visibility?: HayOSPlanetVisibility;
        legacySpaceId?: string;
    }): Promise<any>;
    planetConnect(planetId: string): Promise<any>;
    planetContextGet(): Promise<{ connectedPlanetId: string | null; planet: HayOSPlanetSummary | null }>;
    planetList(): Promise<HayOSPlanetSummary[]>;
    planetListRecords(planetId: string): Promise<any[]>;
    globalSpaceListRecords(spaceId: string): Promise<any[]>;
    globalSpaceGetSchema(spaceId: string): Promise<any[]>;
    planetAppStateGet(params?: { planetId?: string; targetAppId?: string }): Promise<any | null>;
    planetAppStateSet(data: Record<string, unknown>, params?: { planetId?: string; targetAppId?: string }): Promise<any>;
    socialFeedList(params?: { ownerUid?: string; limit?: number }): Promise<any[]>;
    socialFeedCreatePost(payload: Record<string, unknown>): Promise<any>;
    socialFeedDeletePost(postId: string): Promise<any>;
    socialDmOpenThread(peerUid: string): Promise<any>;
    socialDmListMessages(threadId: string, cursor?: string, limit?: number): Promise<any[]>;
    socialDmListThreads(): Promise<any[]>;
    socialDmSendMessage(threadId: string, text: string, clientMessageId?: string): Promise<any>;
    socialDmDeleteMessage(threadId: string, messageId: string): Promise<any>;
    socialBlockCreate(targetUid: string): Promise<any>;
    socialBlockDelete(targetUid: string): Promise<any>;
    socialBlockList(): Promise<any[]>;
    storageQuotaGet(uid?: string): Promise<any>;
    storageFilesList(params?: { uid?: string; limit?: number }): Promise<any[]>;
    storageFilesGet(fileId: string, uid?: string): Promise<any>;
    storageFilesGetDownloadUrl(fileId: string, uid?: string): Promise<{ fileId: string; storagePath: string; url: string }>;
    storageFilesDelete(fileId: string): Promise<any>;
    storageUploadInit(payload: Record<string, unknown>): Promise<any>;
    storageUploadWriteChunk(
      sessionId: string,
      chunkBase64: string,
      chunkIndex?: number,
      totalChunks?: number
    ): Promise<{ sessionId: string; receivedBytes: number; sizeBytes: number; done: boolean }>;
    storageUploadComplete(sessionId: string): Promise<any>;
    storageUploadCancel(sessionId: string): Promise<any>;
    filesList(params?: {
        space?: 'local' | 'global';
        uid?: string;
        spaceId?: string;
        directoryId?: string | null;
        limit?: number;
        query?: string;
    }): Promise<any[]>;
    filesGet(fileId: string, params?: {
        space?: 'local' | 'global';
        uid?: string;
        spaceId?: string;
    }): Promise<any>;
    filesSearch(params: {
        query: string;
        space?: 'local' | 'global';
        uid?: string;
        spaceId?: string;
        directoryId?: string | null;
        limit?: number;
    }): Promise<any[]>;
    filesRename(fileId: string, name: string, params?: {
        space?: 'local' | 'global';
        uid?: string;
        spaceId?: string;
    }): Promise<any>;
    filesMove(fileId: string, parentId: string | null, params?: {
        space?: 'local' | 'global';
        uid?: string;
        spaceId?: string;
    }): Promise<any>;
    filesDelete(fileId: string, params?: {
        space?: 'local' | 'global';
        uid?: string;
        spaceId?: string;
    }): Promise<any>;
    filesCreateFolder(name: string, params?: {
        space?: 'local' | 'global';
        uid?: string;
        spaceId?: string;
        parentId?: string | null;
    }): Promise<any>;
    filesUploadInit(data: Record<string, unknown>, params?: {
        space?: 'local' | 'global';
    }): Promise<any>;
    filesUploadComplete(sessionId: string, params?: {
        space?: 'local' | 'global';
    }): Promise<any>;
    tetrNotesList(limit?: number): Promise<HayOSTetrNote[]>;
    tetrNotesCreate(payload: {
        title?: string;
        content?: string;
        pinned?: boolean;
        shared?: boolean;
    }): Promise<HayOSTetrNote>;
    tetrNotesUpdate(noteId: string, payload: {
        title?: string;
        content?: string;
        pinned?: boolean;
        shared?: boolean;
    }): Promise<HayOSTetrNote>;
    tetrNotesDelete(noteId: string): Promise<{ success: boolean; noteId: string }>;

    ensureAuthenticated(): Promise<{ user: any; idToken: string }>;

    onAuthStateChanged(callback: (user: any | null) => void): () => void;

    destroy(): void;
}

declare global {
    interface Window {
        HayOSClient: typeof HayOSClient;
    }
}
