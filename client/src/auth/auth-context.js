// src/auth/auth-context.js
import { createContext, useContext } from 'react';

export const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);
