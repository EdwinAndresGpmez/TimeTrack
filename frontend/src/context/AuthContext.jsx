import React, { createContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from "jwt-decode";
import { authService } from '../services/authService';
import { setActiveTenantContext } from '../utils/tenantContext';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [roles, setRoles] = useState([]);
    const [permisos, setPermisos] = useState([]);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        authService.logout();
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        setUser(null);
        setRoles([]);
        setPermisos([]);
        window.location.href = '/login';
    }, []);

    const fetchRolesYPermisos = useCallback(async () => {
        try {
            const data = await authService.getMisPermisos();

            setPermisos(Array.isArray(data.codenames) ? data.codenames : []);
            setRoles(Array.isArray(data.roles) ? data.roles : []);

            setUser(prevUser => {
                if (prevUser) {
                    return {
                        ...prevUser,
                        is_superuser: data.is_superuser,
                        is_staff: data.is_staff
                    };
                }
                return prevUser;
            });

        } catch (error) {
            console.error("Error cargando roles y permisos:", error);
        }
    }, []);

    const ensureTenantSlugContext = useCallback(async (decodedToken) => {
        if (!decodedToken?.tenant_id || decodedToken?.tenant_slug) return;
        try {
            const memberships = await authService.getMisTenants();
            const list = Array.isArray(memberships) ? memberships : (memberships?.results || []);
            const selected = list.find((x) => x.tenant_id === decodedToken.tenant_id && x.tenant_slug);
            if (selected?.tenant_slug) {
                setActiveTenantContext({
                    tenantId: decodedToken.tenant_id,
                    tenantSlug: selected.tenant_slug,
                });
            }
        } catch (_error) {
            // no-op
        }
    }, []);

    useEffect(() => {
        const checkSession = async () => {
            const access = localStorage.getItem('access');

            if (access) {
                try {
                    const decoded = jwtDecode(access);

                    if (decoded.exp * 1000 < Date.now()) {
                        logout();
                    } else {
                        setUser(decoded);
                        setActiveTenantContext({
                            tenantId: decoded?.tenant_id ?? null,
                            tenantSlug: decoded?.tenant_slug ?? null,
                        });
                        await ensureTenantSlugContext(decoded);
                        await fetchRolesYPermisos();
                    }
                } catch (error) {
                    console.error("Token inválido", error);
                    logout();
                }
            }

            setLoading(false);
        };

        checkSession();
    }, [logout, fetchRolesYPermisos, ensureTenantSlugContext]);

    const login = async (credentials) => {
        const data = await authService.login(credentials);

        if (data.access) {
            localStorage.setItem("access", data.access);
            localStorage.setItem("refresh", data.refresh);

            const decoded = jwtDecode(data.access);
            setUser(decoded);
            setActiveTenantContext({
                tenantId: decoded?.tenant_id ?? null,
                tenantSlug: decoded?.tenant_slug ?? null,
            });
            await ensureTenantSlugContext(decoded);

            await fetchRolesYPermisos();

            return true;
        }

        return false;
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            loading,
            permissions: {
                roles,
                codenames: permisos
            }
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
