import React, { createContext } from "react";

export const NavigatorContext = createContext(null);

export function NavigatorProvider({ children }) {
  const value = {
    musei: [],
    loading: false,
  };

  return (
    <NavigatorContext.Provider value={value}>
      {children}
    </NavigatorContext.Provider>
  );
}
