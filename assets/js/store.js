(function () {
  "use strict";

  const api = window.PMD_API;
  const subscribers = new Set();
  const numberFormatter = new Intl.NumberFormat("id-ID");
  let loadingPromise = null;
  let state = emptyState();

  if (!api) {
    throw new Error("PMD store requires api.js.");
  }

  function emptyState() {
    return {
      customers: [],
      technicians: [],
      technicianSkills: [],
      damageTypes: [],
      parts: [],
      devices: [],
      serviceOrders: [],
      partUsageRecords: [],
      timelines: [],
      payments: []
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function apiDate(value) {
    return value ? String(value).replace(" ", "T") : null;
  }

  function formatDuration(minimum, maximum) {
    return minimum === maximum
      ? minimum + " hari"
      : minimum + "-" + maximum + " hari";
  }

  function formatPriceRange(minimum, maximum, note) {
    if (minimum === null || maximum === null) {
      return note || "Setelah diagnosis";
    }
    return "Rp" + numberFormatter.format(minimum) + "-Rp" + numberFormatter.format(maximum);
  }

  function parseDuration(value) {
    const numbers = String(value || "").match(/\d+/g) || [];
    const minimum = Math.max(1, Number(numbers[0]) || 1);
    const maximum = Math.max(minimum, Number(numbers[1]) || minimum);
    return {
      estimated_duration_min_days: minimum,
      estimated_duration_max_days: maximum
    };
  }

  function parsePriceRange(value) {
    const text = String(value || "").trim();
    const matches = text.match(/\d[\d.]*/g) || [];
    const prices = matches
      .map(function (item) {
        return Number(item.replace(/\./g, ""));
      })
      .filter(Number.isFinite);

    if (prices.length >= 2) {
      return {
        min_price: Math.min(prices[0], prices[1]),
        max_price: Math.max(prices[0], prices[1]),
        price_note: null
      };
    }
    return {
      min_price: null,
      max_price: null,
      price_note: text || "Setelah diagnosis"
    };
  }

  function mapApiState(rows) {
    const skillsByTechnician = rows.technicianSkills.reduce(function (result, item) {
      result[item.technician_id] = result[item.technician_id] || [];
      result[item.technician_id].push(item.skill);
      return result;
    }, {});
    const devicesById = rows.devices.reduce(function (result, item) {
      result[item.id] = item;
      return result;
    }, {});
    const usagesByService = rows.partUsages.reduce(function (result, item) {
      result[item.service_id] = result[item.service_id] || { used: [], planned: [] };
      const mapped = {
        id: item.id,
        partId: item.part_id,
        qty: item.quantity,
        unitServicePrice: item.unit_service_price,
        occurredAt: apiDate(item.occurred_at)
      };
      if (item.usage_type === "USED") {
        result[item.service_id].used.push(mapped);
      } else {
        result[item.service_id].planned.push(mapped);
      }
      return result;
    }, {});

    return {
      customers: rows.customers.map(function (item) {
        return {
          id: item.id,
          name: item.name,
          whatsapp: item.whatsapp,
          address: item.address,
          createdAt: apiDate(item.created_at),
          updatedAt: apiDate(item.updated_at)
        };
      }),
      technicians: rows.technicians.map(function (item) {
        return {
          id: item.id,
          name: item.name,
          skills: skillsByTechnician[item.id] || [],
          availability: item.availability,
          createdAt: apiDate(item.created_at),
          updatedAt: apiDate(item.updated_at)
        };
      }),
      technicianSkills: rows.technicianSkills.map(function (item) {
        return {
          id: item.id,
          technicianId: item.technician_id,
          skill: item.skill
        };
      }),
      damageTypes: rows.damages.map(function (item) {
        return {
          id: item.id,
          name: item.name,
          estimatedDuration: formatDuration(
            item.estimated_duration_min_days,
            item.estimated_duration_max_days
          ),
          priceRange: formatPriceRange(item.min_price, item.max_price, item.price_note),
          minDays: item.estimated_duration_min_days,
          maxDays: item.estimated_duration_max_days,
          minPrice: item.min_price,
          maxPrice: item.max_price,
          priceNote: item.price_note,
          active: item.is_active,
          createdAt: apiDate(item.created_at),
          updatedAt: apiDate(item.updated_at)
        };
      }),
      parts: rows.parts.map(function (item) {
        return {
          id: item.id,
          sku: item.sku,
          name: item.name,
          stock: item.stock,
          minStock: item.min_stock,
          costPrice: item.cost_price,
          servicePrice: item.service_price,
          createdAt: apiDate(item.created_at),
          updatedAt: apiDate(item.updated_at)
        };
      }),
      devices: rows.devices.map(function (item) {
        return {
          id: item.id,
          customerId: item.customer_id,
          brand: item.brand,
          model: item.model,
          color: item.color || "",
          imei: item.imei || "",
          createdAt: apiDate(item.created_at),
          updatedAt: apiDate(item.updated_at)
        };
      }),
      serviceOrders: rows.serviceOrders.map(function (item) {
        const device = devicesById[item.device_id] || {};
        const usages = usagesByService[item.id] || { used: [], planned: [] };
        return {
          id: item.id,
          receipt: item.receipt,
          customerId: item.customer_id,
          deviceId: item.device_id,
          device: {
            brand: device.brand || "",
            model: device.model || "",
            color: device.color || "",
            imei: device.imei || ""
          },
          complaint: item.complaint,
          damageTypeId: item.damage_type_id,
          technicianId: item.technician_id,
          status: item.status,
          priority: item.priority,
          estimatedCost: item.estimated_cost,
          serviceFee: item.service_fee,
          finalCost: item.final_cost,
          estimatedDoneAt: apiDate(item.estimated_done_at),
          receivedAt: apiDate(item.received_at),
          readyAt: apiDate(item.ready_at),
          completedAt: apiDate(item.completed_at),
          pickedUpAt: apiDate(item.picked_up_at),
          initialCondition: item.initial_condition || "",
          internalNote: item.internal_note || "",
          safeDiagnosis: item.safe_diagnosis || "",
          partUsages: usages.used,
          plannedParts: usages.planned,
          createdAt: apiDate(item.created_at),
          updatedAt: apiDate(item.updated_at)
        };
      }),
      partUsageRecords: rows.partUsages.map(function (item) {
        return {
          id: item.id,
          serviceId: item.service_id,
          partId: item.part_id,
          usageType: item.usage_type,
          qty: item.quantity,
          unitServicePrice: item.unit_service_price,
          occurredAt: apiDate(item.occurred_at)
        };
      }),
      timelines: rows.timelines.map(function (item) {
        return {
          id: item.id,
          serviceId: item.service_id,
          at: apiDate(item.occurred_at),
          actor: item.actor,
          status: item.status,
          note: item.note
        };
      }),
      payments: rows.payments.map(function (item) {
        return {
          id: item.id,
          serviceId: item.service_id,
          method: item.method,
          status: item.status,
          serviceFee: item.service_fee,
          partsFee: item.parts_fee,
          discount: item.discount,
          paid: item.paid,
          totalAmount: item.total_amount,
          balanceDue: item.balance_due,
          proofFileName: item.proof_file_name || "",
          paidAt: apiDate(item.paid_at),
          createdAt: apiDate(item.created_at),
          updatedAt: apiDate(item.updated_at)
        };
      })
    };
  }

  function notify() {
    subscribers.forEach(function (listener) {
      listener(clone(state));
    });
  }

  async function hydrate(force) {
    if (loadingPromise && !force) {
      return loadingPromise;
    }

    loadingPromise = Promise.all([
      api.listAll("customers", { sort: "id", order: "desc" }),
      api.listAll("technicians", { sort: "id", order: "desc" }),
      api.listAll("technician-skills", { sort: "id", order: "desc" }),
      api.listAll("damages", { sort: "id", order: "desc" }),
      api.listAll("parts", { sort: "id", order: "desc" }),
      api.listAll("devices", { sort: "id", order: "desc" }),
      api.listAll("service-orders", { sort: "received_at", order: "desc" }),
      api.listAll("part-usages", { sort: "id", order: "desc" }),
      api.listAll("status-history", { sort: "occurred_at", order: "desc" }),
      api.listAll("payments", { sort: "id", order: "desc" })
    ])
      .then(function (results) {
        state = mapApiState({
          customers: results[0],
          technicians: results[1],
          technicianSkills: results[2],
          damages: results[3],
          parts: results[4],
          devices: results[5],
          serviceOrders: results[6],
          partUsages: results[7],
          timelines: results[8],
          payments: results[9]
        });
        notify();
        return getState();
      })
      .finally(function () {
        loadingPromise = null;
      });

    return loadingPromise;
  }

  async function mutate(task) {
    const result = await task();
    await hydrate(true);
    return result;
  }

  function getState() {
    return clone(state);
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

  function getCollectionItem(collectionName, id) {
    return (state[collectionName] || []).find(function (item) {
      return item.id === id;
    });
  }

  function actorName() {
    const session = api.getSession();
    return session && session.user ? session.user.name : "Pengguna API";
  }

  function saveCustomer(id, payload) {
    return mutate(function () {
      return id
        ? api.update("customers", id, payload)
        : api.create("customers", payload);
    });
  }

  function deleteCustomer(id) {
    return mutate(function () {
      return api.remove("customers", id);
    });
  }

  function saveDamage(id, payload) {
    const apiPayload = Object.assign(
      {},
      parseDuration(payload.estimatedDuration),
      parsePriceRange(payload.priceRange),
      {
        name: payload.name,
        is_active: payload.active
      }
    );
    return mutate(function () {
      return id
        ? api.update("damages", id, apiPayload)
        : api.create("damages", apiPayload);
    });
  }

  function deleteDamage(id) {
    return mutate(function () {
      return api.remove("damages", id);
    });
  }

  function saveTechnician(id, payload) {
    return mutate(async function () {
      const response = id
        ? await api.update("technicians", id, {
            name: payload.name,
            availability: payload.availability
          })
        : await api.create("technicians", {
            name: payload.name,
            availability: payload.availability
          });
      const technicianId = id || response.data.id;
      const currentSkills = state.technicianSkills.filter(function (item) {
        return item.technicianId === technicianId;
      });
      const nextSkills = new Set(payload.skills);

      for (const skill of currentSkills) {
        if (!nextSkills.has(skill.skill)) {
          await api.remove("technician-skills", skill.id);
        }
      }
      for (const skill of payload.skills) {
        if (!currentSkills.some(function (item) { return item.skill === skill; })) {
          await api.create("technician-skills", {
            technician_id: technicianId,
            skill
          });
        }
      }
      return response;
    });
  }

  function updateMyProfile(payload) {
    return mutate(function () {
      return api.updateProfile(payload);
    });
  }

  function deleteTechnician(id) {
    return mutate(function () {
      return api.remove("technicians", id);
    });
  }

  function savePart(id, payload) {
    const apiPayload = {
      sku: payload.sku,
      name: payload.name,
      stock: payload.stock,
      min_stock: payload.minStock,
      cost_price: payload.costPrice,
      service_price: payload.servicePrice
    };
    return mutate(function () {
      return id
        ? api.update("parts", id, apiPayload)
        : api.create("parts", apiPayload);
    });
  }

  function deletePart(id) {
    return mutate(function () {
      return api.remove("parts", id);
    });
  }

  function saveDevice(serviceId, payload) {
    const service = getCollectionItem("serviceOrders", serviceId);
    if (!service) {
      return Promise.reject(new api.ApiError("Perangkat service tidak ditemukan."));
    }
    return mutate(function () {
      return api.update("devices", service.deviceId, {
        customer_id: service.customerId,
        brand: payload.brand,
        model: payload.model,
        color: payload.color || null,
        imei: payload.imei || null
      });
    });
  }

  function servicePayload(payload, deviceId) {
    return {
      customer_id: payload.customerId,
      device_id: deviceId,
      damage_type_id: payload.damageTypeId,
      technician_id: payload.technicianId || null,
      priority: payload.priority || "Normal",
      complaint: payload.complaint,
      initial_condition: payload.initialCondition || null,
      internal_note: payload.internalNote || null,
      safe_diagnosis: payload.safeDiagnosis || null,
      estimated_cost: payload.estimatedCost,
      estimated_done_at: payload.estimatedDoneAt,
      received_at: payload.receivedAt
    };
  }

  function saveService(id, payload) {
    return mutate(async function () {
      if (!id) {
        const deviceResponse = await api.create("devices", {
          customer_id: payload.customerId,
          brand: payload.device.brand,
          model: payload.device.model,
          color: payload.device.color || null,
          imei: payload.device.imei || null
        });
        const deviceId = deviceResponse.data.id;
        try {
          const response = await api.create(
            "service-orders",
            Object.assign(servicePayload(payload, deviceId), {
              status: payload.status || "DITERIMA"
            })
          );
          await api.create("status-history", {
            service_id: response.data.id,
            actor: actorName(),
            status: response.data.status,
            note: "Service dibuat melalui dashboard admin."
          });
          return response;
        } catch (error) {
          try {
            await api.remove("devices", deviceId);
          } catch (cleanupError) {
            // The primary API error is more useful than a failed orphan cleanup.
          }
          throw error;
        }
      }

      const current = getCollectionItem("serviceOrders", id);
      if (!current) {
        throw new api.ApiError("Service tidak ditemukan.");
      }
      let deviceId = current.deviceId;
      let replacementDeviceId = null;

      if (payload.customerId !== current.customerId) {
        const deviceResponse = await api.create("devices", {
          customer_id: payload.customerId,
          brand: payload.device.brand,
          model: payload.device.model,
          color: payload.device.color || null,
          imei: payload.device.imei || null
        });
        deviceId = deviceResponse.data.id;
        replacementDeviceId = deviceId;
      } else {
        await api.update("devices", current.deviceId, {
          customer_id: payload.customerId,
          brand: payload.device.brand,
          model: payload.device.model,
          color: payload.device.color || null,
          imei: payload.device.imei || null
        });
      }

      let response;
      try {
        response = await api.update(
          "service-orders",
          id,
          servicePayload(payload, deviceId)
        );
      } catch (error) {
        if (replacementDeviceId) {
          try {
            await api.remove("devices", replacementDeviceId);
          } catch (cleanupError) {
            // Preserve the service update error.
          }
        }
        throw error;
      }

      if (replacementDeviceId) {
        try {
          await api.remove("devices", current.deviceId);
        } catch (cleanupError) {
          // An older device may still be referenced by another service.
        }
      }
      if (payload.status !== current.status) {
        await api.updateStatus(id, {
          status: payload.status,
          actor: actorName(),
          note:
            "Admin mengubah status dari " +
            current.status +
            " ke " +
            payload.status +
            "."
        });
      }
      return response;
    });
  }

  function assignTechnician(serviceId, technicianId) {
    const service = getCollectionItem("serviceOrders", serviceId);
    if (!service) {
      return Promise.reject(new api.ApiError("Service tidak ditemukan."));
    }
    return mutate(async function () {
      const response = await api.update("service-orders", serviceId, {
        technician_id: technicianId || null
      });
      const technician = getCollectionItem("technicians", technicianId);
      await api.create("status-history", {
        service_id: serviceId,
        actor: actorName(),
        status: service.status,
        note: technician
          ? "Teknisi diassign ke " + technician.name + "."
          : "Assignment teknisi dikosongkan."
      });
      return response;
    });
  }

  function deleteService(id) {
    return mutate(function () {
      return api.remove("service-orders", id);
    });
  }

  function recordPartUsage(serviceId, partId, quantity, note) {
    const service = getCollectionItem("serviceOrders", serviceId);
    const part = getCollectionItem("parts", partId);
    if (!service || !part) {
      return Promise.reject(new api.ApiError("Service atau sparepart tidak ditemukan."));
    }
    return mutate(async function () {
      const response = await api.create("part-usages", {
        service_id: serviceId,
        part_id: partId,
        usage_type: "USED",
        quantity,
        unit_service_price: part.servicePrice
      });
      await api.create("status-history", {
        service_id: serviceId,
        actor: actorName(),
        status: service.status,
        note:
          "Pemakaian sparepart " +
          part.sku +
          " x" +
          quantity +
          (note ? ". " + note : ".")
      });
      return response;
    });
  }

  function updateWork(serviceId, payload) {
    const service = getCollectionItem("serviceOrders", serviceId);
    if (!service) {
      return Promise.reject(new api.ApiError("Service tidak ditemukan."));
    }
    return mutate(async function () {
      const patch = {};
      if (payload.diagnosis) {
        patch.safe_diagnosis = payload.diagnosis;
      }
      if (payload.estimatedCost !== null) {
        patch.estimated_cost = payload.estimatedCost;
      }
      if (payload.estimatedDoneAt) {
        patch.estimated_done_at = payload.estimatedDoneAt;
      }
      if (Object.keys(patch).length) {
        await api.update("service-orders", serviceId, patch);
      }
      if (payload.partId) {
        const part = getCollectionItem("parts", payload.partId);
        await api.create("part-usages", {
          service_id: serviceId,
          part_id: payload.partId,
          usage_type: "USED",
          quantity: payload.qty,
          unit_service_price: part.servicePrice
        });
      }

      const notes = [];
      if (payload.diagnosis) {
        notes.push("Diagnosis: " + payload.diagnosis);
      }
      if (payload.actionNote) {
        notes.push("Tindakan: " + payload.actionNote);
      }
      if (payload.partId) {
        const part = getCollectionItem("parts", payload.partId);
        notes.push("Sparepart: " + part.sku + " x" + payload.qty + ".");
      }
      if (payload.estimatedDoneAt) {
        notes.push("Estimasi selesai diperbarui.");
      }

      if (payload.nextStatus !== service.status) {
        return api.updateStatus(serviceId, {
          status: payload.nextStatus,
          actor: actorName(),
          note: notes.join(" ") || "Status pekerjaan diperbarui oleh teknisi."
        });
      }
      return api.create("status-history", {
        service_id: serviceId,
        actor: actorName(),
        status: service.status,
        note: notes.join(" ") || "Catatan pekerjaan diperbarui oleh teknisi."
      });
    });
  }

  function updateStatus(serviceId, status, note) {
    return mutate(function () {
      return api.updateStatus(serviceId, {
        status,
        actor: actorName(),
        note
      });
    });
  }

  function savePayment(id, payload) {
    const apiPayload = {
      service_id: payload.serviceId,
      method: payload.method,
      status: payload.status,
      service_fee: payload.serviceFee,
      parts_fee: payload.partsFee,
      discount: payload.discount,
      paid: payload.paid,
      proof_file_name: payload.proofFileName || null
    };
    return mutate(function () {
      return id
        ? api.update("payments", id, apiPayload)
        : api.create("payments", apiPayload);
    });
  }

  function deletePayment(id) {
    return mutate(function () {
      return api.remove("payments", id);
    });
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
    hydrate,
    refresh: function () {
      return hydrate(true);
    },
    getState,
    subscribe,
    findServiceByReceipt,
    getCustomer: function (id) { return getCollectionItem("customers", id); },
    getTechnician: function (id) { return getCollectionItem("technicians", id); },
    getDamageType: function (id) { return getCollectionItem("damageTypes", id); },
    getPart: function (id) { return getCollectionItem("parts", id); },
    getPaymentForService,
    getTimelineForService,
    getStatusCounts,
    getAssignmentsForTechnician,
    saveCustomer,
    deleteCustomer,
    saveDamage,
    deleteDamage,
    saveTechnician,
    updateMyProfile,
    deleteTechnician,
    savePart,
    deletePart,
    saveDevice,
    saveService,
    assignTechnician,
    deleteService,
    recordPartUsage,
    updateWork,
    updateStatus,
    savePayment,
    deletePayment
  };
})();
