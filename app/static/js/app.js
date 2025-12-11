let currentRole = null;
let currentIssue = null; // Holds current issue across Return Book -> Pay Fine

// ---------- SECTION HANDLING ----------

function showSection(id) {
  const ids = [
    "loginSection",
    "homeSection",
    "transactionSection",
    "statusSection",
    "reportsSection",
    "maintenanceSection",
  ];
  ids.forEach((s) => {
    const el = document.getElementById(s);
    if (el) el.classList.add("hidden");
  });
  const target = document.getElementById(id);
  if (target) target.classList.remove("hidden");
}

function resetLogin() {
  const u = document.getElementById("loginUser");
  const p = document.getElementById("loginPass");
  const e = document.getElementById("loginError");
  if (u) u.value = "";
  if (p) p.value = "";
  if (e) e.textContent = "";
}

// ---------- ROLE-BASED UI ----------

function showAdminMenus() {
  const maint = document.getElementById("maintenanceSection");
  if (maint) maint.classList.remove("hidden");

  const reports = document.getElementById("reportsSection");
  if (reports) reports.classList.remove("hidden");
  const openMaintBtn = document.getElementById("openMaintenanceBtn");
  if (openMaintBtn) openMaintBtn.style.display = "inline-block";
}

function hideAdminMenus() {
  const maint = document.getElementById("maintenanceSection");
  if (maint) maint.classList.add("hidden");

  const reports = document.getElementById("reportsSection");
  if (reports) reports.classList.remove("hidden"); // user can view reports
  const openMaintBtn = document.getElementById("openMaintenanceBtn");
  if (openMaintBtn) openMaintBtn.style.display = "none";
}

async function apiFetch(url, options = {}) {
  const resp = await fetch(url, options);

  if (resp.status === 401) {
    console.warn("Not authenticated, redirecting to login");
    showStatus("cancel");
    showSection("loginSection");
    throw new Error("Not authenticated");
  }

  if (resp.status === 403) {
    console.warn("Forbidden: admin only");
    document.getElementById("statusText").textContent =
      "Admin only. Access denied.";
    showSection("statusSection");
    throw new Error("Forbidden");
  }

  return resp;
}

// ---------- AUTH: LOGIN / STATUS / LOGOUT ----------

function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errDiv = document.getElementById("loginError");
    if (errDiv) errDiv.textContent = "";

    const uEl = document.getElementById("loginUser");
    const pEl = document.getElementById("loginPass");
    const username = uEl ? uEl.value.trim() : "";
    const password = pEl ? pEl.value.trim() : "";

    if (!username || !password) {
      if (errDiv) errDiv.textContent = "Username and password are required.";
      return;
    }

    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);

    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        body: formData,
      });

      const data = await resp.json().catch(() => null);
      console.log("Login response:", resp.status, data);

      if (!resp.ok || !data || !data.success) {
        if (errDiv)
          errDiv.textContent =
            (data && data.message) || "Error contacting server";
        return;
      }

      const homeBtn = document.getElementById("homeBtn");
      const logoutBtn = document.getElementById("logoutBtn");
      if (homeBtn) homeBtn.disabled = false;
      if (logoutBtn) logoutBtn.disabled = false;

      await checkAuthStatus();
    } catch (err) {
      console.error("Login error", err);
      if (errDiv) errDiv.textContent = "Error contacting server";
    }
  });
}

