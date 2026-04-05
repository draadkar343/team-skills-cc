import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getMyPermissions } from '../api/rolesApi';

const PermissionsContext = createContext({ permissions: [], can: () => true, loading: true });

export function PermissionsProvider({ children }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getMyPermissions()
      .then(setPermissions)
      .catch(() => setPermissions([]))
      .finally(() => setLoading(false));
  }, [user?.id, user?.role]);

  const can = (key) => permissions.includes(key);

  return (
    <PermissionsContext.Provider value={{ permissions, can, loading }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export const usePermissions = () => useContext(PermissionsContext);
