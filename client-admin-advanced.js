// client-admin-advanced.js

window.currentSqlTable = ''; 

window.loadSqlTables = async function() {
    const tableSelect = document.getElementById('sql_table_select');
    if (!tableSelect) return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/admin/sql/tables`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            tableSelect.innerHTML = '<option value="">-- בחר טבלה לצפייה ועריכה --</option>';
            data.tables.forEach(tableName => {
                const opt = document.createElement('option');
                opt.value = tableName;
                opt.textContent = tableName;
                tableSelect.appendChild(opt);
            });
        }
    } catch (err) {
        showToast('שגיאה בטעינת טבלאות', 'error');
    }
};

window.executeQuickTableQuery = function() {
    const tableName = document.getElementById('sql_table_select').value;
    if (!tableName) return;
    
    window.currentSqlTable = tableName;
    const queryInput = document.getElementById('sql_query_input');
    queryInput.value = `SELECT * FROM ${tableName} LIMIT 100`;
    executeSqlQuery();
};

window.executeSqlQuery = async function(e) {
    if (e) e.preventDefault();
    
    const queryInput = document.getElementById('sql_query_input').value.trim();
    if (!queryInput) return;
    
    const match = queryInput.match(/FROM\s+([A-Za-z0-9_]+)/i);
    if (match) {
        window.currentSqlTable = match[1];
    }
    
    const btn = document.getElementById('btn-run-sql');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> מריץ...';
    btn.disabled = true;
    
    const resultsContainer = document.getElementById('sql_results_container');
    const errorContainer = document.getElementById('sql_error_container');
    const metaContainer = document.getElementById('sql_meta_container');
    
    resultsContainer.innerHTML = '';
    errorContainer.style.display = 'none';
    metaContainer.innerHTML = '';
    
    try {
        const res = await fetch(`${API_BASE_URL}/admin/sql/execute`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken, query: queryInput })
        });
        const data = await res.json();
        
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        if (res.ok && data.success) {
            renderSqlResults(data.results, data.meta);
        } else {
            errorContainer.style.display = 'block';
            errorContainer.textContent = data.error || 'שגיאה בהרצת השאילתה';
        }
    } catch (err) {
        btn.innerHTML = originalText;
        btn.disabled = false;
        errorContainer.style.display = 'block';
        errorContainer.textContent = 'שגיאת תקשורת מול השרת';
    }
};

function renderSqlResults(results, meta) {
    const resultsContainer = document.getElementById('sql_results_container');
    const metaContainer = document.getElementById('sql_meta_container');
    
    if (meta && meta.changes !== undefined) {
        metaContainer.innerHTML = `<span class="status-ok"><i class="fa-solid fa-check"></i> הפעולה בוצעה בהצלחה. שורות שהושפעו: ${meta.changes}</span>`;
    }
    
    if (!results || results.length === 0) {
        if (!meta || meta.changes === undefined) {
            resultsContainer.innerHTML = '<div class="empty-state" style="padding: 20px;">אין תוצאות להצגה.</div>';
        }
        return;
    }
    
    const columns = Object.keys(results[0]);
    const pkCol = columns.find(c => c.toLowerCase() === 'id') || columns.find(c => c.toLowerCase() === 'phone');
    
    if (pkCol) {
        metaContainer.innerHTML += ` <span style="font-size:0.8rem; color:#64748b; margin-right:10px;"><i class="fa-solid fa-pen-to-square"></i> ניתן ללחוץ על התאים לעריכה ישירה (נשמר אוטומטית ביציאה מהתא).</span>`;
    }
    
    let tableHtml = '<table class="modern-table sql-table"><thead><tr>';
    columns.forEach(col => {
        tableHtml += `<th>${col}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';
    
    results.forEach(row => {
        tableHtml += '<tr>';
        columns.forEach(col => {
            let val = row[col];
            let isNull = false;
            
            if (val === null) {
                val = 'NULL';
                isNull = true;
            }
            
            if (pkCol && col !== pkCol) {
                const pkVal = row[pkCol];
                const safeVal = isNull ? '' : String(val).replace(/"/g, '&quot;');
                tableHtml += `<td dir="ltr" style="text-align:left;" class="editable-cell" 
                                contenteditable="true" 
                                title="לחץ לעריכה"
                                onfocus="this.dataset.original = this.innerText;" 
                                onblur="handleSqlCellEdit(this, '${col}', '${pkCol}', '${pkVal}')">
                                ${isNull ? `<span style="color:#94a3b8; font-style:italic;">${val}</span>` : safeVal}
                              </td>`;
            } else {
                tableHtml += `<td dir="ltr" style="text-align:left; background:#f8fafc;">
                                ${isNull ? `<span style="color:#94a3b8; font-style:italic;">${val}</span>` : val}
                              </td>`;
            }
        });
        tableHtml += '</tr>';
    });
    
    tableHtml += '</tbody></table>';
    resultsContainer.innerHTML = tableHtml;
}

window.handleSqlCellEdit = async function(cell, col, pkCol, pkVal) {
    const originalVal = cell.dataset.original;
    const newVal = cell.innerText.trim();
    
    if (newVal === originalVal.trim()) return;

    if (!window.currentSqlTable) {
        showToast('לא ניתן לשמור: יש להריץ שאילתת חילוץ רגילה', 'error');
        cell.innerText = originalVal;
        return;
    }

    const safeVal = newVal.replace(/'/g, "''"); 
    const query = `UPDATE ${window.currentSqlTable} SET ${col} = '${safeVal}' WHERE ${pkCol} = '${pkVal}'`;

    try {
        const res = await fetch(`${API_BASE_URL}/admin/sql/execute`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken: state.adminToken, query: query })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            showToast('הנתון עודכן בהצלחה במסד הנתונים', 'success');
            cell.dataset.original = newVal;
            const oldBg = cell.style.backgroundColor;
            cell.style.backgroundColor = '#dcfce7';
            setTimeout(() => { cell.style.backgroundColor = oldBg; }, 1200);
            
        } else {
            showToast(data.error || 'שגיאה בעדכון הנתון', 'error');
            cell.innerText = originalVal;
        }
    } catch(e) {
        showToast('שגיאת תקשורת מול השרת', 'error');
        cell.innerText = originalVal;
    }
};

const originalSwitchAdminTab = window.switchAdminTab;
window.switchAdminTab = function(tabName) {
    if(originalSwitchAdminTab) originalSwitchAdminTab(tabName);
    if (tabName === 'sql') {
        loadSqlTables();
    }
};
