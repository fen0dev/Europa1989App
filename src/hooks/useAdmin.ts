import { useState, useEffect } from 'react';
import { getUserRole, isUserAdmin, type AdminRole, clearAdminCache } from '../api/admin';
import { supabase } from '../lib/supabase';

export function useAdmin() {
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [role, setRole] = useState<AdminRole>('user');
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        async function checkAdmin() {
            try {
                const [adminStatus, userRole] = await Promise.all([
                    isUserAdmin(),
                    getUserRole(),
                ]);
                setIsAdmin(adminStatus);
                setRole(userRole);
            } catch (error) {
                setIsAdmin(false);
                setRole('user');
            } finally {
                setLoading(false);
            }
        }

        checkAdmin();

        // listen for authentication changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
                clearAdminCache(); // Clear cache on auth changes
                await checkAdmin();
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return { isAdmin, role, loading };
}