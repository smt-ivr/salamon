// client-admin-advanced.js

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
            tableSelect.innerHTML = '<option value="">-- בחר טבלה לצפייה מהירה --</option>';
            data.tables.forEach(tableName => {
                const opt = document.createElement('option');
                opt.value = tableName;
                opt.textContent = tableName;
                tableSelect.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Error loading tables", err);
    }
};

window.executeQuickTableQuery = function() {
    const tableName = document.getElementById('sql_table_select').value;
    if (!tableName) return;
    
    const queryInput = document.getElementById('sql_query_input');
    queryInput.value = `SELECT * FROM ${tableName} LIMIT 100`;
    executeSqlQuery();
};

window.executeSqlQuery = async function(e) {
    if (e) e.preventDefault();
    
    const queryInput = document.getElementById('sql_query_input').value.trim();
    if (!queryInput) return;
    
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
    
    let tableHtml = '<table class="modern-table sql-table"><thead><tr>';
    columns.forEach(col => {
        tableHtml += `<th>${col}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';
    
    results.forEach(row => {
        tableHtml += '<tr>';
        columns.forEach(col => {
            let val = row[col];
            if (val === null) val = '<span style="color:#94a3b8; font-style:italic;">NULL</span>';
            tableHtml += `<td dir="ltr" style="text-align:left;">${val}</td>`;
        });
        tableHtml += '</tr>';
    });
    
    tableHtml += '</tbody></table>';
    resultsContainer.innerHTML = tableHtml;
}

// Hook into tab switching to load tables when SQL tab is opened
const originalSwitchAdminTab = window.switchAdminTab;
window.switchAdminTab = function(tabName) {
    if(originalSwitchAdminTab) originalSwitchAdminTab(tabName);
    if (tabName === 'sql') {
        loadSqlTables();
    }
};
