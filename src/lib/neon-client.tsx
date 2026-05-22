'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUserProfile } from '@/lib/actions/profile';

// Mock User for now - in a real app, this would come from an auth provider
type User = {
    uid: string;
    email: string | null;
    displayName: string | null;
};

const AuthContext = createContext<{
    user: User | null;
    isUserLoading: boolean;
} | undefined>(undefined);

export function AuthProvider({ children, user }: { children: React.ReactNode; user: User | null }) {
    return (
        <AuthContext.Provider value={{ user, isUserLoading: false }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useUser() {
    const context = useContext(AuthContext);
    // In some cases we might use useUser outside of provider (e.g. public pages)
    // but the app structure usually wraps everything in MainLayout.
    return context || { user: null, isUserLoading: false };
}

// Mock Firestore hooks
export function useFirestore() {
    return {}; // Not needed with server actions
}

export function useStorage() {
    return {}; // Placeholder
}

export function useDoc<T>(ref: any) {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!ref) {
            setIsLoading(false);
            return;
        }
        
        if (ref.collection === 'users') {
            setIsLoading(true);
            getUserProfile(ref.id)
                .then((profile) => {
                    if (profile) {
                        setData(profile as unknown as T);
                    } else {
                        // Fallback to mock data for backward compatibility or when not found
                        setData({
                            farmIds: ['mock-farm-id'],
                            role: 'owner',
                            firstName: 'Mock',
                            lastName: 'Owner',
                            displayName: 'Mock Owner',
                            email: 'owner@example.com',
                            phoneNumber: '123456789'
                        } as unknown as T);
                    }
                })
                .catch((err) => {
                    console.error("Error in useDoc fetching profile:", err);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            setIsLoading(false);
        }
    }, [ref]);

    return { data, isLoading };
}

export function useCollection<T>(query: any) {
    const [data, setData] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!query) {
            setIsLoading(false);
            return;
        }
        // Fetch via server actions in useEffect for client components
        // This is a bridge until the component is truly modernized
        const fetchData = async () => {
            // Implementation depends on the collection name in 'query'
            // For simplicity, we'll implement this properly in the page components
            setIsLoading(false);
        };
        fetchData();
    }, [query]);

    return { data, isLoading };
}

export function useMemoFirebase<T>(factory: () => T, deps: any[]) {
    return React.useMemo(factory, deps);
}

export function useAuth() {
    return {};
}
