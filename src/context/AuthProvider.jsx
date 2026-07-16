import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './AuthContext';

// NOTE: This is a front-end demo. "Accounts" and "orders" live in localStorage
// and passwords are NOT hashed — never use this pattern for a real backend.
const USERS_KEY = 'w401_users';
const SESSION_KEY = 'w401_session';
const ORDERS_KEY = 'w401_orders';

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const carrierPrefix = {
  'J&T Express': 'JT',
  'Virak Buntham': 'VB',
  'Mekong Express': 'MK',
};

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(() => read(USERS_KEY, []));
  const [user, setUser] = useState(() => read(SESSION_KEY, null));
  const [orders, setOrders] = useState(() => read(ORDERS_KEY, []));

  useEffect(() => localStorage.setItem(USERS_KEY, JSON.stringify(users)), [users]);
  useEffect(() => localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)), [orders]);
  useEffect(() => {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  }, [user]);

  const register = useCallback(
    ({ name, email, password }) => {
      const clean = email.trim().toLowerCase();
      if (users.some((u) => u.email === clean)) {
        return { ok: false, error: 'An account with this email already exists.' };
      }
      const newUser = { id: uid(), name: name.trim(), email: clean, password };
      setUsers((prev) => [...prev, newUser]);
      const { password: _pw, ...safe } = newUser;
      void _pw;
      setUser(safe);
      return { ok: true };
    },
    [users]
  );

  const login = useCallback(
    (email, password) => {
      const clean = email.trim().toLowerCase();
      const found = users.find((u) => u.email === clean && u.password === password);
      if (!found) return { ok: false, error: 'Invalid email or password.' };
      const { password: _pw, ...safe } = found;
      void _pw;
      setUser(safe);
      return { ok: true };
    },
    [users]
  );

  const logout = useCallback(() => setUser(null), []);

  const placeOrder = useCallback(
    (data) => {
      const now = new Date().toISOString();
      const prefix = carrierPrefix[data.express?.carrier] || 'W4';
      const order = {
        id: uid(),
        number: `W401-${Math.floor(100000 + Math.random() * 900000)}`,
        trackingNumber: `${prefix}${Math.floor(100000000 + Math.random() * 900000000)}`,
        userId: user?.id ?? null,
        createdAt: now,
        statusIndex: 1, // "Confirmed" once placed
        ...data,
      };
      setOrders((prev) => [order, ...prev]);
      return order;
    },
    [user]
  );

  const myOrders = useMemo(
    () =>
      orders
        .filter((o) => o.userId === user?.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [orders, user]
  );

  const getOrderById = useCallback(
    (id) => orders.find((o) => o.id === id && o.userId === user?.id),
    [orders, user]
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      register,
      login,
      logout,
      placeOrder,
      myOrders,
      getOrderById,
    }),
    [user, register, login, logout, placeOrder, myOrders, getOrderById]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
