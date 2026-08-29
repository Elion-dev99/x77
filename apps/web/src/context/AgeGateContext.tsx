import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface AgeGateContextType {
  verified: boolean;
  verify: () => void;
}

const AgeGateContext = createContext<AgeGateContextType>({ verified: false, verify: () => {} });

export function AgeGateProvider({ children }: { children: ReactNode }) {
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    setVerified(localStorage.getItem('livenova_age_verified') === 'true');
  }, []);

  const verify = () => {
    localStorage.setItem('livenova_age_verified', 'true');
    setVerified(true);
  };

  return (
    <AgeGateContext.Provider value={{ verified, verify }}>
      {children}
    </AgeGateContext.Provider>
  );
}

export function useAgeGate() {
  return useContext(AgeGateContext);
}
