let currentRole = null;

function showSection(id) {
  const ids = [
    "loginSection",
    "homeSection",
    "transactionSection",
    "statusSection",
    "reportsSection",
    "maintenanceSection",
  ];
  ids.forEach((s) => document.getElementById(s).classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

function resetLogin() {
  document.getElementById("loginUser").value = "";
  document.getElementById("loginPass").value = "";
  document.getElementById("loginError").textContent = "";
}

async function handleLogin(e) {
  e.preventDefault();
  const form = document.getElementById("loginForm");
  const data = new FormData(form);

  try {
    const resp = await fetch("/api/auth/login", {
      method: "POST",
      body: data,
    });

    if (!resp.ok) {
      const err = await resp.json();
      document.getElementById("loginError").textContent =
        err.detail || "Login failed";
      return;
    }

    const result = await resp.json();
    currentRole = result.role;

    document.getElementById("homeTitle").textContent =
      currentRole === "admin" ? "Admin Home Page" : "User Home Page";

    document.getElementById("homeBtn").disabled = false;
    document.getElementById("logoutBtn").disabled = false;

    // show maintenance for admin
    document
      .querySelectorAll(".admin-only")
      .forEach(
        (el) =>
          (el.style.display = currentRole === "admin" ? "inline-block" : "none")
      );

    showSection("homeSection");
  } catch (err) {
    document.getElementById("loginError").textContent =
      "Error contacting server";
  }
}

function showMaintPage(name) {
  // Hide all maintenance pages
  document
    .querySelectorAll(".maint-page")
    .forEach((p) => p.classList.add("hidden"));

  // Show selected maintenance page
  const pageEl = document.getElementById("maint-" + name);
  if (pageEl) {
    pageEl.classList.remove("hidden");
  }

  // Remove active class from all maintenance menu buttons
  document
    .querySelectorAll("#maintenanceSection .side-menu button")
    .forEach((btn) => btn.classList.remove("active"));

  // Add active class to the button that matches this page
  const activeBtn = document.querySelector(
    `#maintenanceSection .side-menu button[data-page="${name}"]`
  );
  if (activeBtn) {
    activeBtn.classList.add("active");
  }
}



// Configuration for each report: endpoint, title and columns
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

  // Making sure only Reports section is shown
  showSection("reportsSection");

  const titleEl = document.getElementById("reportTitle");
  const thead = document.querySelector("#reportTable thead");
  const tbody = document.querySelector("#reportTable tbody");
  const errDiv = document.getElementById("reportError");

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

      // Build table header
      const headRow = document.createElement("tr");
      cfg.columns.forEach((col) => {
        const th = document.createElement("th");
        th.textContent = col.label;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);

      // No data case
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

      // Fill body
      rows.forEach((row) => {
        const tr = document.createElement("tr");
        cfg.columns.forEach((col) => {
          const td = document.createElement("td");
          let value = row[col.key];

          // Basic formatting for null / booleans
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
      document.getElementById("reportError").textContent =
        "Server error while loading report.";
    });
}

function goHome() {
  showSection("homeSection");
}

function logout() {
  currentRole = null;
  document.getElementById("homeBtn").disabled = true;
  document.getElementById("logoutBtn").disabled = true;
  resetLogin();
  showSection("loginSection");
  document.getElementById("statusText").textContent =
    "You have successfully logged out.";
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
  pages.forEach((p) =>
    document.getElementById(`txn-${p}`).classList.add("hidden")
  );
  document.getElementById(`txn-${name}`).classList.remove("hidden");
}

/* Availability */
document.getElementById("availForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("availTitle").value.trim();
  const author = document.getElementById("availAuthor").value.trim();
  const errDiv = document.getElementById("availError");
  const tbody = document.querySelector("#availResults tbody");
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

/* Issue */
document.getElementById("issueForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const member = document.getElementById("issueMember").value.trim();
  const name = document.getElementById("issueBookName").value.trim();
  const author = document.getElementById("issueAuthor").value.trim();
  const serial = document.getElementById("issueSerial").value.trim();
  const issueDate = document.getElementById("issueDate").value;
  const returnDate = document.getElementById("issueReturnDate").value;
  const remarks = document.getElementById("issueRemarks").value.trim();
  const errDiv = document.getElementById("issueError");

  if (!member || !name || !author || !serial || !issueDate || !returnDate) {
    errDiv.textContent = "All fields except remarks are mandatory.";
    return;
  }

  const formData = new FormData();
  formData.append("serial_no", serial);
  formData.append("membership_id", member);
  formData.append("issue_date", issueDate);
  formData.append("planned_return", returnDate);
  formData.append("remarks", remarks);

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

/* Return */
document.getElementById("returnForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const member = document.getElementById("returnMember").value.trim();
  const serial = document.getElementById("returnSerial").value.trim();
  const planned = document.getElementById("returnPlanned").value;
  const errDiv = document.getElementById("returnError");

  if (!member || !serial || !planned) {
    errDiv.textContent = "All fields are mandatory.";
    return;
  }

  const formData = new FormData();
  formData.append("serial_no", serial);
  formData.append("membership_id", member);
  formData.append("planned_return", planned);

  try {
    const resp = await fetch("/api/transactions/return", {
      method: "POST",
      body: formData,
    });
    const data = await resp.json();
    if (resp.status >= 400) {
      errDiv.textContent = data.detail || "Return failed.";
      return;
    }
    errDiv.textContent = "";
    // For fine step, we need issue id
    document.getElementById("fineIssueId").value = data.issue_id;
    showTxnPage("fine");
  } catch (err) {
    errDiv.textContent = "Server error.";
  }
});

/* Fine */
document.getElementById("fineForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const issueId = document.getElementById("fineIssueId").value;
  const actual = document.getElementById("fineActualReturn").value;
  const paid = document.getElementById("finePaid").checked;
  const errDiv = document.getElementById("fineError");

  if (!issueId || !actual) {
    errDiv.textContent = "Issue id and date are mandatory.";
    return;
  }

  const formData = new FormData();
  formData.append("issue_id", issueId);
  formData.append("actual_return_date", actual);
  formData.append("fine_paid", paid ? "true" : "false");

  try {
    const resp = await fetch("/api/transactions/fine", {
      method: "POST",
      body: formData,
    });
    const data = await resp.json();
    if (resp.status >= 400) {
      errDiv.textContent = data.detail || "Fine step failed.";
      return;
    }
    errDiv.textContent = "";
    showStatus("success");
  } catch (err) {
    errDiv.textContent = "Server error.";
  }
});

function showStatus(type) {
  const text =
    type === "cancel"
      ? "Transaction cancelled."
      : "Transaction completed successfully.";
  document.getElementById("statusText").textContent = text;
  showSection("statusSection");
}

/* Maintenance: Add membership */
// Add Membership
document
  .getElementById("addMemberForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const errDiv = document.getElementById("amError");

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
    formData.append("aadhar", document.getElementById("amAadhar").value.trim());
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

// Auto-load membership info when ID loses focus
document.getElementById("umId").addEventListener("blur", async () => {
  const id = document.getElementById("umId").value.trim();
  const info = document.getElementById("umInfo");
  const errDiv = document.getElementById("umError");
  if (!id) return;

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

// Submit update membership action
document
  .getElementById("updateMemberForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const errDiv = document.getElementById("umError");

    const membershipId = document.getElementById("umId").value.trim();
    const action = document.querySelector(
      "input[name='umAction']:checked"
    ).value;

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

/* Maintenance: Add book */
document.getElementById("addBookForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errDiv = document.getElementById("abError");

  const formData = new FormData();
  formData.append(
    "serial_no",
    document.getElementById("abSerial").value.trim()
  );
  formData.append("name", document.getElementById("abName").value.trim());
  formData.append("author", document.getElementById("abAuthor").value.trim());
  formData.append(
    "category",
    document.getElementById("abCategory").value.trim()
  );
  formData.append("procurement_date", document.getElementById("abDate").value);
  formData.append("cost", document.getElementById("abCost").value);
  formData.append("type", document.getElementById("abType").value);

  try {
    const resp = await fetch("/api/maintenance/book/add", {
      method: "POST",
      body: formData,
    });
    const data = await resp.json();
    if (!resp.ok) {
      errDiv.textContent = data.detail || "Error adding book/movie";
      return;
    }
    errDiv.textContent = "Book/Movie added successfully.";
  } catch {
    errDiv.textContent = "Server error.";
  }
});

// Auto-load book details based on serial no
document.getElementById("ubSerial").addEventListener("blur", async () => {
  const serial = document.getElementById("ubSerial").value.trim();
  const info = document.getElementById("ubInfo");
  const errDiv = document.getElementById("ubError");
  if (!serial) return;

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

document
  .getElementById("updateBookForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const errDiv = document.getElementById("ubError");

    const formData = new FormData();
    formData.append(
      "serial_no",
      document.getElementById("ubSerial").value.trim()
    );
    formData.append("name", document.getElementById("ubName").value.trim());
    formData.append("author", document.getElementById("ubAuthor").value.trim());
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

// Auto-load book details based on serial no
document.getElementById("ubSerial").addEventListener("blur", async () => {
  const serial = document.getElementById("ubSerial").value.trim();
  const info = document.getElementById("ubInfo");
  const errDiv = document.getElementById("ubError");
  if (!serial) return;

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

document
  .getElementById("updateBookForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const errDiv = document.getElementById("ubError");

    const formData = new FormData();
    formData.append(
      "serial_no",
      document.getElementById("ubSerial").value.trim()
    );
    formData.append("name", document.getElementById("ubName").value.trim());
    formData.append("author", document.getElementById("ubAuthor").value.trim());
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

// User Management
document
  .getElementById("userMgmtForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const errDiv = document.getElementById("uError");

    const mode = document.querySelector("input[name='umType']:checked").value; // new / existing
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

document.getElementById("loginForm").addEventListener("submit", handleLogin);