async function checkAuthStatus() {
  try {
    const resp = await fetch("/api/auth/me");
    console.log("checkAuthStatus /api/auth/me status =", resp.status);

    if (!resp.ok) {
      showSection("loginSection");
      const homeBtn = document.getElementById("homeBtn");
      const logoutBtn = document.getElementById("logoutBtn");
      if (homeBtn) homeBtn.disabled = true;
      if (logoutBtn) logoutBtn.disabled = true;
      return null;
    }

    const data = await resp.json();
    console.log("Logged in user:", data);
    currentRole = data.role;

    const titleEl = document.getElementById("homeTitle");
    if (data.role && data.role.toLowerCase() === "admin") {
      if (titleEl) titleEl.textContent = "Admin Home Page";
      showAdminMenus();
    } else {
      if (titleEl) titleEl.textContent = "User Home Page";
      hideAdminMenus();
    }

    const homeBtn = document.getElementById("homeBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    if (homeBtn) homeBtn.disabled = false;
    if (logoutBtn) logoutBtn.disabled = false;

    showSection("homeSection");
    return data;
  } catch (err) {
    console.error("checkAuthStatus error", err);
    showSection("loginSection");
    return null;
  }
}

async function logout() {
  console.log("Logout clicked");

  try {
    const resp = await fetch("/api/auth/logout", {
      method: "GET",
      credentials: "include",
    });
    const data = await resp.json().catch(() => null);
    console.log("Logout response:", resp.status, data);
  } catch (err) {
    console.error("Logout error:", err);
  }

  currentRole = null;
  const homeBtn = document.getElementById("homeBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  if (homeBtn) homeBtn.disabled = true;
  if (logoutBtn) logoutBtn.disabled = true;

  resetLogin();
  showSection("loginSection");
  document.getElementById("statusText").textContent =
    "You have successfully logged out.";
}

// ---------- MAINTENANCE NAV ----------

function showMaintPage(name) {
  document
    .querySelectorAll(".maint-page")
    .forEach((p) => p.classList.add("hidden"));

  const pageEl = document.getElementById("maint-" + name);
  if (pageEl) pageEl.classList.remove("hidden");

  document
    .querySelectorAll("#maintenanceSection .side-menu button")
    .forEach((btn) => btn.classList.remove("active"));

  const activeBtn = document.querySelector(
    `#maintenanceSection .side-menu button[data-page="${name}"]`
  );
  if (activeBtn) activeBtn.classList.add("active");
}

// ---------- REPORTS CONFIG & LOADING ----------

const reportConfig = {
  books: {
    url: "/api/reports/books",
    title: "Master List of Books",
    columns: [
      { key: "serial_no", label: "Serial No" },
      { key: "name", label: "Name of Book" },
      { key: "author", label: "Author Name" },
      { key: "category", label: "Category" },
      { key: "status", label: "Status" },
      { key: "cost", label: "Cost" },
      { key: "procurement_date", label: "Procurement Date" },
    ],
  },
  movies: {
    url: "/api/reports/movies",
    title: "Master List of Movies",
    columns: [
      { key: "serial_no", label: "Serial No" },
      { key: "name", label: "Name of Movie" },
      { key: "author", label: "Author Name" },
      { key: "category", label: "Category" },
      { key: "status", label: "Status" },
      { key: "cost", label: "Cost" },
      { key: "procurement_date", label: "Procurement Date" },
    ],
  },
  members: {
    url: "/api/reports/members",
    title: "Master List of Memberships",
    columns: [
      { key: "membership_id", label: "Membership Id" },
      { key: "first_name", label: "First Name" },
      { key: "last_name", label: "Last Name" },
      { key: "phone", label: "Contact Number" },
      { key: "address", label: "Contact Address" },
      { key: "aadhar", label: "Aadhar Card No" },
      { key: "start_date", label: "Start Date" },
      { key: "end_date", label: "End Date" },
      { key: "status", label: "Status (Active/Inactive)" },
      { key: "pending_fine", label: "Amount Pending (Fine)" },
    ],
  },
  "active-issues": {
    url: "/api/reports/active-issues",
    title: "Active Issues",
    columns: [
      { key: "serial_no", label: "Serial No Book/Movie" },
      { key: "membership_id", label: "Membership Id" },
      { key: "issue_date", label: "Date of Issue" },
      { key: "planned_return", label: "Date of Return" },
    ],
  },
  overdue: {
    url: "/api/reports/overdue",
    title: "Overdue Returns",
    columns: [
      { key: "serial_no", label: "Serial No Book" },
      { key: "membership_id", label: "Membership Id" },
      { key: "issue_date", label: "Date of Issue" },
      { key: "planned_return", label: "Date of Planned Return" },
      { key: "actual_return_date", label: "Date of Return" },
      { key: "fine_amount", label: "Fine Calculations" },
    ],
  },
  requests: {
    url: "/api/reports/requests",
    title: "Issue Requests",
    columns: [
      { key: "membership_id", label: "Membership Id" },
      { key: "book_name", label: "Name of Book/Movie" },
      { key: "requested_date", label: "Requested Date" },
      { key: "fulfilled_date", label: "Request Fulfilled Date" },
    ],
  },
};

function showReport(name) {
  const cfg = reportConfig[name];
  if (!cfg) return;

  document
    .querySelectorAll("#reportsSection .side-menu button")
    .forEach((btn) => btn.classList.remove("active"));

  const btn = document.querySelector(
    `#reportsSection .side-menu button[onclick="showReport('${name}')"]`
  );
  if (btn) btn.classList.add("active");

  showSection("reportsSection");

  const titleEl = document.getElementById("reportTitle");
  const thead = document.querySelector("#reportTable thead");
  const tbody = document.querySelector("#reportTable tbody");
  const errDiv = document.getElementById("reportError");

  if (!titleEl || !thead || !tbody || !errDiv) return;

  titleEl.textContent = cfg.title;
  errDiv.textContent = "";
  thead.innerHTML = "";
  tbody.innerHTML = "<tr><td>Loading...</td></tr>";

  fetch(cfg.url)
    .then((resp) => resp.json().then((data) => ({ resp, data })))
    .then(({ resp, data }) => {
      if (!resp.ok) {
        tbody.innerHTML = "";
        errDiv.textContent = data.detail || "Error loading report";
        return;
      }

      const rows = data.results || [];

      const headRow = document.createElement("tr");
      cfg.columns.forEach((col) => {
        const th = document.createElement("th");
        th.textContent = col.label;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);

      tbody.innerHTML = "";
      if (rows.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = cfg.columns.length;
        td.textContent = "No data available.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }

      rows.forEach((row) => {
        const tr = document.createElement("tr");
        cfg.columns.forEach((col) => {
          const td = document.createElement("td");
          let value = row[col.key];

          if (value === null || value === undefined) value = "";
          if (col.key === "fine_paid") value = value ? "Yes" : "No";

          td.textContent = value;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    })
    .catch(() => {
      thead.innerHTML = "";
      tbody.innerHTML = "";
      errDiv.textContent = "Server error while loading report.";
    });
}

// ---------- SIMPLE NAV HELPERS ----------

function goHome() {
  showSection("homeSection");
}

function goBackFromMaintenance() {
  showSection("maintenanceSection");
  showMaintPage("addMember");
}

function goBackFromTransactions() {
  showSection("transactionSection");
  showTxnPage("availability");
}

function openTransactions() {
  showSection("transactionSection");
  showTxnPage("availability");
}

function openReports() {
  showSection("reportsSection");
  showReport("books");
}

function openMaintenance() {
  showSection("maintenanceSection");
  showMaintPage("addMember");
}

function showTxnPage(name) {
  const pages = ["availability", "issue", "return", "fine"];
  pages.forEach((p) => {
    const el = document.getElementById(`txn-${p}`);
    if (el) el.classList.add("hidden");
  });
  const target = document.getElementById(`txn-${name}`);
  if (target) target.classList.remove("hidden");
}

// ---------- AVAILABILITY ----------

function initAvailability() {
  const form = document.getElementById("availForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const titleEl = document.getElementById("availTitle");
    const authorEl = document.getElementById("availAuthor");
    const errDiv = document.getElementById("availError");
    const tbody = document.querySelector("#availResults tbody");
    if (!titleEl || !authorEl || !errDiv || !tbody) return;

    const title = titleEl.value.trim();
    const author = authorEl.value.trim();
    tbody.innerHTML = "";

    if (!title && !author) {
      errDiv.textContent = "Please enter book name or author.";
      return;
    }
    errDiv.textContent = "";

    const params = new URLSearchParams({ book: title, author });
    try {
      const resp = await fetch(
        `/api/transactions/availability?${params.toString()}`
      );
      const data = await resp.json();
      if (resp.status >= 400) {
        errDiv.textContent = data.detail || "Error searching";
        return;
      }

      data.results.forEach((b) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><input type="radio" name="selBook"
                     data-name="${b.name}"
                     data-author="${b.author}"
                     data-serial="${b.serial_no}"></td>
          <td>${b.name}</td>
          <td>${b.author}</td>
          <td>${b.serial_no}</td>
          <td>${b.status === "Available" ? "Y" : "N"}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      errDiv.textContent = "Server error.";
    }
  });
}

// ---------- PRODUCT DETAILS (HOME) ----------

async function loadProductDetails() {
  const tbody = document.getElementById("productDetailsBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  try {
    const resp = await fetch("/api/reports/product-details");
    if (!resp.ok) {
      console.error("Failed to fetch product details", resp.status);
      return;
    }

    const data = await resp.json();

    if (!Array.isArray(data) || data.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 3;
      td.textContent = "No product details configured.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    data.forEach((row) => {
      const tr = document.createElement("tr");

      const tdFrom = document.createElement("td");
      tdFrom.textContent = row.code_from;
      tr.appendChild(tdFrom);

      const tdTo = document.createElement("td");
      tdTo.textContent = row.code_to;
      tr.appendChild(tdTo);

      const tdCat = document.createElement("td");
      tdCat.textContent = row.category;
      tr.appendChild(tdCat);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading product details", err);
  }
}

// ---------- ISSUE BOOK ----------

function initIssue() {
  const form = document.getElementById("issueForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const member = document.getElementById("issueMember")?.value.trim();
    const name = document.getElementById("issueBookName")?.value.trim();
    const author = document.getElementById("issueAuthor")?.value.trim();
    const serial = document.getElementById("issueSerial")?.value.trim();
    const issueDate = document.getElementById("issueDate")?.value;
    const returnDate = document.getElementById("issueReturnDate")?.value;
    const remarks = document.getElementById("issueRemarks")?.value.trim();
    const errDiv = document.getElementById("issueError");
    if (!errDiv) return;

    if (!member || !name || !author || !serial || !issueDate || !returnDate) {
      errDiv.textContent = "All fields except remarks are mandatory.";
      return;
    }

    const formData = new FormData();
    formData.append("serial_no", serial);
    formData.append("membership_id", member);
    formData.append("issue_date", issueDate);
    formData.append("planned_return", returnDate);
    formData.append("remarks", remarks || "");

    try {
      const resp = await fetch("/api/transactions/issue", {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();
      if (resp.status >= 400) {
        errDiv.textContent = data.detail || "Issue failed.";
        return;
      }
      errDiv.textContent = "";
      showStatus("success");
    } catch (err) {
      errDiv.textContent = "Server error.";
    }
  });
}

// ---------- RETURN BOOK FLOW ----------

function initReturn() {
  const form = document.getElementById("returnForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Return Book: submit handler triggered");

    const errDiv = document.getElementById("rbError");
    if (!errDiv) return;
    errDiv.textContent = "";

    const memberId = document.getElementById("rbMemberId")?.value.trim();
    const serial = document.getElementById("rbSerial")?.value.trim();
    const newReturnDate = document.getElementById("rbReturnDate")?.value;
    const remarks = document.getElementById("rbRemarks")?.value.trim();

    if (!memberId || !serial) {
      errDiv.textContent = "Membership Id and Serial No are mandatory.";
      return;
    }

    const formData = new FormData();
    formData.append("membership_id", memberId);
    formData.append("serial_no", serial);
    if (newReturnDate) formData.append("return_date", newReturnDate);
    if (remarks) formData.append("remarks", remarks);

    try {
      const resp = await fetch("/api/transactions/return/start", {
        method: "POST",
        body: formData,
      });

      console.log("Return Book: response status", resp.status);

      const data = await resp.json();

      if (!resp.ok) {
        errDiv.textContent = data.detail || "Return start failed.";
        return;
      }

      currentIssue = data;

      document.getElementById("pfBookName").value = data.book_name || "";
      document.getElementById("pfAuthor").value = data.author || "";
      document.getElementById("pfSerial").value = data.serial_no || serial;
      document.getElementById("pfIssueDate").value = data.issue_date || "";
      document.getElementById("pfPlannedReturn").value =
        data.return_date || newReturnDate || "";
      document.getElementById("pfActualReturn").value = "";
      document.getElementById("pfFine").value = (
        data.fine_amount ?? 0
      ).toString();
      document.getElementById("pfFinePaid").checked = false;
      document.getElementById("pfRemarks").value = remarks || "";
      document.getElementById("pfError").textContent = "";

      document.getElementById("rbBookName").value = data.book_name || "";
      document.getElementById("rbAuthor").value = data.author || "";
      document.getElementById("rbIssueDate").value = data.issue_date || "";
      if (!newReturnDate && data.return_date) {
        document.getElementById("rbReturnDate").value = data.return_date;
      }

      showTxnPage("fine");
    } catch (err) {
      console.error(err);
      errDiv.textContent = "Server error.";
    }
  });
}

// ---------- PAY FINE FLOW ----------

function initFine() {
  const form = document.getElementById("fineForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errDiv = document.getElementById("pfError");
    if (!errDiv) return;
    errDiv.textContent = "";

    if (!currentIssue || !currentIssue.issue_id) {
      errDiv.textContent = "No issue selected for fine payment.";
      return;
    }

    const actualReturn = document.getElementById("pfActualReturn")?.value;
    const fineAmount = parseFloat(
      document.getElementById("pfFine")?.value || "0"
    );
    const finePaid = document.getElementById("pfFinePaid")?.checked;
    const remarks = document.getElementById("pfRemarks")?.value.trim();

    if (!actualReturn) {
      errDiv.textContent = "Actual return date is mandatory.";
      return;
    }

    if (fineAmount > 0 && !finePaid) {
      errDiv.textContent =
        "Fine is pending. Please select 'Fine Paid' to complete the return.";
      return;
    }

    const formData = new FormData();
    formData.append("issue_id", currentIssue.issue_id);
    formData.append("actual_return_date", actualReturn);
    formData.append("fine_paid", finePaid ? "true" : "false");
    formData.append("remarks", remarks || "");

    try {
      const resp = await fetch("/api/transactions/fine", {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();

      if (!resp.ok) {
        errDiv.textContent = data.detail || "Fine payment failed.";
        return;
      }

      errDiv.textContent = "Transaction completed successfully.";
      currentIssue = null;
    } catch (err) {
      console.error(err);
      errDiv.textContent = "Server error.";
    }
  });
}

// ---------- STATUS TEXT ----------

function showStatus(type) {
  const text =
    type === "cancel"
      ? "Transaction cancelled."
      : type === "logout"
      ? "You have successfully logged out."
      : "Transaction completed successfully.";
  const el = document.getElementById("statusText");
  if (el) el.textContent = text;
  showSection("statusSection");
}

// ---------- MAINTENANCE: MEMBERSHIP ----------

function initMembership() {
  const addForm = document.getElementById("addMemberForm");
  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errDiv = document.getElementById("amError");
      if (!errDiv) return;

      const formData = new FormData();
      formData.append(
        "membership_id",
        document.getElementById("amId").value.trim()
      );
      formData.append(
        "first_name",
        document.getElementById("amFirst").value.trim()
      );
      formData.append(
        "last_name",
        document.getElementById("amLast").value.trim()
      );
      formData.append("phone", document.getElementById("amPhone").value.trim());
      formData.append(
        "address",
        document.getElementById("amAddress").value.trim()
      );
      formData.append(
        "aadhar",
        document.getElementById("amAadhar").value.trim()
      );
      formData.append("start_date", document.getElementById("amStart").value);
      formData.append("plan", document.getElementById("amPlan").value);

      try {
        const resp = await fetch("/api/maintenance/membership/add", {
          method: "POST",
          body: formData,
        });
        const data = await resp.json();
        if (!resp.ok) {
          errDiv.textContent = data.detail || "Error adding membership";
          return;
        }
        errDiv.textContent = "Membership added successfully.";
      } catch {
        errDiv.textContent = "Server error.";
      }
    });
  }

  const umId = document.getElementById("umId");
  if (umId) {
    umId.addEventListener("blur", async () => {
      const id = document.getElementById("umId").value.trim();
      const info = document.getElementById("umInfo");
      const errDiv = document.getElementById("umError");
      if (!id || !info || !errDiv) return;

      try {
        const resp = await fetch(`/api/maintenance/membership/${id}`);
        const data = await resp.json();
        if (!resp.ok) {
          info.textContent = "";
          errDiv.textContent = data.detail || "Membership not found";
          return;
        }
        errDiv.textContent = "";
        info.textContent = `Current status: ${data.status}, End date: ${data.end_date}`;
      } catch {
        info.textContent = "";
        errDiv.textContent = "Server error.";
      }
    });
  }

  const updateForm = document.getElementById("updateMemberForm");
  if (updateForm) {
    updateForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errDiv = document.getElementById("umError");
      if (!errDiv) return;

      const membershipId = document.getElementById("umId").value.trim();
      const actionEl = document.querySelector("input[name='umAction']:checked");
      if (!actionEl) {
        errDiv.textContent = "Please select an action.";
        return;
      }
      const action = actionEl.value;

      const formData = new FormData();
      formData.append("membership_id", membershipId);
      formData.append("action", action);

      try {
        const resp = await fetch("/api/maintenance/membership/update", {
          method: "POST",
          body: formData,
        });
        const data = await resp.json();
        if (!resp.ok) {
          errDiv.textContent = data.detail || "Update failed";
          return;
        }
        errDiv.textContent = `Membership updated. New end date: ${data.new_end_date}, status: ${data.status}`;
      } catch {
        errDiv.textContent = "Server error.";
      }
    });
  }
}

// ---------- MAINTENANCE: ADD / UPDATE BOOK ----------

function initBookMaintenance() {
  const addBookForm = document.getElementById("addBookForm");
  if (addBookForm) {
    addBookForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const errDiv = document.getElementById("abError");
      if (!errDiv) return;
      errDiv.textContent = "";

      const typeRadio = document.querySelector("input[name='abType']:checked");
      const type = typeRadio ? typeRadio.value : "book";
      const name = document.getElementById("abName").value.trim();
      const procurementDate = document.getElementById("abDate").value;
      const qty = parseInt(document.getElementById("abQty").value, 10) || 1;

      if (!name || !procurementDate || qty <= 0) {
        errDiv.textContent =
          "All fields are mandatory and quantity must be ≥ 1.";
        return;
      }

      const formData = new FormData();
      formData.append("type", type);
      formData.append("name", name);
      formData.append("procurement_date", procurementDate);
      formData.append("quantity", String(qty));

      try {
        const resp = await fetch("/api/maintenance/book/add", {
          method: "POST",
          body: formData,
        });
        const data = await resp.json();
        console.log("AddBook response", resp.status, data);

        if (!resp.ok) {
          errDiv.textContent = data.detail || "Error adding book/movie.";
          return;
        }

        errDiv.textContent = "Book/Movie added successfully.";
        document.getElementById("abName").value = "";
        document.getElementById("abDate").value = "";
        document.getElementById("abQty").value = "1";
      } catch (err) {
        console.error("AddBook error", err);
        errDiv.textContent = "Server error.";
      }
    });
  }

  const ubSerialInput = document.getElementById("ubSerial");
  if (ubSerialInput) {
    ubSerialInput.addEventListener("blur", async () => {
      const serial = document.getElementById("ubSerial").value.trim();
      const info = document.getElementById("ubInfo");
      const errDiv = document.getElementById("ubError");
      if (!serial || !info || !errDiv) return;

      try {
        const resp = await fetch(`/api/maintenance/book/${serial}`);
        const data = await resp.json();
        if (!resp.ok) {
          info.textContent = "";
          errDiv.textContent = data.detail || "Book/Movie not found";
          return;
        }
        errDiv.textContent = "";
        info.textContent = `Type: ${data.type}, Status: ${data.status}`;
        document.getElementById("ubName").value = data.name;
        document.getElementById("ubAuthor").value = data.author;
        document.getElementById("ubCategory").value = data.category;
        document.getElementById("ubStatus").value = data.status;
        document.getElementById("ubDate").value = data.procurement_date || "";
      } catch {
        info.textContent = "";
        errDiv.textContent = "Server error.";
      }
    });
  }

  const updateBookForm = document.getElementById("updateBookForm");
  if (updateBookForm) {
    updateBookForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errDiv = document.getElementById("ubError");
      if (!errDiv) return;

      const formData = new FormData();
      formData.append(
        "serial_no",
        document.getElementById("ubSerial").value.trim()
      );
      formData.append("name", document.getElementById("ubName").value.trim());
      formData.append(
        "author",
        document.getElementById("ubAuthor").value.trim()
      );
      formData.append(
        "category",
        document.getElementById("ubCategory").value.trim()
      );
      formData.append("status", document.getElementById("ubStatus").value);
      formData.append(
        "procurement_date",
        document.getElementById("ubDate").value
      );

      try {
        const resp = await fetch("/api/maintenance/book/update", {
          method: "POST",
          body: formData,
        });
        const data = await resp.json();
        if (!resp.ok) {
          errDiv.textContent = data.detail || "Update failed";
          return;
        }
        errDiv.textContent = "Book/Movie updated.";
      } catch {
        errDiv.textContent = "Server error.";
      }
    });
  }
}

