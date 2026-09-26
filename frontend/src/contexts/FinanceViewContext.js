import { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import client from '../api/client';
import { useAuth } from './AuthContext';

/*
  Which side of the finances the doctor is looking at:
    'both'       — everything
    'clinic'     — their own clinic's business (charges, payments, clinic costs)
    'consultant' — their own consulting work at other clinics (fees, own costs)
  Chosen beside the notification bell and saved on the account
  (users.finance_view), so it follows the doctor across devices.
  Kept separate from AuthContext on purpose: auth state is not touched.
*/
export const FINANCE_VIEWS = [
  ['both', 'Both'],
  ['clinic', 'Clinic owner'],
  ['consultant', 'Consultant'],
];

const FinanceViewContext = createContext({ view: 'both', setView: () => {} });

export function FinanceViewProvider({ children }) {
  const { user } = useAuth();
  const [view, setViewState] = useState(user?.finance_view || 'both');

  // Pick up the saved choice once the account has loaded (or changes).
  useEffect(() => {
    if (user?.finance_view) setViewState(user.finance_view);
  }, [user?.finance_view]);

  const setView = async (next) => {
    const prev = view;
    setViewState(next);
    try {
      await client.patch('/api/users/me', { finance_view: next });
    } catch {
      setViewState(prev);
      toast.error('Could not save your finance view — please try again');
    }
  };

  return (
    <FinanceViewContext.Provider value={{ view, setView }}>
      {children}
    </FinanceViewContext.Provider>
  );
}

export const useFinanceView = () => useContext(FinanceViewContext);
