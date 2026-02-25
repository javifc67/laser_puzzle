import * as Utils from "./Utils.js";
import { LOCALES } from "../config/locales.js";

let APP_LOCALES;
let availableLocales = ["en", "es", "sr"];
let defaultLocale;
let locale;

export function init(appSettings) {
  if (typeof APP_LOCALES !== "undefined") {
    //Already initialized
    return;
  }

  //Set hardcoded locales and merge with config locales
  APP_LOCALES = LOCALES;
  if (typeof appSettings.locales !== "undefined") {
    APP_LOCALES = Utils.deepMerge(APP_LOCALES, appSettings.locales);
  }

  // Override available locales if forced by config
  if (
    typeof appSettings.availableLocales !== "undefined" &&
    appSettings.availableLocales instanceof Array &&
    appSettings.availableLocales.length > 0
  ) {
    availableLocales = appSettings.availableLocales;
  }

  // Set default locale
  if (isValidLocale(appSettings.defaultLocale)) {
    defaultLocale = appSettings.defaultLocale;
  } else {
    defaultLocale = availableLocales[0];
  }

  //Set locale (1. Force by config, 2. URL, 3. Web browser)
  if (isValidLocale(appSettings.locale)) {
    locale = appSettings.locale;
  } else {
    let uL = getUserLocale();
    if (isValidLocale(uL)) {
      locale = uL;
    } else {
      locale = defaultLocale;
    }
  }
}

export function getLocale() {
  return locale;
}

function getUserLocale() {
  // Locale in URL
  let urlParams = readURLparams();
  if (isValidLocale(urlParams.locale)) {
    return urlParams.locale;
  }
  // Browser language
  let browserLang = navigator.language || navigator.userLanguage;
  if (typeof browserLang === "string" && browserLang.indexOf("-") !== -1) {
    browserLang = browserLang.split("-")[0];
  }
  if (isValidLocale(browserLang)) {
    return browserLang;
  }
  return undefined;
}

function readURLparams() {
  let params = {};
  try {
    let location = window.location;
    if (typeof location === "undefined") {
      return params;
    }
    let URLparams = location.search;
    URLparams = URLparams.substr(1, URLparams.length - 1);
    let URLparamsArray = URLparams.split("&");
    for (let i = 0; i < URLparamsArray.length; i++) {
      try {
        let paramData = URLparamsArray[i].split("=");
        if (typeof paramData[1] === "string") {
          params[paramData[0]] = paramData[1];
        }
      } catch (e) {}
    }
  } catch (e) {}

  return params;
}

function isValidLocale(locale) {
  return typeof locale === "string" && availableLocales.indexOf(locale) !== -1;
}

export function getTrans(s, params) {
  // First locale
  if (typeof APP_LOCALES[locale] !== "undefined" && typeof APP_LOCALES[locale][s] === "string") {
    return getTransWithParams(APP_LOCALES[locale][s], params);
  }

  // Default locale
  if (
    locale !== defaultLocale &&
    typeof APP_LOCALES[defaultLocale] !== "undefined" &&
    typeof APP_LOCALES[defaultLocale][s] === "string"
  ) {
    return getTransWithParams(APP_LOCALES[defaultLocale][s], params);
  }

  return undefined;
}

/*
 * Replace params (if they are provided) in the translations keys. Example:
 * // "i.dtest"	: "Download #{name}",
 * // getTrans("i.dtest", {name: "escape room"}) -> "Download escape room"
 */
function getTransWithParams(trans, params) {
  if (typeof params !== "object") {
    return trans;
  }

  for (let key in params) {
    let stringToReplace = "#{" + key + "}";
    if (trans.indexOf(stringToReplace) !== -1) {
      trans = Utils.replaceAll(trans, stringToReplace, params[key]);
    }
  }

  return trans;
}