// ---------- USER MANAGEMENT ----------

function initUserMgmt() {
  const form = document.getElementById("userMgmtForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errDiv = document.getElementById("uError");
    if (!errDiv) return;

    const mode = document.querySelector("input[name='umType']:checked").value;
    const username = document.getElementById("umUser").value.trim();
    const password = document.getElementById("umPass").value;
    const isActive = document.getElementById("umActive").checked;
    const isAdmin = document.getElementById("umAdmin").checked;

    const formData = new FormData();
    formData.append("password", password);
    formData.append("is_admin", isAdmin ? "true" : "false");
    formData.append("is_active", isActive ? "true" : "false");

    try {
      let resp;
      if (mode === "new") {
        formData.append("username", username);
        resp = await fetch("/api/auth/users", {
          method: "POST",
          body: formData,
        });
      } else {
        resp = await fetch(`/api/auth/users/${username}`, {
          method: "PUT",
          body: formData,
        });
      }
      const data = await resp.json();
      if (!resp.ok) {
        errDiv.textContent = data.detail || "User operation failed";
        return;
      }
      errDiv.textContent = "User saved successfully.";
    } catch {
      errDiv.textContent = "Server error.";
    }
  });
}

// ---------- GLOBAL INIT ON PAGE LOAD ----------

document.addEventListener("DOMContentLoaded", async () => {
  initLoginForm();
  initAvailability();
  initIssue();
  initReturn();
  initFine();
  initMembership();
  initBookMaintenance();
  initUserMgmt();

  const loggedIn = await checkAuthStatus();
  if (loggedIn) {
    loadProductDetails();
  }
});
