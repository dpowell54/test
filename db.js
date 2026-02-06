const DB_NAME = "decision-firewall";
const DB_VERSION = 1;
let dbInstance = null;
let storageMode = "indexeddb";

const localKeys = {
  decisions: "df_decisions",
  checkins: "df_checkins",
  settings: "df_settings",
};

function generateId() {
  return crypto?.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function initLocalStorage() {
  storageMode = "local";
  if (!localStorage.getItem(localKeys.decisions)) {
    localStorage.setItem(localKeys.decisions, JSON.stringify([]));
  }
  if (!localStorage.getItem(localKeys.checkins)) {
    localStorage.setItem(localKeys.checkins, JSON.stringify([]));
  }
  if (!localStorage.getItem(localKeys.settings)) {
    localStorage.setItem(localKeys.settings, JSON.stringify({}));
  }
}

function readLocal(key) {
  return JSON.parse(localStorage.getItem(key) || "[]");
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

async function openDB() {
  if (dbInstance || storageMode === "local") {
    return dbInstance;
  }

  try {
    dbInstance = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => {
        const db = request.result;
        const decisions = db.createObjectStore("decisions", { keyPath: "id" });
        decisions.createIndex("timestamp", "timestamp");
        decisions.createIndex("type", "type");
        decisions.createIndex("outcome", "outcome");
        decisions.createIndex("hour", "hour");
        decisions.createIndex("day", "day");

        db.createObjectStore("checkins", { keyPath: "date" });
        db.createObjectStore("settings", { keyPath: "key" });
      };
      request.onsuccess = () => resolve(request.result);
    });
    return dbInstance;
  } catch (error) {
    console.warn("IndexedDB unavailable, falling back to localStorage.", error);
    initLocalStorage();
    return null;
  }
}

function withStore(storeName, mode, callback) {
  return new Promise((resolve, reject) => {
    const tx = dbInstance.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = callback(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

async function addDecision(decision) {
  decision.id = decision.id || generateId();
  if (storageMode === "local") {
    const decisions = readLocal(localKeys.decisions);
    decisions.push(decision);
    writeLocal(localKeys.decisions, decisions);
    return decision;
  }
  await openDB();
  await withStore("decisions", "readwrite", (store) => store.add(decision));
  return decision;
}

async function updateDecision(decision) {
  if (storageMode === "local") {
    const decisions = readLocal(localKeys.decisions).map((item) => (item.id === decision.id ? decision : item));
    writeLocal(localKeys.decisions, decisions);
    return decision;
  }
  await openDB();
  await withStore("decisions", "readwrite", (store) => store.put(decision));
  return decision;
}

async function deleteDecision(id) {
  if (storageMode === "local") {
    const decisions = readLocal(localKeys.decisions).filter((item) => item.id !== id);
    writeLocal(localKeys.decisions, decisions);
    return;
  }
  await openDB();
  await withStore("decisions", "readwrite", (store) => store.delete(id));
}

async function listDecisions({ start, end } = {}) {
  if (storageMode === "local") {
    const all = readLocal(localKeys.decisions);
    return all.filter((item) => (!start || item.timestamp >= start) && (!end || item.timestamp <= end));
  }
  await openDB();
  return new Promise((resolve, reject) => {
    const store = dbInstance.transaction("decisions").objectStore("decisions");
    const index = store.index("timestamp");
    const range = start || end ? IDBKeyRange.bound(start || 0, end || Date.now()) : null;
    const request = range ? index.getAll(range) : index.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addCheckin(checkin) {
  if (storageMode === "local") {
    const checkins = readLocal(localKeys.checkins).filter((item) => item.date !== checkin.date);
    checkins.push(checkin);
    writeLocal(localKeys.checkins, checkins);
    return;
  }
  await openDB();
  await withStore("checkins", "readwrite", (store) => store.put(checkin));
}

async function getCheckin(date) {
  if (storageMode === "local") {
    return readLocal(localKeys.checkins).find((item) => item.date === date) || null;
  }
  await openDB();
  return new Promise((resolve, reject) => {
    const request = dbInstance.transaction("checkins").objectStore("checkins").get(date);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function listCheckins({ start, end } = {}) {
  if (storageMode === "local") {
    const all = readLocal(localKeys.checkins);
    return all.filter((item) => (!start || item.timestamp >= start) && (!end || item.timestamp <= end));
  }
  await openDB();
  return new Promise((resolve, reject) => {
    const store = dbInstance.transaction("checkins").objectStore("checkins");
    const request = store.getAll();
    request.onsuccess = () => {
      const results = request.result || [];
      const filtered = results.filter((item) => (!start || item.timestamp >= start) && (!end || item.timestamp <= end));
      resolve(filtered);
    };
    request.onerror = () => reject(request.error);
  });
}

async function getSettings() {
  if (storageMode === "local") {
    return JSON.parse(localStorage.getItem(localKeys.settings) || "{}");
  }
  await openDB();
  return new Promise((resolve, reject) => {
    const store = dbInstance.transaction("settings").objectStore("settings");
    const request = store.getAll();
    request.onsuccess = () => {
      const settings = {};
      request.result.forEach((item) => {
        settings[item.key] = item.value;
      });
      resolve(settings);
    };
    request.onerror = () => reject(request.error);
  });
}

async function setSetting(key, value) {
  if (storageMode === "local") {
    const settings = JSON.parse(localStorage.getItem(localKeys.settings) || "{}");
    settings[key] = value;
    localStorage.setItem(localKeys.settings, JSON.stringify(settings));
    return;
  }
  await openDB();
  await withStore("settings", "readwrite", (store) => store.put({ key, value }));
}

window.dbApi = {
  openDB,
  addDecision,
  updateDecision,
  deleteDecision,
  listDecisions,
  addCheckin,
  getCheckin,
  listCheckins,
  getSettings,
  setSetting,
  get storageMode() {
    return storageMode;
  },
};
