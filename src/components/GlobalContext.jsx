import React, { createContext, useState } from "react";
import * as _Utils from '../vendors/Utils.js';
import * as _I18n from '../vendors/I18n.js';

export const GlobalContext = createContext();

export const GlobalProvider = ({ children }) => {
  const [escapp, setEscapp] = useState(null);
  const [appSettings, setAppSettings] = useState(null);
  const [Storage, setStorage] = useState(null);
  const I18n = _I18n;
  const Utils = _Utils;

  return (
    <GlobalContext.Provider value={{ escapp, setEscapp, appSettings, setAppSettings, Storage, setStorage, I18n, Utils }}>
      {children}
    </GlobalContext.Provider>
  );
};