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

  // hide all transaction pages
  pages.forEach((p) => {
    const el = document.getElementById(`txn-${p}`);
    if (el) el.classList.add("hidden");
  });

  // show selected page
  const target = document.getElementById(`txn-${name}`);
  if (target) target.classList.remove("hidden");

  // ------------ NEW: highlight active menu button ------------
  const allBtns = document.querySelectorAll(
    "#transactionSection .side-menu button"
  );
  allBtns.forEach((btn) => btn.classList.remove("active"));

  const activeBtn = document.querySelector(
    `#transactionSection .side-menu button[onclick="showTxnPage('${name}')"]`
  );

  if (activeBtn) activeBtn.classList.add("active");
}

// ---------- AVAILABILITY ----------

function initAvailability() {
  const form = document.getElementById("availForm");
  const titleEl = document.getElementById("availTitle");
  const authorEl = document.getElementById("availAuthor");
  const errDiv = document.getElementById("availError");
  const tbody = document.querySelector("#availResults tbody");
  const takeBtn = document.getElementById("availTakeToIssueBtn");
  const clearBtn = document.getElementById("availClearBtn"); // NEW
  const countEl = document.getElementById("availCount"); // NEW

  if (!form || !titleEl || !authorEl || !errDiv || !tbody) return;

  // ---------------- INTERNAL RENDERER ----------------
  function loadRows(rows) {
    tbody.innerHTML = "";
    if (!rows || rows.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="5">No books found.</td>`;
      tbody.appendChild(tr);
      updateCount(rows || []);
      return;
    }

    rows.forEach((b) => {
      const tr = document.createElement("tr");
      const available = b.status === "Available" ? "Y" : "N";

      tr.innerHTML = `
        <td>
          <input type="radio" name="selBook"
                 data-name="${b.name ?? ""}"
                 data-author="${b.author ?? ""}"
                 data-serial="${b.serial_no ?? ""}"
                 ${b.status !== "Available" ? "disabled" : ""}>
        </td>
        <td>${b.name ?? ""}</td>
        <td>${b.author ?? ""}</td>
        <td>${b.serial_no ?? ""}</td>
        <td>${available}</td>
      `;

      const radio = tr.querySelector("input[type='radio']");

      // Row highlight when selecting
      if (radio) {
        radio.addEventListener("change", () => {
          document
            .querySelectorAll("#availResults tbody tr")
            .forEach((r) => r.classList.remove("avail-selected-row"));
          tr.classList.add("avail-selected-row");
        });
      }

      // Double-click row → auto issue
      tr.addEventListener("dblclick", () => {
        if (!radio || radio.disabled) return;
        radio.checked = true;
        radio.dispatchEvent(new Event("change", { bubbles: true }));
        if (takeBtn) takeBtn.click();
      });

      tbody.appendChild(tr);
    });

    updateCount(rows);
  }

  // update count label: show total and available count
  function updateCount(rows) {
    if (!countEl) return;
    const total = rows ? rows.length : 0;
    const avail = rows
      ? rows.filter((r) => r.status === "Available").length
      : 0;
    // If everything is available (typical default), show "Available Books: X"
    if (total > 0 && total === avail) {
      countEl.textContent = `Available Books: ${avail}`;
    } else {
      countEl.textContent = `Books shown: ${total} (Available: ${avail})`;
    }
  }

  // ---------------- LOAD AVAILABLE BOOKS BY DEFAULT ----------------
  let currentRows = [];

  async function loadMasterListAvailable() {
    if (countEl) countEl.textContent = "Loading books...";
    tbody.innerHTML = "<tr><td>Loading...</td></tr>";
    errDiv.textContent = "";
    try {
      const resp = await fetch("/api/reports/books");
      const data = await resp.json();
      if (!resp.ok) {
        tbody.innerHTML = "";
        errDiv.textContent = data.detail || "Error loading book list";
        if (countEl) countEl.textContent = "";
        return;
      }

      const rows = data.results || [];
      const onlyAvail = rows.filter((r) => r.status === "Available");

      currentRows = onlyAvail;
      loadRows(currentRows);
    } catch (e) {
      tbody.innerHTML = "";
      errDiv.textContent = "Server error while loading book list.";
      if (countEl) countEl.textContent = "";
      console.error("loadMasterListAvailable:", e);
    }
  }

  // ---------------- SEARCH SUBMIT ----------------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errDiv.textContent = "";
    tbody.innerHTML = "";

    const title = titleEl.value.trim();
    const author = authorEl.value.trim();

    if (!title && !author) {
      await loadMasterListAvailable();
      return;
    }

    try {
      const params = new URLSearchParams({ book: title, author });
      const resp = await fetch(
        `/api/transactions/availability?${params.toString()}`
      );
      const data = await resp.json();

      if (!resp.ok) {
        tbody.innerHTML = "";
        errDiv.textContent = data.detail || "Error searching";
        if (countEl) countEl.textContent = "";
        return;
      }

      currentRows = data.results || [];
      loadRows(currentRows);
    } catch (err) {
      tbody.innerHTML = "";
      errDiv.textContent = "Server error while searching.";
      if (countEl) countEl.textContent = "";
      console.error("availability search error:", err);
    }
  });

  // ---------------- LIVE FILTERING WHILE TYPING ----------------
  function debounce(fn, delay) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  const liveFilter = debounce(() => {
    const qTitle = titleEl.value.trim().toLowerCase();
    const qAuthor = authorEl.value.trim().toLowerCase();

    if (!currentRows || currentRows.length === 0) {
      // nothing to filter locally
      return;
    }

    const filtered = currentRows.filter((r) => {
      const n = (r.name || "").toLowerCase();
      const a = (r.author || "").toLowerCase();
      const m1 = qTitle ? n.includes(qTitle) : true;
      const m2 = qAuthor ? a.includes(qAuthor) : true;
      return m1 && m2;
    });

    loadRows(filtered);
  }, 250);

  titleEl.addEventListener("input", liveFilter);
  authorEl.addEventListener("input", liveFilter);

  // ---------------- CLEAR FILTERS (NEW) ----------------
  if (clearBtn) {
    clearBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // clear inputs
      titleEl.value = "";
      authorEl.value = "";
      errDiv.textContent = "";
      // restore default available master list
      loadMasterListAvailable();
      // focus book name input
      titleEl.focus();
    });
  }

  // ---------------- TAKE SELECTED TO ISSUE ----------------
  if (takeBtn) {
    takeBtn.addEventListener("click", () => {
      errDiv.textContent = "";
      const selected = document.querySelector('input[name="selBook"]:checked');

      if (!selected) {
        errDiv.textContent = "Please select an available book to issue.";
        return;
      }

      const name = selected.dataset.name || "";
      const author = selected.dataset.author || "";
      const serial = selected.dataset.serial || "";

      const membEl = document.getElementById("issueMember");
      const nameEl = document.getElementById("issueBookName");
      const authorEl = document.getElementById("issueAuthor");
      const serialEl = document.getElementById("issueSerial");
      const issueDateEl = document.getElementById("issueDate");
      const returnDateEl = document.getElementById("issueReturnDate");
      const issueErrorEl = document.getElementById("issueError");

      if (issueErrorEl) issueErrorEl.textContent = "";
      if (membEl && !membEl.value) membEl.value = "M001";

      nameEl.value = name;
      authorEl.value = author;
      serialEl.value = serial;

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      issueDateEl.value = `${yyyy}-${mm}-${dd}`;
      returnDateEl.value = "";

      showTxnPage("issue");
      returnDateEl.focus();
    });
  }

  // ---------------- INITIAL LOAD ----------------
  loadMasterListAvailable();
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
  const memberEl = document.getElementById("rbMemberId");
  const serialEl = document.getElementById("rbSerial");
  const bookNameEl = document.getElementById("rbBookName");
  const authorEl = document.getElementById("rbAuthor");
  const issueDateEl = document.getElementById("rbIssueDate");
  const plannedReturnEl = document.getElementById("rbReturnDate");
  const fineEl = document.getElementById("rbCalculatedFine");
  const remarksEl = document.getElementById("rbRemarks");
  const errDiv = document.getElementById("rbError");
  const findBtn = document.getElementById("rbFindBtn");
  const clearBtn = document.getElementById("rbClearBtn");
  const proceedBtn = document.getElementById("rbProceedBtn");
  const memberIssuesListEl = document.getElementById("rbMemberIssuesList");

  if (!form || !memberEl || !serialEl || !errDiv) return;

  // shared global for return → fine
  currentIssueForReturn = null;

  // ---------------- Helper: clear UI ----------------
  function clearReturnUI() {
    bookNameEl.value = "";
    authorEl.value = "";
    issueDateEl.value = "";
    plannedReturnEl.value = "";
    fineEl.value = "0";
    remarksEl.value = "";
    currentIssueForReturn = null;
    errDiv.textContent = "";
    // Clear highlight from availability table if any
    document
      .querySelectorAll("#availResults tbody tr")
      .forEach((r) => r.classList.remove("avail-selected-row"));
  }

  // ---------------- Helper: populate UI ----------------
  function populateReturnUI(data) {
    bookNameEl.value = data.book_name || "";
    authorEl.value = data.author || "";
    issueDateEl.value = data.issue_date || "";
    plannedReturnEl.value = data.return_date || "";
    fineEl.value = (data.fine_amount ?? 0).toString();
    remarksEl.value = "";
    currentIssueForReturn = data;
    errDiv.textContent = "";
  }

  // ---------------- Fetch helpers ----------------
  async function fetchActiveIssuesForMember(memberId) {
    try {
      const resp = await fetch("/api/reports/active-issues");
      const data = await resp.json();
      if (!resp.ok) return [];
      return (data.results || []).filter(
        (r) => (r.membership_id || "") === memberId
      );
    } catch {
      return [];
    }
  }

  async function fetchBookDetailsBySerial(serial) {
    try {
      const resp = await fetch("/api/reports/books");
      const data = await resp.json();
      if (!resp.ok) return null;
      return (
        (data.results || []).find((b) => (b.serial_no || "") === serial) || null
      );
    } catch {
      return null;
    }
  }

  // ---------------- Render list of active issues ----------------
  function renderMemberIssuesList(issues) {
    if (!issues || issues.length === 0) {
      memberIssuesListEl.style.display = "none";
      memberIssuesListEl.innerHTML = "";
      return;
    }

    memberIssuesListEl.innerHTML = "";
    issues.forEach((it) => {
      const div = document.createElement("div");
      div.style.padding = "6px";
      div.style.borderBottom = "1px solid #eee";
      div.style.cursor = "pointer";
      div.textContent = `Serial: ${it.serial_no} | Issue: ${it.issue_date} | Planned: ${it.planned_return}`;

      div.addEventListener("click", async () => {
        const book = await fetchBookDetailsBySerial(it.serial_no);

        const dataObj = {
          issue_id: it.issue_id,
          membership_id: it.membership_id,
          serial_no: it.serial_no,
          issue_date: it.issue_date,
          return_date: it.planned_return,
          book_name: book ? book.name : "",
          author: book ? book.author : "",
          fine_amount: 0,
        };

        // calculate fine (client-side)
        try {
          const plannedDt = new Date(it.planned_return);
          const today = new Date();
          const late = Math.floor((today - plannedDt) / 86400000);
          dataObj.fine_amount = late > 0 ? late * 10 : 0;
        } catch {}

        populateReturnUI(dataObj);
        memberIssuesListEl.style.display = "none";
      });

      memberIssuesListEl.appendChild(div);
    });

    memberIssuesListEl.style.display = "block";
  }

  // ---------------- Auto-populate when membership ID is entered ----------------
  memberEl.addEventListener("blur", async () => {
    const mid = memberEl.value.trim();
    if (!mid) {
      renderMemberIssuesList([]);
      return;
    }

    memberIssuesListEl.style.display = "block";
    memberIssuesListEl.textContent = "Checking active issues...";

    const issues = await fetchActiveIssuesForMember(mid);

    if (issues.length === 0) {
      memberIssuesListEl.textContent = "No active issues for this member.";
      setTimeout(() => renderMemberIssuesList([]), 5000);
      return;
    }

    if (issues.length === 1) {
      const it = issues[0];
      const book = await fetchBookDetailsBySerial(it.serial_no);

      const dataObj = {
        issue_id: it.issue_id,
        membership_id: it.membership_id,
        serial_no: it.serial_no,
        issue_date: it.issue_date,
        return_date: it.planned_return,
        book_name: book ? book.name : "",
        author: book ? book.author : "",
        fine_amount: 0,
      };

      try {
        const plannedDt = new Date(it.planned_return);
        const today = new Date();
        const late = Math.floor((today - plannedDt) / 86400000);
        dataObj.fine_amount = late > 0 ? late * 10 : 0;
      } catch {}

      populateReturnUI(dataObj);
      renderMemberIssuesList([]);
      return;
    }

    // more than one active issue → show list
    renderMemberIssuesList(issues);
  });

  // ---------------- Find Issue Button ----------------
  if (findBtn) {
    findBtn.addEventListener("click", async () => {
      errDiv.textContent = "";
      const mid = memberEl.value.trim();
      const serial = serialEl.value.trim();

      if (!mid || !serial) {
        errDiv.textContent = "Membership Id & Serial No are required.";
        return;
      }

      const fd = new FormData();
      fd.append("membership_id", mid);
      fd.append("serial_no", serial);

      try {
        const resp = await fetch("/api/transactions/return/start", {
          method: "POST",
          body: fd,
        });
        const data = await resp.json();

        if (!resp.ok) {
          errDiv.textContent = data.detail || "Issue not found.";
          return;
        }

        populateReturnUI(data);
      } catch {
        errDiv.textContent = "Server error.";
      }
    });
  }

  // ---------------- Clear Button ----------------
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      memberEl.value = "";
      serialEl.value = "";
      clearReturnUI();
      renderMemberIssuesList([]);
      memberEl.focus();
    });
  }

  // ---------------- Start Return (form submit) ----------------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errDiv.textContent = "";

    const mid = memberEl.value.trim();
    const serial = serialEl.value.trim();

    if (!mid || !serial) {
      errDiv.textContent = "Membership Id and Serial No required.";
      return;
    }

    const fd = new FormData();
    fd.append("membership_id", mid);
    fd.append("serial_no", serial);

    if (plannedReturnEl.value) fd.append("return_date", plannedReturnEl.value);
    if (remarksEl.value) fd.append("remarks", remarksEl.value);

    try {
      const resp = await fetch("/api/transactions/return/start", {
        method: "POST",
        body: fd,
      });

      const data = await resp.json();
      if (!resp.ok) {
        errDiv.textContent = data.detail || "Return start failed.";
        return;
      }

      populateReturnUI(data);
      showTxnPage("fine");
    } catch {
      errDiv.textContent = "Server error.";
    }
  });

  // ---------------- Proceed Button (go to fine or auto-complete) ----------------
  if (proceedBtn) {
    proceedBtn.addEventListener("click", async () => {
      errDiv.textContent = "";

      if (!currentIssueForReturn || !currentIssueForReturn.issue_id) {
        errDiv.textContent = "No issue selected.";
        return;
      }

      const actualReturn =
        plannedReturnEl.value || new Date().toISOString().slice(0, 10);
      const fineAmt = Number(fineEl.value || 0);
      const remarks = remarksEl.value || "";

      // If fine exists → go to Fine screen
      if (fineAmt > 0) {
        // Fill fine form
        document.getElementById("pfBookName").value =
          currentIssueForReturn.book_name || "";
        document.getElementById("pfAuthor").value =
          currentIssueForReturn.author || "";
        document.getElementById("pfSerial").value =
          currentIssueForReturn.serial_no || serialEl.value;
        document.getElementById("pfIssueDate").value =
          currentIssueForReturn.issue_date || "";
        document.getElementById("pfPlannedReturn").value =
          currentIssueForReturn.return_date || actualReturn;
        document.getElementById("pfActualReturn").value = "";
        document.getElementById("pfFine").value = fineAmt;
        document.getElementById("pfFinePaid").checked = false;
        document.getElementById("pfRemarks").value = remarks;
        document.getElementById("pfError").textContent = "";

        // set global for fine
        currentIssue = {
          issue_id: currentIssueForReturn.issue_id,
          membership_id: currentIssueForReturn.membership_id,
          serial_no: currentIssueForReturn.serial_no,
          book_name: currentIssueForReturn.book_name,
          author: currentIssueForReturn.author,
          issue_date: currentIssueForReturn.issue_date,
          return_date: currentIssueForReturn.return_date,
          fine_amount: fineAmt,
        };

        showTxnPage("fine");
        return;
      }

      // No fine → auto-complete return
      try {
        const fd = new FormData();
        fd.append("issue_id", currentIssueForReturn.issue_id);
        fd.append("actual_return_date", actualReturn);
        fd.append("fine_paid", "false");
        fd.append("remarks", remarks);

        const resp = await fetch("/api/transactions/fine", {
          method: "POST",
          body: fd,
        });

        const data = await resp.json();
        if (!resp.ok) {
          errDiv.textContent = data.detail || "Failed to complete return.";
          return;
        }

        errDiv.textContent = "Return completed successfully.";
        clearReturnUI();
        showStatus("success");
      } catch {
        errDiv.textContent = "Server error.";
      }
    });
  }

  // ---------------- Recalculate fine when planned date changes ----------------
  plannedReturnEl.addEventListener("change", () => {
    if (!currentIssueForReturn) return;
    try {
      const planned = new Date(plannedReturnEl.value);
      const today = new Date();
      const late = Math.floor((today - planned) / 86400000);
      fineEl.value = late > 0 ? late * 10 : 0;
    } catch {}
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
    const fineAmount = Number(document.getElementById("pfFine")?.value || 0);
    const finePaid = document.getElementById("pfFinePaid")?.checked;
    const remarks = document.getElementById("pfRemarks")?.value || "";

    if (!actualReturn) {
      errDiv.textContent = "Actual return date is required.";
      return;
    }

    if (fineAmount > 0 && !finePaid) {
      errDiv.textContent = "Fine pending — please select 'Fine Paid'.";
      return;
    }

    const fd = new FormData();
    fd.append("issue_id", currentIssue.issue_id);
    fd.append("actual_return_date", actualReturn);
    fd.append("fine_paid", finePaid ? "true" : "false");
    fd.append("remarks", remarks);

    try {
      const resp = await fetch("/api/transactions/fine", {
        method: "POST",
        body: fd,
      });
      const data = await resp.json();

      if (!resp.ok) {
        errDiv.textContent = data.detail || "Could not complete return.";
        return;
      }

      errDiv.textContent = "Return completed.";
      currentIssue = null;
    } catch {
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
