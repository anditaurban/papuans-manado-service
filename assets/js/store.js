(function () {
  "use strict";

  const config = window.PMD_CONFIG;
  const seed = window.PMD_DATA;
  const subscribers = new Set();

  if (!config || !seed) {
    throw new Error("PMD store requires config.js and data.js.");
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function hasExpectedShape(value) {
    return Boolean(
      value &&
        Array.isArray(value.customers) &&
        Array.isArray(value.technicians) &&
        Array.isArray(value.damageTypes) &&
        Array.isArray(value.parts) &&
        Array.isArray(value.serviceOrders) &&
        Array.isArray(value.timelines) &&
        Array.isArray(value.payments)
    );
  }

  function loadState() {
    try {
      const stored = window.localStorage.getItem(config.storage.key);
      if (!stored) {
        return clone(seed);
      }

      const parsed = JSON.parse(stored);
      return hasExpectedShape(parsed) ? parsed : clone(seed);
    } catch (error) {
      return clone(seed);
    }
  }

  let state = loadState();

  function saveState() {
    try {
      window.localStorage.setItem(config.storage.key, JSON.stringify(state));
    } catch (error) {
      // Demo state should keep working even when localStorage is unavailable.
    }
  }

  function notify() {
    subscribers.forEach(function (listener) {
      listener(clone(state));
    });
  }

  function getCollectionItem(collectionName, id) {
    const collection = state[collectionName] || [];
    return collection.find(function (item) {
      return item.id === id;
    });
  }

  function getState() {
    return clone(state);
  }

  function setState(nextState) {
    if (!hasExpectedShape(nextState)) {
      return false;
    }

    state = clone(nextState);
    saveState();
    notify();
    return true;
  }

  function update(mutator) {
    const draft = clone(state);
    mutator(draft);
    return setState(draft);
  }

  function reset() {
    state = clone(seed);
    saveState();
    notify();
    return getState();
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      return function () {};
    }

    subscribers.add(listener);
    return function () {
      subscribers.delete(listener);
    };
  }

  function findServiceByReceipt(receipt) {
    const normalized = String(receipt || "").trim().toUpperCase();
    return state.serviceOrders.find(function (service) {
      return service.receipt === normalized;
    });
  }

  function getCustomer(id) {
    return getCollectionItem("customers", id);
  }

  function getTechnician(id) {
    return getCollectionItem("technicians", id);
  }

  function getDamageType(id) {
    return getCollectionItem("damageTypes", id);
  }

  function getPart(id) {
    return getCollectionItem("parts", id);
  }

  function getPaymentForService(serviceId) {
    return state.payments.find(function (payment) {
      return payment.serviceId === serviceId;
    });
  }

  function getTimelineForService(serviceId) {
    return state.timelines
      .filter(function (entry) {
        return entry.serviceId === serviceId;
      })
      .sort(function (first, second) {
        return new Date(first.at) - new Date(second.at);
      });
  }

  function getStatusCounts() {
    return state.serviceOrders.reduce(function (counts, service) {
      counts[service.status] = (counts[service.status] || 0) + 1;
      return counts;
    }, {});
  }

  function getAssignmentsForTechnician(technicianId) {
    return state.serviceOrders.filter(function (service) {
      return service.technicianId === technicianId;
    });
  }

  window.PMD_STORE = {
    getState,
    setState,
    update,
    reset,
    subscribe,
    findServiceByReceipt,
    getCustomer,
    getTechnician,
    getDamageType,
    getPart,
    getPaymentForService,
    getTimelineForService,
    getStatusCounts,
    getAssignmentsForTechnician
  };
})();
