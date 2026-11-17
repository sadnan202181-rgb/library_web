// IITC Smart Library - student & librarian portal (no backend, uses localStorage)
(function () {
  "use strict";

  var LIBRARIAN_PASSWORD = "admin123"; // demo only. Change it before sharing.
  var KEY = { books: "iitc_lib_books", reqs: "iitc_lib_requests", session: "iitc_lib_session" };

  // ---------- storage ----------
  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  var books = load(KEY.books, null) || JSON.parse(JSON.stringify(DEFAULT_BOOKS));
  var requests = load(KEY.reqs, []);
  var session = load(KEY.session, null);
  var role = "student";
  var filters = { cat: "All", avail: "all", q: "" };
  var libQuery = "";

  function persist() { save(KEY.books, books); save(KEY.reqs, requests); }
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function catClass(c) { return c === "Fictional" ? "c-fic" : c === "Academic" ? "c-acad" : "c-non"; }
  function norm(s) { return String(s).trim().toLowerCase().replace(/\s+/g, " "); }
  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }
  var toastTimer;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }
  function showError(id, msg) {
    var e = $(id);
    if (msg) { e.textContent = msg; e.hidden = false; } else { e.hidden = true; }
  }
  function findBook(title) {
    var n = norm(title);
    return books.filter(function (b) { return norm(b.title) === n; })[0];
  }
  function fillCategorySelects() {
    ["reqCategory", "addCategory"].forEach(function (id) {
      $(id).innerHTML = CATEGORIES.map(function (c) {
        return '<option value="' + esc(c) + '">' + esc(c) + "</option>";
      }).join("");
    });
  }

  function setRole(r) {
    role = r;
    Array.prototype.forEach.call(document.querySelectorAll(".role-btn"), function (b) {
      b.classList.toggle("active", b.getAttribute("data-role") === r);
    });
    $("studentFields").hidden = r !== "student";
    $("librarianFields").hidden = r !== "librarian";
    showError("loginError", "");
  }

  // ---------- views ----------
  function showView(name) {
    ["loginView", "studentView", "librarianView"].forEach(function (v) { $(v).hidden = v !== name; });
  }
  function switchTab(group, tab) {
    var nav = document.querySelector('.tabs[data-group="' + group + '"]');
    Array.prototype.forEach.call(nav.querySelectorAll(".tab"), function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === tab);
    });
    Array.prototype.forEach.call(nav.parentNode.querySelectorAll(".tab-panel"), function (p) {
      p.hidden = p.id !== "tab-" + tab;
    });
  }
  function enter() {
    var userBox = $("userBox");
    if (!session) {
      userBox.hidden = true;
      showView("loginView");
      return;
    }
    userBox.hidden = false;
    if (session.role === "librarian") {
      $("userLabel").textContent = "Librarian";
      showView("librarianView");
      renderLibrarian();
    } else {
      $("userLabel").textContent = session.name + " (" + session.id + ")";
      showView("studentView");
      renderStudent();
    }
  }

  // ---------- student ----------
  function renderChips() {
    var all = ["All"].concat(CATEGORIES);
    $("catChips").innerHTML = all.map(function (c) {
      return '<button type="button" class="chip' + (filters.cat === c ? " active" : "") +
        '" data-cat="' + esc(c) + '">' + esc(c) + "</button>";
    }).join("");
  }
  function visibleBooks() {
    var q = norm(filters.q);
    return books.filter(function (b) {
      if (filters.cat !== "All" && b.category !== filters.cat) return false;
      if (filters.avail === "available" && b.copies <= 0) return false;
      if (filters.avail === "unavailable" && b.copies > 0) return false;
      if (q && norm(b.title + " " + b.author).indexOf(q) === -1) return false;
      return true;
    });
  }
  function renderCatalog() {
    renderChips();
    var list = visibleBooks();
    var avail = list.filter(function (b) { return b.copies > 0; }).length;
    $("catalogSummary").textContent = list.length + (list.length === 1 ? " book" : " books") + " shown. " + avail + " on the shelf, " +
      (list.length - avail) + " not available.";
    if (!list.length) {
      $("bookGrid").innerHTML = '<p class="empty">No books match. Try another search, or request this book.</p>';
      return;
    }
    $("bookGrid").innerHTML = list.map(function (b) {
      var ok = b.copies > 0;
      return '<article class="book ' + catClass(b.category) + '">' +
        '<div class="spine"></div>' +
        '<div class="book-body">' +
        '<span class="cat-tag">' + esc(b.category) + "</span>" +
        "<h3>" + esc(b.title) + "</h3>" +
        '<p class="author">' + esc(b.author) + "</p>" +
        '<div class="book-foot">' +
        '<span class="badge ' + (ok ? "ok" : "no") + '">' +
        (ok ? "Available, " + b.copies + (b.copies === 1 ? " copy" : " copies") : "Not available") + "</span>" +
        (ok ? "" : '<button type="button" class="btn small" data-action="prefill" data-id="' + esc(b.id) + '">Request</button>') +
        "</div></div></article>";
    }).join("");
  }
  function myRequests() {
    return requests.filter(function (r) { return session && r.studentId === session.id; })
      .sort(function (a, b) { return b.date - a.date; });
  }
  function statusLabel(s) { return s === "pending" ? "Waiting for librarian" : s === "approved" ? "Approved" : "Declined"; }
  function renderMyRequests() {
    var mine = myRequests();
    var pending = mine.filter(function (r) { return r.status === "pending"; }).length;
    $("myReqCount").textContent = pending ? pending : "";
    if (!mine.length) {
      $("myRequestList").innerHTML = '<p class="empty">You haven\'t requested any books yet.</p>';
      return;
    }
    $("myRequestList").innerHTML = mine.map(function (r) {
      return '<div class="row ' + esc(r.status) + '">' +
        '<div class="row-main"><h3>' + esc(r.title) + "</h3>" +
        '<p class="author">' + esc(r.author) + " &middot; " + esc(r.category) + " &middot; " + fmtDate(r.date) + "</p></div>" +
        '<span class="status ' + esc(r.status) + '">' + statusLabel(r.status) + "</span></div>";
    }).join("");
  }
  function renderStudent() {
    renderCatalog();
    renderMyRequests();
  }

  // ---------- librarian ----------
  function renderStats() {
    var total = books.length;
    var avail = books.filter(function (b) { return b.copies > 0; }).length;
    var pending = requests.filter(function (r) { return r.status === "pending"; }).length;
    var items = [
      [total, "Titles in catalog"],
      [avail, "On the shelf"],
      [total - avail, "Not available"],
      [pending, "Requests waiting"]
    ];
    $("stats").innerHTML = items.map(function (i) {
      return '<div class="stat"><b>' + i[0] + "</b><span>" + i[1] + "</span></div>";
    }).join("");
  }
  function renderRequests() {
    var pending = requests.filter(function (r) { return r.status === "pending"; });
    $("pendingCount").textContent = pending.length ? pending.length : "";
    if (!requests.length) {
      $("requestList").innerHTML = '<p class="empty">No requests yet. Student requests will show up here.</p>';
      return;
    }
    var sorted = requests.slice().sort(function (a, b) {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return b.date - a.date;
    });
    $("requestList").innerHTML = sorted.map(function (r) {
      var actions = r.status === "pending"
        ? '<div class="row-actions">' +
          '<button type="button" class="btn primary small" data-action="approve" data-id="' + esc(r.id) + '">Approve</button>' +
          '<button type="button" class="btn ghost small" data-action="decline" data-id="' + esc(r.id) + '">Decline</button></div>'
        : '<span class="status ' + esc(r.status) + '">' + statusLabel(r.status) + "</span>";
      return '<div class="row ' + esc(r.status) + '">' +
        '<div class="row-main"><h3>' + esc(r.title) + "</h3>" +
        '<p class="author">' + esc(r.author) + " &middot; " + esc(r.category) + "</p>" +
        '<p class="meta">Requested by ' + esc(r.studentName) + " (" + esc(r.studentId) + ") on " + fmtDate(r.date) + "</p>" +
        (r.reason ? '<p class="reason">"' + esc(r.reason) + '"</p>' : "") +
        "</div>" + actions + "</div>";
    }).join("");
  }
  function renderLibBooks() {
    var q = norm(libQuery);
    var list = books.filter(function (b) { return !q || norm(b.title + " " + b.author).indexOf(q) !== -1; });
    if (!list.length) {
      $("libBookList").innerHTML = '<p class="empty">No books found.</p>';
      return;
    }
    $("libBookList").innerHTML = list.map(function (b) {
      return '<div class="row">' +
        '<div class="row-main"><h3>' + esc(b.title) + "</h3>" +
        '<p class="author">' + esc(b.author) + " &middot; " + esc(b.category) + "</p></div>" +
        '<div class="row-actions">' +
        '<div class="stepper" aria-label="Copies">' +
        '<button type="button" data-action="dec" data-id="' + esc(b.id) + '" aria-label="Remove one copy">&minus;</button>' +
        '<span class="copies ' + (b.copies > 0 ? "ok" : "no") + '">' + b.copies + "</span>" +
        '<button type="button" data-action="inc" data-id="' + esc(b.id) + '" aria-label="Add one copy">+</button></div>' +
        '<button type="button" class="btn ghost small" data-action="delete" data-id="' + esc(b.id) + '">Delete</button>' +
        "</div></div>";
    }).join("");
  }
  function renderLibrarian() {
    renderStats();
    renderRequests();
    renderLibBooks();
  }

  // ---------- actions ----------
  function refresh() {
    persist();
    if (!session) return;
    if (session.role === "librarian") renderLibrarian(); else renderStudent();
  }

  function approve(id) {
    var r = requests.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    r.status = "approved";
    if (!findBook(r.title)) {
      // approved books join the catalog with 0 copies until the library gets them
      books.push({ id: uid("b"), title: r.title, author: r.author, category: r.category, copies: 0 });
    }
    refresh();
    toast("Approved. Added to the catalog with 0 copies.");
  }
  function decline(id) {
    var r = requests.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    r.status = "declined";
    refresh();
    toast("Request declined.");
  }
  function changeCopies(id, delta) {
    var b = books.filter(function (x) { return x.id === id; })[0];
    if (!b) return;
    b.copies = Math.max(0, b.copies + delta);
    refresh();
  }
  function deleteBook(id) {
    var b = books.filter(function (x) { return x.id === id; })[0];
    if (!b) return;
    if (!window.confirm('Delete "' + b.title + '" from the catalog?')) return;
    books = books.filter(function (x) { return x.id !== id; });
    refresh();
    toast("Book deleted.");
  }
  function prefill(id) {
    var b = books.filter(function (x) { return x.id === id; })[0];
    if (!b) return;
    $("reqTitle").value = b.title;
    $("reqAuthor").value = b.author;
    $("reqCategory").value = b.category;
    switchTab("student", "request");
    window.scrollTo(0, 0);
  }

  // ---------- events ----------
  function bind() {
    // login role switch
    Array.prototype.forEach.call(document.querySelectorAll(".role-btn"), function (btn) {
      btn.addEventListener("click", function () { setRole(btn.getAttribute("data-role")); });
    });

    $("loginForm").addEventListener("submit", function (e) {
      e.preventDefault();
      if (role === "librarian") {
        if ($("libPassword").value !== LIBRARIAN_PASSWORD) {
          showError("loginError", "Wrong password. Try again.");
          return;
        }
        session = { role: "librarian" };
      } else {
        var name = $("studentName").value.trim();
        var sid = $("studentId").value.trim();
        if (!name || !sid) {
          showError("loginError", "Enter both your name and student ID.");
          return;
        }
        session = { role: "student", name: name, id: sid };
      }
      showError("loginError", "");
      save(KEY.session, session);
      $("loginForm").reset();
      enter();
    });

    $("logoutBtn").addEventListener("click", function () {
      session = null;
      try { localStorage.removeItem(KEY.session); } catch (e) {}
      setRole("student");
      enter();
    });

    // tabs
    Array.prototype.forEach.call(document.querySelectorAll(".tabs"), function (nav) {
      nav.addEventListener("click", function (e) {
        var btn = e.target.closest(".tab");
        if (!btn) return;
        switchTab(nav.getAttribute("data-group"), btn.getAttribute("data-tab"));
      });
    });

    // student catalog filters
    $("searchInput").addEventListener("input", function (e) { filters.q = e.target.value; renderCatalog(); });
    $("availFilter").addEventListener("change", function (e) { filters.avail = e.target.value; renderCatalog(); });
    $("catChips").addEventListener("click", function (e) {
      var c = e.target.closest(".chip");
      if (!c) return;
      filters.cat = c.getAttribute("data-cat");
      renderCatalog();
    });
    $("bookGrid").addEventListener("click", function (e) {
      var b = e.target.closest("[data-action]");
      if (b && b.getAttribute("data-action") === "prefill") prefill(b.getAttribute("data-id"));
    });

    // request form
    $("requestForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var title = $("reqTitle").value.trim();
      var author = $("reqAuthor").value.trim();
      if (!title || !author) { showError("reqError", "Enter the book title and author."); return; }
      var existing = findBook(title);
      if (existing && existing.copies > 0) {
        showError("reqError", '"' + existing.title + '" is already on the shelf. Check the Catalog.');
        return;
      }
      var dup = requests.some(function (r) {
        return r.status === "pending" && r.studentId === session.id && norm(r.title) === norm(title);
      });
      if (dup) { showError("reqError", "You already have a pending request for this book."); return; }
      requests.push({
        id: uid("r"), title: title, author: author, category: $("reqCategory").value,
        reason: $("reqReason").value.trim(), studentName: session.name, studentId: session.id,
        status: "pending", date: Date.now()
      });
      showError("reqError", "");
      $("requestForm").reset();
      refresh();
      switchTab("student", "myrequests");
      toast("Request sent to the librarian.");
    });

    // librarian
    $("requestList").addEventListener("click", function (e) {
      var b = e.target.closest("[data-action]");
      if (!b) return;
      var a = b.getAttribute("data-action"), id = b.getAttribute("data-id");
      if (a === "approve") approve(id); else if (a === "decline") decline(id);
    });
    $("libBookList").addEventListener("click", function (e) {
      var b = e.target.closest("[data-action]");
      if (!b) return;
      var a = b.getAttribute("data-action"), id = b.getAttribute("data-id");
      if (a === "inc") changeCopies(id, 1);
      else if (a === "dec") changeCopies(id, -1);
      else if (a === "delete") deleteBook(id);
    });
    $("libSearch").addEventListener("input", function (e) { libQuery = e.target.value; renderLibBooks(); });

    $("addBookForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var title = $("addTitle").value.trim();
      var author = $("addAuthor").value.trim();
      var copies = parseInt($("addCopies").value, 10);
      if (!title || !author) { showError("addError", "Enter the title and author."); return; }
      if (isNaN(copies) || copies < 0) copies = 0;
      if (findBook(title)) { showError("addError", "This title is already in the catalog."); return; }
      books.push({ id: uid("b"), title: title, author: author, category: $("addCategory").value, copies: copies });
      showError("addError", "");
      $("addBookForm").reset();
      $("addCopies").value = 1;
      refresh();
      toast("Added to the catalog.");
    });

    // keep two open tabs in sync
    window.addEventListener("storage", function (e) {
      if (e.key === KEY.books || e.key === KEY.reqs) {
        books = load(KEY.books, books);
        requests = load(KEY.reqs, requests);
        if (session) { if (session.role === "librarian") renderLibrarian(); else renderStudent(); }
      }
    });
  }

  fillCategorySelects();
  bind();
  persist();
  enter();
})();
