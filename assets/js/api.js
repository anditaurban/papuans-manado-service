(function () {
  "use strict";

  const config = window.PMD_CONFIG;

  if (!config || !config.api || !config.api.baseUrl) {
    throw new Error("PMD API requires a configured API base URL.");
  }

  const sessionKey = config.storage.authSessionKey;
  const baseUrl = new URL(config.api.baseUrl.replace(/\/+$/, "") + "/", window.location.href);

  function readSession() {
    try {
      const session = JSON.parse(window.localStorage.getItem(sessionKey));
      return session && session.accessToken && session.user ? session : null;
    } catch (error) {
      return null;
    }
  }

  function writeSession(session) {
    if (!session) {
      window.localStorage.removeItem(sessionKey);
      return;
    }
    window.localStorage.setItem(sessionKey, JSON.stringify(session));
  }

  function normalizeUser(user) {
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      whatsapp: user.whatsapp || null,
      role: user.role,
      technicianId: user.technician_id || null,
      technicianName: user.technician_name || null,
      isActive: user.is_active !== false,
      lastLoginAt: user.last_login_at || null
    };
  }

  function ApiError(message, options) {
    this.name = "ApiError";
    this.message = message || "Permintaan API gagal.";
    this.status = options && options.status ? options.status : 0;
    this.code = options && options.code ? options.code : "API_ERROR";
    this.details = options && options.details ? options.details : null;
  }

  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  function buildUrl(path, query) {
    const url = new URL(String(path || "").replace(/^\/+/, ""), baseUrl);
    Object.keys(query || {}).forEach(function (key) {
      const value = query[key];
      if (value === undefined || value === null || value === "") {
        return;
      }
      url.searchParams.set(key, String(value));
    });
    return url;
  }

  async function request(path, options) {
    const settings = Object.assign(
      {
        method: "GET",
        body: undefined,
        query: null,
        auth: true
      },
      options || {}
    );
    const headers = {
      Accept: "application/json"
    };
    const session = readSession();

    if (settings.auth) {
      if (!session) {
        throw new ApiError("Sesi login tidak tersedia.", {
          status: 401,
          code: "AUTH_REQUIRED"
        });
      }
      headers.Authorization = "Bearer " + session.accessToken;
    }

    if (settings.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    let response;
    try {
      response = await window.fetch(buildUrl(path, settings.query), {
        method: settings.method,
        headers,
        body: settings.body === undefined ? undefined : JSON.stringify(settings.body)
      });
    } catch (error) {
      throw new ApiError(
        "API tidak dapat dihubungi. Pastikan Laragon dan backend-API sedang berjalan.",
        { code: "NETWORK_ERROR" }
      );
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (response.ok && response.status === 204) {
      return { success: true, data: null };
    }

    if (!response.ok || !payload || payload.success !== true) {
      const apiError = payload && payload.error ? payload.error : {};
      if (response.status === 401 && settings.auth) {
        writeSession(null);
        window.dispatchEvent(new CustomEvent("pmd:auth-expired"));
      }
      throw new ApiError(
        apiError.message || "API mengembalikan respons yang tidak dapat diproses.",
        {
          status: response.status,
          code: apiError.code,
          details: apiError.details
        }
      );
    }

    return payload;
  }

  async function list(resource, query) {
    return request(resource, { query: query || {} });
  }

  async function listAll(resource, query) {
    const rows = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await list(
        resource,
        Object.assign({}, query || {}, { page, limit: 100 })
      );
      rows.push.apply(rows, response.data || []);
      totalPages = response.meta && response.meta.total_pages
        ? Number(response.meta.total_pages)
        : 1;
      page += 1;
    } while (page <= totalPages);

    return rows;
  }

  function get(resource, id) {
    return request(resource + "/" + encodeURIComponent(id));
  }

  function create(resource, payload) {
    return request(resource, { method: "POST", body: payload });
  }

  function update(resource, id, payload) {
    return request(resource + "/" + encodeURIComponent(id), {
      method: "PATCH",
      body: payload
    });
  }

  function remove(resource, id) {
    return request(resource + "/" + encodeURIComponent(id), {
      method: "DELETE"
    });
  }

  async function login(email, password) {
    const response = await request("auth/login", {
      method: "POST",
      body: { email, password },
      auth: false
    });
    const session = {
      accessToken: response.data.access_token,
      tokenType: response.data.token_type,
      expiresAt: response.data.expires_at,
      user: normalizeUser(response.data.user)
    };
    writeSession(session);
    return session;
  }

  async function register(payload) {
    const response = await request("auth/register", {
      method: "POST",
      body: {
        name: payload.name,
        email: payload.email,
        whatsapp: payload.whatsapp,
        role: payload.role,
        password: payload.password,
        confirm_password: payload.confirmPassword
      },
      auth: false
    });
    const session = {
      accessToken: response.data.access_token,
      tokenType: response.data.token_type,
      expiresAt: response.data.expires_at,
      user: normalizeUser(response.data.user)
    };
    writeSession(session);
    return session;
  }

  async function me() {
    const response = await request("auth/me");
    const current = readSession();
    if (current) {
      current.user = normalizeUser(response.data);
      writeSession(current);
    }
    return current;
  }

  async function updateProfile(payload) {
    const response = await request("auth/me", {
      method: "PATCH",
      body: payload
    });
    const current = readSession();
    if (current) {
      current.user = normalizeUser(response.data.user);
      writeSession(current);
    }
    return response.data;
  }

  async function logout() {
    try {
      if (readSession()) {
        await request("auth/logout", { method: "POST" });
      }
    } finally {
      writeSession(null);
    }
  }

  function tracking(receipt) {
    return request("tracking/" + encodeURIComponent(receipt), { auth: false });
  }

  function updateStatus(serviceId, payload) {
    return request("service-orders/" + encodeURIComponent(serviceId) + "/status", {
      method: "POST",
      body: payload
    });
  }

  window.PMD_API = {
    ApiError,
    getBaseUrl: function () {
      return baseUrl.href.replace(/\/$/, "");
    },
    getSession: readSession,
    setSession: writeSession,
    request,
    list,
    listAll,
    get,
    create,
    update,
    remove,
    login,
    register,
    me,
    updateProfile,
    logout,
    tracking,
    updateStatus
  };
})();
