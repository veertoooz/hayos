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

    getModuleValue<T = unknown>(key: string): Promise<T | null>;
    listApps(capability?: 'wallpaperProvider'): Promise<Array<{
        id: string;
        name: string;
        iframePath: string;
        builtin: boolean;
        wallpaperProvider?: boolean;
    }>>;
    getLanguage(): Promise<'hy' | 'en'>;
    setLanguage(language: 'hy' | 'en'): Promise<'hy' | 'en'>;
    onLanguageChanged(callback: (language: 'hy' | 'en') => void): () => void;

    getTheme(): Promise<any | null>;

    setTheme(theme: any): Promise<any>;

    ensureAuthenticated(): Promise<{ user: any; idToken: string }>;

    onAuthStateChanged(callback: (user: any | null) => void): () => void;

    destroy(): void;
}

declare global {
    interface Window {
        HayOSClient: typeof HayOSClient;
    }
}
