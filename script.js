// ============================================
//   STUDENT PORTAL — script.js
// ============================================

let db;                          // SQLite database instance
let sortCol = 'name';            // Current sort column
let sortDir = 'ASC';             // Current sort direction
let toastTimer;                  // Toast auto-hide timer

// ============================================
//   AUTH — Login / Logout
// ============================================

function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const err   = document.getElementById('loginError');

  if (email === 'fy project' && pass === '123') {
    err.style.display = 'none';
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    updateDashboard();
  } else {
    err.style.display = 'block';
  }
}

function doLogout() {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPass').value = '';
}

// ============================================
//   NAVIGATION
// ============================================

function showPage(name, btn) {
  // Hide all pages, deactivate all nav links
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  // Show selected page
  document.getElementById('page-' + name).classList.add('active');
  if (btn) btn.classList.add('active');

  // Page-specific refresh
  if (name === 'dashboard') updateDashboard();
  if (name === 'students')  loadTable();
}

// ============================================
//   DATABASE — Init with SQL.js (SQLite)
// ============================================

async function initDB() {
  const SQL = await initSqlJs({
    locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`
  });

  db = new SQL.Database();

  // Create students table
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT UNIQUE,
      name       TEXT NOT NULL,
      age        INTEGER,
      class      TEXT,
      section    TEXT,
      gpa        REAL,
      status     TEXT DEFAULT 'Active',
      email      TEXT,
      phone      TEXT
    );
  `);

  // Seed sample data
  const seed = [
    ['STU-001', 'Sajrul laskar ',  16, 'Grade 11', 'A', 3.9,  'Active',    'sajrul123@gmail.com',  '+91 9812345678'],
    ['STU-002', 'Keshab ree',   17, 'Grade 12', 'B', 3.5,  'Active',    'keshabree123@school.edu',  '+91 9823456789'],
    ['STU-003', 'Kritiraj duttagupta',    15, 'Grade 10', 'A', 3.8,  'Active',    'pritiraj@school.edu',  '+91 9834567890'],
    ['STU-004', 'Sheikh shariar',   18, 'Grade 12', 'A', 2.9,  'Active',    'sheikhsaha786@school.edu',  '+91 9845678901'],
    ['STU-005', 'Bailut bareh',   16, 'Grade 11', 'C', 3.1,  'Active',    'bailut345@school.edu',  '+91 9856789012'],
    ['STU-006', 'Mumin rosul mazumder',       17, 'Grade 11', 'B', 2.4,  'Inactive',  'mumin12@school.edu',    '+91 9867890123'],
    ['STU-007', 'vivek chakraborty',     18, 'Grade 12', 'A', 3.95, 'Active',    'vivekch123@school.edu',   '+91 9878901234'],
    ['STU-008', 'Minhaz mazumder',   15, 'Grade 10', 'B', 3.3,  'Active',    'minhazmaz@school.edu',  '+91 9889012345'],
    ['STU-009', 'Ekram Choudhury',    16, 'Grade 11', 'A', 3.7,  'Active',    'ekram123@school.edu',  '+91 9890123456'],
    ['STU-010', 'shabaz',   18, 'Grade 12', 'C', 1.8,  'Graduated', 'shabaz@school.edu',  '+91 9801234567'],
  ];

  const stmt = db.prepare(
    'INSERT INTO students (student_id,name,age,class,section,gpa,status,email,phone) VALUES (?,?,?,?,?,?,?,?,?)'
  );
  seed.forEach(row => stmt.run(row));
  stmt.free();
}

// ============================================
//   DASHBOARD — Stats & Charts
// ============================================

function updateDashboard() {
  if (!db) return;

  // Stat numbers
  const total   = db.exec('SELECT COUNT(*) FROM students')[0]?.values[0][0] || 0;
  const active  = db.exec("SELECT COUNT(*) FROM students WHERE status='Active'")[0]?.values[0][0] || 0;
  const inactive= db.exec("SELECT COUNT(*) FROM students WHERE status='Inactive'")[0]?.values[0][0] || 0;
  const avgGpa  = db.exec('SELECT ROUND(AVG(gpa),2) FROM students')[0]?.values[0][0];

  document.getElementById('dashTotal').textContent    = total;
  document.getElementById('dashActive').textContent   = active;
  document.getElementById('dashInactive').textContent = inactive;
  document.getElementById('dashAvgGpa').textContent   = avgGpa ? `Average GPA: ${avgGpa}` : '';

  // --- Students by Class bar chart ---
  const classes = [];
  const stmtC = db.prepare(
    'SELECT class, COUNT(*) as cnt FROM students WHERE class IS NOT NULL GROUP BY class ORDER BY class'
  );
  while (stmtC.step()) classes.push(stmtC.getAsObject());
  stmtC.free();

  const gradeEl = document.getElementById('gradeBreakdown');
  const colors  = ['#2563eb','#16a34a','#ea580c','#7c3aed','#0891b2','#be185d'];

  if (classes.length) {
    const max = Math.max(...classes.map(c => c.cnt));
    gradeEl.innerHTML = classes.map((c, i) => `
      <div class="grade-row">
        <span class="grade-label">${c.class}</span>
        <div class="grade-bar-wrap">
          <div class="grade-bar" style="width:${(c.cnt / max) * 100}%; background:${colors[i % colors.length]};"></div>
        </div>
        <span class="grade-count">${c.cnt}</span>
      </div>
    `).join('');
  } else {
    gradeEl.innerHTML = '<p style="color:#9ca3af; font-size:14px;">No grade data available</p>';
  }

  // --- GPA distribution bar chart ---
  const gpaBands = [
    { label: 'A  (3.7–4.0)', min: 3.7,  max: 4.01, color: '#16a34a' },
    { label: 'B  (3.0–3.6)', min: 3.0,  max: 3.7,  color: '#2563eb' },
    { label: 'C  (2.0–2.9)', min: 2.0,  max: 3.0,  color: '#f59e0b' },
    { label: 'D  (1.0–1.9)', min: 1.0,  max: 2.0,  color: '#ea580c' },
    { label: 'F  (0–0.9)',   min: 0,    max: 1.0,  color: '#dc2626' },
  ];

  const gpaRows = gpaBands.map(b => {
    const cnt = db.exec(
      `SELECT COUNT(*) FROM students WHERE gpa >= ${b.min} AND gpa < ${b.max}`
    )[0]?.values[0][0] || 0;
    return { ...b, cnt };
  });

  const gpaEl  = document.getElementById('gpaBreakdown');
  const gpaMax = Math.max(...gpaRows.map(r => r.cnt), 1);

  if (total > 0) {
    gpaEl.innerHTML = gpaRows.map(r => `
      <div class="grade-row">
        <span class="grade-label" style="font-size:12px;">${r.label}</span>
        <div class="grade-bar-wrap">
          <div class="grade-bar" style="width:${(r.cnt / gpaMax) * 100}%; background:${r.color};"></div>
        </div>
        <span class="grade-count">${r.cnt}</span>
      </div>
    `).join('');
  } else {
    gpaEl.innerHTML = '<p style="color:#9ca3af; font-size:14px;">No GPA data available</p>';
  }
}

// ============================================
//   STUDENT TABLE — Load & Render
// ============================================

function gpaToGrade(gpa) {
  if (!gpa && gpa !== 0) return '—';
  if (gpa >= 3.7) return 'A';
  if (gpa >= 3.0) return 'B';
  if (gpa >= 2.0) return 'C';
  if (gpa >= 1.0) return 'D';
  return 'F';
}

function gradeClass(g) {
  const map = { A: 'badge-green', B: 'badge-blue', C: 'badge-yellow', D: 'badge-red', F: 'badge-red' };
  return map[g] || 'badge-gray';
}

function loadTable() {
  if (!db) return;

  const search = document.getElementById('searchBox').value.trim();
  const fc     = document.getElementById('filterClass').value;
  const fs     = document.getElementById('filterStatus').value;

  // Build WHERE clause dynamically
  const where  = [];
  const params = {};

  if (search) {
    where.push('(name LIKE $s OR student_id LIKE $s OR class LIKE $s OR email LIKE $s)');
    params.$s = `%${search}%`;
  }
  if (fc) { where.push('class = $fc');  params.$fc = fc; }
  if (fs) { where.push('status = $fs'); params.$fs = fs; }

  const sql  = `SELECT * FROM students ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${sortCol} ${sortDir}`;
  const rows = [];

  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
  } catch (e) {
    console.error('Query error:', e);
  }

  const tbody = document.getElementById('tableBody');

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty"><div class="empty-icon">🔎</div>No students found.</div></td></tr>`;
    document.getElementById('rowCount').textContent = '0 records';
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const g         = gpaToGrade(r.gpa);
    const statusCls = r.status === 'Active' ? 'badge-green' : r.status === 'Graduated' ? 'badge-purple' : 'badge-gray';
    const gpaColor  = r.gpa >= 3.5 ? '#16a34a' : r.gpa >= 2.5 ? '#2563eb' : '#ea580c';
    const safeName  = r.name.replace(/'/g, "\\'");

    return `
      <tr>
        <td><span style="font-family:monospace; font-size:13px; color:#2563eb; font-weight:600;">${r.student_id || '—'}</span></td>
        <td><b>${r.name}</b></td>
        <td>${r.class || '—'}</td>
        <td>${r.section || '—'}</td>
        <td>${r.age || '—'}</td>
        <td><b style="color:${gpaColor}">${r.gpa != null ? parseFloat(r.gpa).toFixed(2) : '—'}</b></td>
        <td><span class="badge ${gradeClass(g)}">${g}</span></td>
        <td><span class="badge ${statusCls}">${r.status}</span></td>
        <td style="font-size:12px; color:#6b7280;">${r.email || '—'}</td>
        <td>
          <button class="icon-btn"     onclick="editStudent(${r.id})">✏ Edit</button>
          <button class="icon-btn del" onclick="deleteStudent(${r.id}, '${safeName}')">🗑 Delete</button>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('rowCount').textContent = `${rows.length} record${rows.length !== 1 ? 's' : ''}`;
}

function sortBy(col) {
  if (sortCol === col) {
    sortDir = sortDir === 'ASC' ? 'DESC' : 'ASC';
  } else {
    sortCol = col;
    sortDir = 'ASC';
  }
  loadTable();
}

// ============================================
//   SAVE STUDENT — Add or Update
// ============================================

function saveStudent() {
  const id     = document.getElementById('editId').value;
  const name   = document.getElementById('fName').value.trim();
  const sid    = document.getElementById('fStudentId').value.trim();
  const age    = document.getElementById('fAge').value;
  const cls    = document.getElementById('fClass').value;
  const sec    = document.getElementById('fSection').value.trim();
  const gpa    = document.getElementById('fGpa').value;
  const status = document.getElementById('fStatus').value;
  const email  = document.getElementById('fEmail').value.trim();
  const phone  = document.getElementById('fPhone').value.trim();

  if (!name) { showToast('Name is required!', '⚠️'); return; }
  if (!sid)  { showToast('Student ID is required!', '⚠️'); return; }

  try {
    if (id) {
      // UPDATE existing student
      db.run(
        'UPDATE students SET student_id=?,name=?,age=?,class=?,section=?,gpa=?,status=?,email=?,phone=? WHERE id=?',
        [sid, name, age || null, cls || null, sec || null, gpa || null, status, email || null, phone || null, id]
      );
      showToast(`${name} updated successfully!`, '✅');
    } else {
      // INSERT new student
      db.run(
        'INSERT INTO students (student_id,name,age,class,section,gpa,status,email,phone) VALUES (?,?,?,?,?,?,?,?,?)',
        [sid, name, age || null, cls || null, sec || null, gpa || null, status, email || null, phone || null]
      );
      showToast(`${name} added successfully!`, '🎉');
    }

    // Show success banner
    const banner = document.getElementById('successBanner');
    document.getElementById('successMsg').textContent = id
      ? `${name} has been updated.`
      : `${name} has been added to the database.`;
    banner.style.display = 'flex';
    setTimeout(() => banner.style.display = 'none', 3500);

    resetForm();
    updateDashboard();

  } catch (e) {
    const msg = e.message.includes('UNIQUE') ? 'Student ID already exists!' : e.message;
    showToast(msg, '❌');
  }
}

// ============================================
//   EDIT STUDENT — Pre-fill form
// ============================================

function editStudent(id) {
  const stmt = db.prepare('SELECT * FROM students WHERE id=?');
  stmt.bind([id]);

  if (stmt.step()) {
    const r = stmt.getAsObject();
    stmt.free();

    document.getElementById('editId').value       = r.id;
    document.getElementById('fName').value        = r.name       || '';
    document.getElementById('fStudentId').value   = r.student_id || '';
    document.getElementById('fAge').value         = r.age        || '';
    document.getElementById('fClass').value       = r.class      || '';
    document.getElementById('fSection').value     = r.section    || '';
    document.getElementById('fGpa').value         = r.gpa        || '';
    document.getElementById('fStatus').value      = r.status     || 'Active';
    document.getElementById('fEmail').value       = r.email      || '';
    document.getElementById('fPhone').value       = r.phone      || '';

    document.getElementById('addPageTitle').textContent  = 'Edit Student';
    document.getElementById('addPageSub').textContent    = `Editing record for ${r.name}`;
    document.getElementById('formCardTitle').textContent = 'Edit Student Information';

    showPage('addStudent', document.querySelectorAll('.nav-link')[2]);
  }
}

// ============================================
//   DELETE STUDENT
// ============================================

function deleteStudent(id, name) {
  if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
  db.run('DELETE FROM students WHERE id=?', [id]);
  showToast(`${name} deleted.`, '🗑️');
  loadTable();
  updateDashboard();
}

// ============================================
//   RESET FORM
// ============================================

function resetForm() {
  document.getElementById('editId').value = '';
  ['fName', 'fStudentId', 'fAge', 'fSection', 'fGpa', 'fEmail', 'fPhone']
    .forEach(f => document.getElementById(f).value = '');
  document.getElementById('fClass').value  = '';
  document.getElementById('fStatus').value = 'Active';

  document.getElementById('addPageTitle').textContent  = 'Add Student';
  document.getElementById('addPageSub').textContent    = 'Fill in the details below to register a new student';
  document.getElementById('formCardTitle').textContent = 'Student Information';
}

// ============================================
//   SQL CONSOLE
// ============================================

function runSQL() {
  const sql       = document.getElementById('sqlInput').value.trim();
  const resultDiv = document.getElementById('sqlResult');
  if (!sql) return;

  resultDiv.style.display = 'block';

  try {
    const results = db.exec(sql);

    if (!results.length) {
      resultDiv.innerHTML = `<span class="sql-success">✅ Query executed successfully. No rows returned.</span>`;
      loadTable();
      updateDashboard();
      return;
    }

    const res  = results[0];
    let html   = `<span class="sql-success">✅ ${res.values.length} row(s) returned</span><br><br>`;
    html      += `<table><thead><tr>${res.columns.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>`;
    html      += res.values.map(row => `<tr>${row.map(v => `<td>${v ?? 'NULL'}</td>`).join('')}</tr>`).join('');
    html      += `</tbody></table>`;
    resultDiv.innerHTML = html;

  } catch (e) {
    resultDiv.innerHTML = `<span class="sql-error">❌ ${e.message}</span>`;
  }
}

function setSQL(query) {
  document.getElementById('sqlInput').value = query;
  runSQL();
}

// Ctrl+Enter shortcut in SQL console
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter' && document.activeElement === document.getElementById('sqlInput')) {
    runSQL();
  }
});

// ============================================
//   EXPORT CSV
// ============================================

function exportCSV() {
  const rows  = [];
  const stmt  = db.prepare('SELECT student_id,name,age,class,section,gpa,status,email,phone FROM students ORDER BY name');
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();

  const cols = ['student_id', 'name', 'age', 'class', 'section', 'gpa', 'status', 'email', 'phone'];
  const csv  = cols.join(',') + '\n' + rows.map(r => cols.map(c => `"${r[c] ?? ''}"`).join(',')).join('\n');

  const a = document.createElement('a');
  a.href     = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'students.csv';
  a.click();

  showToast('CSV exported!', '📥');
}

// ============================================
//   TOAST NOTIFICATION
// ============================================

function showToast(msg, icon = 'ℹ️') {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent  = msg;
  document.getElementById('toastIcon').textContent = icon;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ============================================
//   BOOT — Initialise the app
// ============================================

initDB()
  .then(() => {
    updateDashboard();
  })
  .catch(() => {
    document.getElementById('tableBody').innerHTML =
      `<tr><td colspan="10"><div class="empty">⚠️ Failed to load SQL engine. Check your internet connection.</div></td></tr>`;
  });
