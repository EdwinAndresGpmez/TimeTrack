import { useEffect, useMemo, useState } from 'react';
import { tenancyService } from '../services/tenancyService';

export const useTenantPolicy = () => {
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await tenancyService.getCurrentPolicy();
        if (mounted) setPolicy(data || null);
      } catch (_err) {
        if (mounted) setPolicy(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const featureMap = useMemo(() => policy?.features || {}, [policy]);
  const planCode = policy?.subscription?.plan_code || null;

  const getFeatureRule = (code) => featureMap?.[code] || { enabled: false, limit_int: null };
  const hasFeature = (code) => Boolean(getFeatureRule(code)?.enabled);

  return {
    loading,
    policy,
    planCode,
    featureMap,
    getFeatureRule,
    hasFeature,
  };
};

export default useTenantPolicy;

