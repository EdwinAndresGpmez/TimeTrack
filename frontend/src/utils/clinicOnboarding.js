export const getTenantScope = (user) => {
    const slug = (user?.tenant_slug || '').toString().trim();
    const tenantId = user?.tenant_id != null ? String(user.tenant_id) : '';
    const scope = slug || (tenantId ? `tenant_${tenantId}` : '');
    return scope || 'global';
};

export const getClinicOnboardingKeys = (user) => {
    const scope = getTenantScope(user);
    const uid = user?.user_id || user?.id || 'anon';
    return {
        done: `clinic_onboarding_done_${scope}_${uid}`,
        snoozeUntil: `clinic_onboarding_snooze_until_${scope}_${uid}`,
        seenSession: `clinic_onboarding_seen_session_${scope}_${uid}`,
        checklist: `clinic_setup_checklist_${scope}_${uid}`,
        assistantOpen: `clinic_onboarding_assistant_open_${scope}_${uid}`,
    };
};
