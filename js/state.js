/* ============================================================
   Bayraktar TB2 — Reactive State Store (Pub-Sub)
   ============================================================ */

const AppState = (() => {
  const _state = {};
  const _listeners = {};      // key → Set<callback>
  const _globalListeners = new Set();

  function _notify(key) {
    if (_listeners[key]) {
      _listeners[key].forEach(cb => {
        try { cb(_state[key], key); } catch (e) { console.error('State listener error:', e); }
      });
    }
    _globalListeners.forEach(cb => {
      try { cb(_state, key); } catch (e) { console.error('Global listener error:', e); }
    });
  }

  return {
    /** Set a value and notify subscribers */
    set(key, value) {
      _state[key] = value;
      _notify(key);
    },

    /** Get current value */
    get(key) {
      return _state[key];
    },

    /** Get entire state snapshot */
    getAll() {
      return { ..._state };
    },

    /** Subscribe to a specific key */
    subscribe(key, callback) {
      if (!_listeners[key]) _listeners[key] = new Set();
      _listeners[key].add(callback);
      return () => _listeners[key].delete(callback);
    },

    /** Subscribe to all changes */
    subscribeAll(callback) {
      _globalListeners.add(callback);
      return () => _globalListeners.delete(callback);
    },

    /** Batch-set multiple keys, notify once per key at end */
    batch(updates) {
      const keys = Object.keys(updates);
      keys.forEach(k => { _state[k] = updates[k]; });
      keys.forEach(k => _notify(k));
    },

    /** Reset to provided defaults */
    reset(defaults) {
      Object.keys(_state).forEach(k => delete _state[k]);
      Object.assign(_state, JSON.parse(JSON.stringify(defaults)));
      Object.keys(_state).forEach(k => _notify(k));
    }
  };
})();
