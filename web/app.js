(function(){
  const $ = (sel, el=document) => el.querySelector(sel)
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel))

  const state = {
    patients: [],
    invoices: [],
    analysisFilters: {},
    patientSearch: '',
    patientSort: 'name',
    patientSortOrder: 'asc'
  }

  function setActiveNav(hash){
    $$('.nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === hash))
  }

  async function loadDataFor(view){
    if (view === 'patients'){
      state.patients = await API.listPatients()
    } else if (view === 'billing' || view === 'analysis'){
      [state.patients, state.invoices] = await Promise.all([
        API.listPatients(), API.listInvoices()
      ])
    }
  }

  function fmtCurrency(n){
    const v = Number(n || 0)
    return `₹ ${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  }

  function today(){ return new Date().toISOString().slice(0,10) }

  // ---------- Patients View ----------
  function renderPatients(){
    const el = $('#view')
    
    // Apply search and sort filters
    let filteredPatients = [...state.patients]
    
    // Search filter
    const searchTerm = state.patientSearch || ''
    if (searchTerm) {
      filteredPatients = filteredPatients.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.phone && p.phone.includes(searchTerm)) ||
        (p.blood_group && p.blood_group.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    
    // Sort filter
    const sortBy = state.patientSort || 'name'
    const sortOrder = state.patientSortOrder || 'asc'
    
    filteredPatients.sort((a, b) => {
      let aVal = a[sortBy] || ''
      let bVal = b[sortBy] || ''
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }
      
      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1
      }
      return aVal > bVal ? 1 : -1
    })

    el.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>Patients</div>
        </div>
        <div class="card-body">
          <!-- Search and Sort Controls -->
          <div style="display: flex; gap: 16px; margin-bottom: 16px; align-items: center; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px;">
              <input type="text" id="patient-search" placeholder="Search patients..." 
                     value="${searchTerm}" style="width: 100%;">
            </div>
            <div style="min-width: 150px;">
              <select id="patient-sort" style="width: 100%;">
                <option value="name" ${sortBy === 'name' ? 'selected' : ''}>Sort by Name</option>
                <option value="email" ${sortBy === 'email' ? 'selected' : ''}>Sort by Email</option>
                <option value="phone" ${sortBy === 'phone' ? 'selected' : ''}>Sort by Phone</option>
                <option value="blood_group" ${sortBy === 'blood_group' ? 'selected' : ''}>Sort by Blood Group</option>
              </select>
            </div>
            <div style="min-width: 100px;">
              <select id="patient-sort-order" style="width: 100%;">
                <option value="asc" ${sortOrder === 'asc' ? 'selected' : ''}>A-Z</option>
                <option value="desc" ${sortOrder === 'desc' ? 'selected' : ''}>Z-A</option>
              </select>
            </div>
            <button class="btn" onclick="clearPatientFilters()">Clear</button>
          </div>
          
          <!-- Results Summary -->
          <div style="margin-bottom: 16px; color: #666; font-size: 14px;">
            Showing ${filteredPatients.length} of ${state.patients.length} patients
            ${searchTerm ? `for "${searchTerm}"` : ''}
          </div>

          <form id="patient-form" class="grid grid-3">
            <div>
              <label>Name *</label>
              <input name="name" required placeholder="Full name"/>
            </div>
            <div>
              <label>Email</label>
              <input name="email" type="email" placeholder="name@example.com"/>
            </div>
            <div>
              <label>Phone</label>
              <input name="phone" placeholder="+91 99999 99999"/>
            </div>
            <div>
              <label>Date of Birth</label>
              <input name="date_of_birth" type="date"/>
            </div>
            <div>
              <label>Gender</label>
              <select name="gender">
                <option value="">Select</option>
                <option>male</option>
                <option>female</option>
                <option>other</option>
              </select>
            </div>
            <div>
              <label>Blood Group</label>
              <select name="blood_group">
                <option value="">Select</option>
                <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
              </select>
            </div>
            <div class="grid-2">
              <div>
                <label>Address</label>
                <textarea name="address" placeholder="Street, City, ZIP"></textarea>
              </div>
              <div>
                <label>Allergies</label>
                <textarea name="allergies" placeholder="e.g., Penicillin"></textarea>
              </div>
            </div>
            <div class="grid-2">
              <div>
                <label>Medical History</label>
                <textarea name="medical_history" placeholder="Chronic conditions, surgeries..."></textarea>
              </div>
              <div>
                <label>Medical Images</label>
                <div class="image-upload-area" id="image-upload" 
                     ondrop="handleDrop(event)" 
                     ondragover="handleDragOver(event)"
                     ondragleave="handleDragLeave(event)"
                     onclick="document.getElementById('file-input').click()">
                  <input type="file" id="file-input" multiple accept="image/*,.pdf,.doc,.docx" style="display: none;" onchange="handleFileSelect(event)">
                  <div class="upload-text">
                    📁 Drag & drop images/documents here<br>
                    <small>or click to browse (JPG, PNG, PDF, DOC)</small>
                  </div>
                  <div id="file-preview"></div>
                </div>
              </div>
            </div>
            <div>
              <label>Emergency Contact</label>
              <input name="emergency_contact" placeholder="Name & number"/>
            </div>
            <div>
              <label>Notes</label>
              <textarea name="notes" placeholder="Additional notes"></textarea>
            </div>
            <div class="row end">
              <button class="btn" type="reset">Reset</button>
              <button class="btn primary" type="submit">Save Patient</button>
            </div>
          </form>
        </div>
      </div>

      <div class="spacer"></div>

      <div class="card">
        <div class="card-header">
          <div>Patients <span class="muted">(${state.patients.length})</span></div>
        </div>
        <div class="card-body">
          ${state.patients.length === 0 ? `<div class="empty">No patients yet.</div>` : `
            <div class="table-wrap">
              <table>
                <thead><tr>
                  <th>Name</th><th>Email</th><th>Phone</th><th>Blood</th><th>Allergies</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  ${filteredPatients.map(p => `
                    <tr>
                      <td><a href="#" onclick="viewPatientDetails('${p.id}')" style="color: var(--primary); text-decoration: underline; cursor: pointer;">${p.name}</a></td>
                      <td>${p.email || '—'}</td>
                      <td>${p.phone || '—'}</td>
                      <td>${p.blood_group || '—'}</td>
                      <td>${p.allergies || '—'}</td>
                      <td>
                        <button class="btn btn-sm" onclick="editPatient('${p.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deletePatient('${p.id}')">Delete</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `

    // Add event listeners for search and sort
    setTimeout(() => {
      const searchInput = $('#patient-search')
      const sortSelect = $('#patient-sort')
      const sortOrderSelect = $('#patient-sort-order')
      
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          state.patientSearch = e.target.value
          renderPatients()
        })
      }
      
      if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
          state.patientSort = e.target.value
          renderPatients()
        })
      }
      
      if (sortOrderSelect) {
        sortOrderSelect.addEventListener('change', (e) => {
          state.patientSortOrder = e.target.value
          renderPatients()
        })
      }
    }, 100)

    $('#patient-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      const payload = Object.fromEntries(fd.entries())
      if (payload.date_of_birth === '') delete payload.date_of_birth
      
      // Handle uploaded files (store as base64 for now)
      if (uploadedFiles.length > 0) {
        const fileData = []
        for (const file of uploadedFiles) {
          const base64 = await fileToBase64(file)
          fileData.push({
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64
          })
        }
        payload.medical_images = JSON.stringify(fileData)
      }
      
      try{
        const btn = $('#patient-form button[type="submit"]')
        btn.disabled = true
        await API.createPatient(payload)
        const form = $('#patient-form')
        if (form && form.reset) form.reset()
        // Clear uploaded files
        uploadedFiles = []
        $('#file-preview').innerHTML = ''
        state.patients = await API.listPatients()
        renderPatients()
      } catch(err){ 
        alert(err.message) 
      } finally {
        const btn = $('#patient-form button[type="submit"]')
        if (btn) btn.disabled = false
      }
    })
  }

  // ---------- Medicines View ----------
  function renderMedicines(){
    const el = $('#view')
    el.innerHTML = `
      <div class="card">
        <div class="card-header"><div>Add Medicine</div></div>
        <div class="card-body">
          <form id="med-form" class="grid grid-3">
            <div>
              <label>Name *</label>
              <input name="name" required placeholder="Paracetamol"/>
            </div>
            <div>
              <label>Generic Name</label>
              <input name="generic_name" placeholder="Acetaminophen"/>
            </div>
            <div>
              <label>Dosage Form</label>
              <select name="dosage_form">
                <option value="">Select</option>
                <option>Tablet</option><option>Capsule</option><option>Syrup</option>
                <option>Injection</option><option>Ointment</option><option>Drops</option>
              </select>
            </div>
            <div>
              <label>Strength</label>
              <input name="strength" placeholder="500mg"/>
            </div>
            <div>
              <label>Manufacturer</label>
              <input name="manufacturer" placeholder="ACME Labs"/>
            </div>
            <div>
              <label>Price (₹)</label>
              <input name="price" type="number" step="0.01" min="0" value="0"/>
            </div>
            <div>
              <label>Stock Quantity</label>
              <input name="stock_quantity" type="number" min="0" value="0"/>
            </div>
            <div class="row end">
              <button class="btn" type="reset">Reset</button>
              <button class="btn primary" type="submit">Add Medicine</button>
            </div>
          </form>
        </div>
      </div>

      <div class="spacer"></div>

      <div class="card">
        <div class="card-header">
          <div>Inventory <span class="muted">(${state.medicines.length})</span></div>
        </div>
        <div class="card-body">
          ${state.medicines.length === 0 ? `<div class="empty">No medicines yet.</div>` : `
            <div class="table-wrap">
              <table>
                <thead><tr>
                  <th>Name</th><th>Form</th><th>Strength</th><th>Manufacturer</th><th>Stock</th><th>Price</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  ${state.medicines.map(m => `
                    <tr>
                      <td>${m.name}</td>
                      <td>${m.dosage_form || '—'}</td>
                      <td>${m.strength || '—'}</td>
                      <td>${m.manufacturer || '—'}</td>
                      <td>${m.stock_quantity ?? 0}</td>
                      <td>${fmtCurrency(m.price)}</td>
                      <td>
                        <button class="btn btn-sm" onclick="editMedicine('${m.id}')">Edit</button>
                        <button class="btn btn-sm" onclick="updateStock('${m.id}', ${m.stock_quantity || 0})">Update Stock</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteMedicine('${m.id}')">Delete</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `

    $('#med-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      const payload = Object.fromEntries(fd.entries())
      payload.price = payload.price || "0"
      payload.stock_quantity = parseInt(payload.stock_quantity || '0', 10) || 0
      try{
        const btn = $('#med-form button[type="submit"]')
        btn.disabled = true
        await API.createMedicine(payload)
        const form = $('#med-form')
        if (form && form.reset) form.reset()
        state.medicines = await API.listMedicines()
        renderMedicines()
      } catch(err){ 
        alert(err.message) 
      } finally {
        const btn = $('#med-form button[type="submit"]')
        if (btn) btn.disabled = false
      }
    })
  }

  // ---------- Billing View ----------
  function renderBilling(){
    const el = $('#view')
    const patientOpts = state.patients.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')

    console.log('Rendering billing page with', state.patients.length, 'patients')

    // Clear any existing content to avoid duplicate IDs
    el.innerHTML = ''

    el.innerHTML = `
      <div class="card">
        <div class="card-header"><div>Create Invoice</div></div>
        <div class="card-body">
          <form id="bill-form">
            <div class="grid grid-3" style="margin-bottom:16px">
              <div>
                <label>Patient *</label>
                <select id="bill-patient" required>
                  <option value="">Select Patient</option>
                  ${patientOpts}
                </select>
                ${state.patients.length === 0 ? '<small style="color: red;">No patients found. Add a patient first.</small>' : ''}
              </div>
              <div>
                <label>Issue Date</label>
                <input name="issue_date" type="date" value="${today()}"/>
              </div>
              <div style="display: flex; align-items: end;">
                <button type="button" class="btn" onclick="showAddPatientForm()">+ Add New Patient</button>
              </div>
            </div>

            <!-- Hidden Add Patient Form -->
            <div id="add-patient-section" style="display: none; margin-bottom: 16px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f8f9fa;">
              <h4>Add New Patient</h4>
              <div class="grid grid-3" style="gap: 12px;">
                <div>
                  <label>Name *</label>
                  <input id="new-patient-name" placeholder="Full name"/>
                </div>
                <div>
                  <label>Email</label>
                  <input id="new-patient-email" type="email" placeholder="name@example.com"/>
                </div>
                <div>
                  <label>Phone</label>
                  <input id="new-patient-phone" placeholder="+91 99999 99999"/>
                </div>
                <div>
                  <label>Date of Birth</label>
                  <input id="new-patient-dob" type="date"/>
                </div>
                <div>
                  <label>Gender</label>
                  <select id="new-patient-gender">
                    <option value="">Select</option>
                    <option>male</option>
                    <option>female</option>
                    <option>other</option>
                  </select>
                </div>
                <div>
                  <label>Blood Group</label>
                  <select id="new-patient-blood">
                    <option value="">Select</option>
                    <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                    <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                  </select>
                </div>
                <div style="grid-column: 1 / -1;">
                  <label>Address</label>
                  <textarea id="new-patient-address" placeholder="Street, City, ZIP" style="min-height: 60px;"></textarea>
                </div>
                <div>
                  <label>Allergies</label>
                  <textarea id="new-patient-allergies" placeholder="e.g., Penicillin" style="min-height: 60px;"></textarea>
                </div>
                <div>
                  <label>Medical History</label>
                  <textarea id="new-patient-history" placeholder="Chronic conditions, surgeries..." style="min-height: 60px;"></textarea>
                </div>
                <div>
                  <label>Emergency Contact</label>
                  <input id="new-patient-emergency" placeholder="Name & number"/>
                </div>
                <div style="grid-column: 1 / -1;">
                  <label>Notes</label>
                  <textarea id="new-patient-notes" placeholder="Additional notes" style="min-height: 60px;"></textarea>
                </div>
              </div>
              <div style="margin-top: 12px; display: flex; gap: 8px;">
                <button type="button" class="btn primary" onclick="createNewPatient()">Save Patient</button>
                <button type="button" class="btn" onclick="hideAddPatientForm()">Cancel</button>
              </div>
            </div>

            <div style="margin-bottom:16px">
              <label>Items</label>
              <div id="items"></div>
              <button type="button" class="btn" onclick="addItemRow()">+ Add Item</button>
            </div>

            <div class="grid grid-3" style="margin-bottom:16px">
              <div>
                <label>Tax (₹)</label>
                <input name="tax" type="number" step="0.01" min="0" value="0" onchange="recalc()"/>
              </div>
              <div>
                <label>Discount (₹)</label>
                <input name="discount" type="number" step="0.01" min="0" value="0" onchange="recalc()"/>
              </div>
              <div>
                <label>Total</label>
                <input id="bill-total" readonly style="font-weight:bold"/>
              </div>
            </div>

            <div class="row end">
              <button class="btn" type="reset">Reset</button>
              <button class="btn primary" type="submit">Create Invoice</button>
            </div>
          </form>
        </div>
      </div>
    `

    function addItemRow(){
      const div = document.createElement('div')
      div.className = 'item-row'
      div.innerHTML = `
        <input name="medicine_name" type="text" placeholder="Medicine name" style="flex: 2;">
        <input name="qty" type="number" min="1" value="1" placeholder="Qty" onchange="recalc()" style="width: 80px;">
        <input name="rate" type="number" step="0.01" min="0" placeholder="Rate" onchange="recalc()" style="width: 100px;">
        <input name="amount" readonly placeholder="Amount" style="width: 100px;">
        <button type="button" onclick="this.parentElement.remove(); recalc()" style="width: 60px;">×</button>
      `
      $('#items').appendChild(div)
    }

    function recalc(){
      let subtotal = 0
      $$('#items .item-row').forEach(row => {
        const qty = parseFloat($('input[name="qty"]', row).value || '0')
        const rate = parseFloat($('input[name="rate"]', row).value || '0')
        const amount = qty * rate
        $('input[name="amount"]', row).value = amount.toFixed(2)
        subtotal += amount
      })
      const tax = parseFloat($('input[name="tax"]').value || '0')
      const discount = parseFloat($('input[name="discount"]').value || '0')
      const total = Math.max(0, subtotal + tax - discount)
      $('#bill-total').value = fmtCurrency(total)
    }

    window.addItemRow = addItemRow
    window.recalc = recalc
    window.showAddPatientForm = showAddPatientForm
    window.hideAddPatientForm = hideAddPatientForm
    window.createNewPatient = createNewPatient

    function showAddPatientForm() {
      const section = $('#add-patient-section')
      if (section) {
        section.style.display = 'block'
      }
    }

    function hideAddPatientForm() {
      const section = $('#add-patient-section')
      if (section) {
        section.style.display = 'none'
        // Clear all form fields
        const nameField = $('#new-patient-name')
        const emailField = $('#new-patient-email')
        const phoneField = $('#new-patient-phone')
        const dobField = $('#new-patient-dob')
        const genderField = $('#new-patient-gender')
        const bloodField = $('#new-patient-blood')
        const addressField = $('#new-patient-address')
        const allergiesField = $('#new-patient-allergies')
        const historyField = $('#new-patient-history')
        const emergencyField = $('#new-patient-emergency')
        const notesField = $('#new-patient-notes')
        
        if (nameField) nameField.value = ''
        if (emailField) emailField.value = ''
        if (phoneField) phoneField.value = ''
        if (dobField) dobField.value = ''
        if (genderField) genderField.value = ''
        if (bloodField) bloodField.value = ''
        if (addressField) addressField.value = ''
        if (allergiesField) allergiesField.value = ''
        if (historyField) historyField.value = ''
        if (emergencyField) emergencyField.value = ''
        if (notesField) notesField.value = ''
      }
    }

    async function createNewPatient() {
      const nameField = $('#new-patient-name')
      if (!nameField) {
        alert('Patient form not found')
        return
      }
      
      const name = nameField.value.trim()
      if (!name) {
        alert('Patient name is required')
        return
      }

      const payload = {
        name: name,
        email: $('#new-patient-email')?.value.trim() || undefined,
        phone: $('#new-patient-phone')?.value.trim() || undefined,
        date_of_birth: $('#new-patient-dob')?.value || undefined,
        gender: $('#new-patient-gender')?.value || undefined,
        blood_group: $('#new-patient-blood')?.value || undefined,
        address: $('#new-patient-address')?.value.trim() || undefined,
        allergies: $('#new-patient-allergies')?.value.trim() || undefined,
        medical_history: $('#new-patient-history')?.value.trim() || undefined,
        emergency_contact: $('#new-patient-emergency')?.value.trim() || undefined,
        notes: $('#new-patient-notes')?.value.trim() || undefined
      }

      // Handle uploaded files for billing page patient creation
      if (uploadedFiles.length > 0) {
        const fileData = []
        for (const file of uploadedFiles) {
          const base64 = await fileToBase64(file)
          fileData.push({
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64
          })
        }
        payload.medical_images = JSON.stringify(fileData)
      }

      try {
        const newPatient = await API.createPatient(payload)
        
        // Update local state
        state.patients.push(newPatient)
        
        // Refresh patient dropdown
        const patientSelect = $('#bill-patient')
        const newOption = document.createElement('option')
        newOption.value = newPatient.id
        newOption.textContent = newPatient.name
        newOption.selected = true
        patientSelect.appendChild(newOption)
        
        // Hide form and clear inputs
        hideAddPatientForm()
        
        alert('Patient added successfully!')
      } catch(err) {
        alert('Error creating patient: ' + err.message)
      }
    }

    addItemRow()
    recalc()

    $('#bill-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      const issue_date = fd.get('issue_date') || today()
      const tax = parseFloat(fd.get('tax') || '0')
      const discount = parseFloat(fd.get('discount') || '0')

      const items = []
      
      $$('#items .item-row').forEach(row => {
        const medicineName = $('input[name="medicine_name"]', row).value.trim()
        const qty = parseInt($('input[name="qty"]', row).value || '0')
        const rate = parseFloat($('input[name="rate"]', row).value || '0')
        
        if (medicineName && qty > 0 && rate > 0){ 
          items.push({ 
            description: medicineName, 
            qty: qty, 
            rate: rate 
          })
        }
      })
      
      const patientId = $('#bill-patient').value
      if (!patientId) {
        alert('Please select a patient first')
        return
      }

      if (items.length === 0){ 
        alert('Add at least one item with medicine name, quantity and rate'); 
        return 
      }

      // Calculate due_date as 30 days from issue_date
      const issueDateObj = new Date(issue_date)
      const dueDateObj = new Date(issueDateObj)
      dueDateObj.setDate(dueDateObj.getDate() + 30)
      const due_date = dueDateObj.toISOString().slice(0, 10)

      const payload = {
        patient_id: patientId,
        issue_date: issue_date,
        due_date: due_date,
        tax: tax, 
        discount: discount,
        items: items,
      }
      try{
        const btn = $('#bill-form button[type="submit"]')
        btn.disabled = true
        
        console.log('Creating invoice with payload:', payload)
        const newInvoice = await API.createInvoice(payload)
        console.log('Invoice created successfully:', newInvoice)
        
        // Refresh invoice list
        state.invoices = await API.listInvoices()
        console.log('Updated invoices list:', state.invoices.length, 'invoices')
        
        // Reset form
        const form = $('#bill-form')
        if (form && form.reset) form.reset()
        $('#items').innerHTML = ''
        addItemRow()
        recalc()
        
        alert('Invoice created successfully!')
        
      } catch(err){ 
        console.error('Invoice creation failed:', err)
        alert('Error creating invoice: ' + (err.message || 'Unknown error'))
      } finally {
        const btn = $('#bill-form button[type="submit"]')
        if (btn) btn.disabled = false
      }
    })
  }

  // ---------- Analysis View ----------
  function renderAnalysis(){
    const el = $('#view')

    const invoices = state.invoices
    let rows = []
    for (const inv of invoices){
      for (const it of (inv.items || [])){
        const isIssue = typeof it.description === 'string' && it.description.startsWith('Issue:')
        if (isIssue) continue
        rows.push({
          patient: inv.patient_name || '—',
          medicine: it.description,
          qty: it.qty,
          total: parseFloat(inv.total) || 0,
          date: inv.issue_date,
          issue: (inv.items||[]).find(x => typeof x.description === 'string' && x.description.startsWith('Issue:'))?.description?.slice(7) || '',
        })
      }
    }

    const filters = state.analysisFilters || {}
    let filteredRows = [...rows]

    if (filters.patientSearch) {
      filteredRows = filteredRows.filter(r => 
        r.patient.toLowerCase().includes(filters.patientSearch.toLowerCase())
      )
    }
    if (filters.medicineSearch) {
      filteredRows = filteredRows.filter(r => 
        r.medicine.toLowerCase().includes(filters.medicineSearch.toLowerCase())
      )
    }
    if (filters.issueSearch) {
      filteredRows = filteredRows.filter(r => 
        r.issue.toLowerCase().includes(filters.issueSearch.toLowerCase())
      )
    }
    if (filters.dateFilter) {
      filteredRows = filteredRows.filter(r => r.date === filters.dateFilter)
    }

    if (filters.sortBy) {
      filteredRows.sort((a, b) => {
        let aVal = a[filters.sortBy]
        let bVal = b[filters.sortBy]
        
        if (filters.sortBy === 'total') {
          aVal = parseFloat(aVal) || 0
          bVal = parseFloat(bVal) || 0
        } else {
          aVal = String(aVal).toLowerCase()
          bVal = String(bVal).toLowerCase()
        }
        
        if (filters.sortOrder === 'desc') {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
        } else {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
        }
      })
    }

    const selectedTotal = filteredRows.reduce((sum, r) => sum + r.total, 0)
    const selectedCount = filteredRows.length

    // Preserve current tab state
    const currentTab = state.analysisTab || 'full'

    el.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>Analysis</div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-sm" onclick="downloadAnalysisExcel()">📊 Download Analysis Excel</button>
          </div>
        </div>
        <div class="card-body">
          <div class="tabs" id="an-tabs">
            <button data-tab="full" class="${currentTab === 'full' ? 'active' : ''}">All Info</button>
          </div>
          <div id="an-full" class="an-tab" style="padding-top:10px; display: ${currentTab === 'full' ? 'block' : 'none'}">
            <div class="analysis-controls" style="margin-bottom: 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
              <div>
                <label>Search Patient:</label>
                <input type="text" id="patient-search" placeholder="Patient name..." value="${filters.patientSearch || ''}">
              </div>
              <div>
                <label>Search Medicine:</label>
                <input type="text" id="medicine-search" placeholder="Medicine name..." value="${filters.medicineSearch || ''}">
              </div>
              <div>
                <label>Search Issue:</label>
                <input type="text" id="issue-search" placeholder="Issue..." value="${filters.issueSearch || ''}">
              </div>
              <div>
                <label>Filter by Date:</label>
                <input type="date" id="date-filter" value="${filters.dateFilter || ''}">
              </div>
            </div>
            
            <div class="sort-controls" style="margin-bottom: 16px; display: flex; gap: 12px; align-items: end;">
              <div>
                <label>Sort by:</label>
                <select id="sort-by">
                  <option value="">No sorting</option>
                  <option value="patient" ${filters.sortBy === 'patient' ? 'selected' : ''}>Patient Name</option>
                  <option value="medicine" ${filters.sortBy === 'medicine' ? 'selected' : ''}>Medicine</option>
                  <option value="date" ${filters.sortBy === 'date' ? 'selected' : ''}>Bill Date</option>
                  <option value="total" ${filters.sortBy === 'total' ? 'selected' : ''}>Bill Amount</option>
                </select>
              </div>
              <div>
                <label>Order:</label>
                <select id="sort-order">
                  <option value="asc" ${filters.sortOrder === 'asc' ? 'selected' : ''}>Low to High / A-Z</option>
                  <option value="desc" ${filters.sortOrder === 'desc' ? 'selected' : ''}>High to Low / Z-A</option>
                </select>
              </div>
              <button class="btn" onclick="clearFilters()">Clear All</button>
            </div>

            <div class="summary" style="margin-bottom: 16px; padding: 12px; background: #f8f9fa; border-radius: 8px;">
              <strong>Summary:</strong> ${selectedCount} records found | Total Amount: ${fmtCurrency(selectedTotal)}
              <div id="selection-summary" style="margin-top: 8px; padding: 8px; background: #e3f2fd; border-radius: 4px; display: none;">
                <strong>Selected:</strong> <span id="selected-count">0</span> records | <strong>Selected Total:</strong> <span id="selected-total">₹0</span>
              </div>
            </div>

            ${filteredRows.length === 0 ? `<div class="empty">No data matches your filters.</div>` : `
              <div class="table-wrap">
                <table>
                  <thead><tr>
                    <th><input type="checkbox" id="select-all"> Select</th>
                    <th>Patient</th><th>Medicine</th><th>Qty</th><th>Bill Total</th><th>Bill Date</th><th>Issue</th>
                  </tr></thead>
                  <tbody>
                    ${filteredRows.map((r, index) => `
                      <tr class="data-row" data-patient="${r.patient}" data-total="${r.total}">
                        <td><input type="checkbox" class="row-select" data-index="${index}"></td>
                        <td>${r.patient}</td>
                        <td>${r.medicine}</td>
                        <td>${r.qty}</td>
                        <td>${fmtCurrency(r.total)}</td>
                        <td>${r.date}</td>
                        <td>${r.issue || '—'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>
      </div>
    `

    const tabs = $('#an-tabs')
    tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('button')
      if (!btn) return
      const t = btn.dataset.tab
      
      // Save current tab state
      state.analysisTab = t
      
      $$('#an-tabs button').forEach(b => b.classList.toggle('active', b===btn))
      $('#an-med').style.display = t==='med' ? 'block' : 'none'
      $('#an-full').style.display = t==='full' ? 'block' : 'none'
    })

    const patientSearch = $('#patient-search')
    const medicineSearch = $('#medicine-search')
    const issueSearch = $('#issue-search')
    const dateFilter = $('#date-filter')
    const sortBy = $('#sort-by')
    const sortOrder = $('#sort-order')

    function updateFilters() {
      state.analysisFilters = {
        patientSearch: patientSearch?.value || '',
        medicineSearch: medicineSearch?.value || '',
        issueSearch: issueSearch?.value || '',
        dateFilter: dateFilter?.value || '',
        sortBy: sortBy?.value || '',
        sortOrder: sortOrder?.value || 'asc'
      }
      renderAnalysis()
    }

    if (patientSearch) patientSearch.addEventListener('input', updateFilters)
    if (medicineSearch) medicineSearch.addEventListener('input', updateFilters)
    if (issueSearch) issueSearch.addEventListener('input', updateFilters)
    if (dateFilter) dateFilter.addEventListener('change', updateFilters)
    if (sortBy) sortBy.addEventListener('change', updateFilters)
    if (sortOrder) sortOrder.addEventListener('change', updateFilters)

    // Initialize selection functionality
    setTimeout(() => {
      const selectAllCheckbox = $('#select-all')
      if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', toggleSelectAll)
      }
      
      const rowCheckboxes = $$('.row-select')
      rowCheckboxes.forEach(cb => {
        cb.addEventListener('change', updateSelection)
      })
    }, 100)
  }

  // Selection functions for analysis
  function toggleSelectAll() {
    const selectAll = $('#select-all')
    const checkboxes = $$('.row-select')
    
    checkboxes.forEach(cb => {
      cb.checked = selectAll.checked
    })
    
    updateSelection()
  }

  function updateSelection() {
    const checkboxes = $$('.row-select')
    const rows = $$('.data-row')
    let selectedCount = 0
    let selectedTotal = 0
    const selectedPatients = new Set()

    // Reset all row highlighting
    rows.forEach(row => {
      row.style.backgroundColor = ''
    })

    checkboxes.forEach((cb, index) => {
      if (cb.checked) {
        selectedCount++
        const row = rows[index]
        if (row) {
          const total = parseFloat(row.dataset.total) || 0
          const patient = row.dataset.patient
          selectedTotal += total
          selectedPatients.add(patient)
          
          // Highlight selected rows
          row.style.backgroundColor = '#e3f2fd'
        }
      }
    })

    // Update selection summary
    const summaryDiv = $('#selection-summary')
    const selectedCountSpan = $('#selected-count')
    const selectedTotalSpan = $('#selected-total')
    
    if (selectedCount > 0) {
      summaryDiv.style.display = 'block'
      selectedCountSpan.textContent = selectedCount
      selectedTotalSpan.textContent = fmtCurrency(selectedTotal)
    } else {
      summaryDiv.style.display = 'none'
    }

    // Update select all checkbox state
    const selectAll = $('#select-all')
    if (selectAll) {
      selectAll.checked = selectedCount > 0 && selectedCount === checkboxes.length
      selectAll.indeterminate = selectedCount > 0 && selectedCount < checkboxes.length
    }
  }

  // ---------- Edit/Delete Functions ----------
  async function deletePatient(id) {
    if (!confirm('Delete this patient? This cannot be undone.')) return
    try {
      await API.deletePatient(id)
      state.patients = await API.listPatients()
      renderPatients()
    } catch(err) {
      alert(err.message)
    }
  }

  async function deleteMedicine(id) {
    if (!confirm('Delete this medicine? This cannot be undone.')) return
    try {
      await API.deleteMedicine(id)
      state.medicines = await API.listMedicines()
      renderMedicines()
    } catch(err) {
      alert(err.message)
    }
  }

  async function editPatient(id) {
    const patient = state.patients.find(p => p.id === id)
    if (!patient) return

    // Parse existing medical images
    let existingImages = []
    if (patient.medical_images) {
      try {
        existingImages = JSON.parse(patient.medical_images)
      } catch (e) {
        console.error('Error parsing medical images:', e)
      }
    }

    // Create a modal-like form
    const formHtml = `
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;" id="edit-modal">
        <div style="background: white; padding: 24px; border-radius: 12px; width: 90%; max-width: 800px; max-height: 90%; overflow-y: auto;">
          <h3>Edit Patient: ${patient.name}</h3>
          <form id="edit-patient-form" class="grid grid-2" style="gap: 16px;">
            <div>
              <label>Name *</label>
              <input name="name" required value="${patient.name || ''}">
            </div>
            <div>
              <label>Email</label>
              <input name="email" type="email" value="${patient.email || ''}">
            </div>
            <div>
              <label>Phone</label>
              <input name="phone" value="${patient.phone || ''}">
            </div>
            <div>
              <label>Blood Group</label>
              <select name="blood_group">
                <option value="">Select</option>
                <option ${patient.blood_group === 'A+' ? 'selected' : ''}>A+</option>
                <option ${patient.blood_group === 'A-' ? 'selected' : ''}>A-</option>
                <option ${patient.blood_group === 'B+' ? 'selected' : ''}>B+</option>
                <option ${patient.blood_group === 'B-' ? 'selected' : ''}>B-</option>
                <option ${patient.blood_group === 'AB+' ? 'selected' : ''}>AB+</option>
                <option ${patient.blood_group === 'AB-' ? 'selected' : ''}>AB-</option>
                <option ${patient.blood_group === 'O+' ? 'selected' : ''}>O+</option>
                <option ${patient.blood_group === 'O-' ? 'selected' : ''}>O-</option>
              </select>
            </div>
            <div style="grid-column: 1 / -1;">
              <label>Address</label>
              <textarea name="address">${patient.address || ''}</textarea>
            </div>
            <div style="grid-column: 1 / -1;">
              <label>Allergies</label>
              <textarea name="allergies">${patient.allergies || ''}</textarea>
            </div>
            <div style="grid-column: 1 / -1;">
              <label>Medical History</label>
              <textarea name="medical_history">${patient.medical_history || ''}</textarea>
            </div>
            <div style="grid-column: 1 / -1;">
              <label>Emergency Contact</label>
              <input name="emergency_contact" value="${patient.emergency_contact || ''}">
            </div>
            <div style="grid-column: 1 / -1;">
              <label>Notes</label>
              <textarea name="notes">${patient.notes || ''}</textarea>
            </div>
            
            <!-- Existing Images Section -->
            <div style="grid-column: 1 / -1;">
              <label>Current Medical Images</label>
              <div id="existing-images" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px;">
                ${existingImages.map((img, index) => `
                  <div class="existing-image-item" data-index="${index}" style="border: 1px solid #ddd; border-radius: 8px; padding: 8px; text-align: center; position: relative;">
                    ${img.type.startsWith('image/') ? `
                      <img src="${img.data}" alt="${img.name}" style="max-width: 100%; max-height: 100px; object-fit: cover; border-radius: 4px; margin-bottom: 4px;">
                    ` : `
                      <div style="padding: 30px; background: #f5f5f5; border-radius: 4px; margin-bottom: 4px;">
                        📄 ${img.type.includes('pdf') ? 'PDF' : 'DOC'}
                      </div>
                    `}
                    <p style="font-size: 10px; margin: 0; word-break: break-all;">${img.name}</p>
                    <button type="button" onclick="removeExistingImage(${index})" style="position: absolute; top: 4px; right: 4px; background: red; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 12px;">×</button>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <!-- Add New Images Section -->
            <div style="grid-column: 1 / -1;">
              <label>Add New Medical Images</label>
              <div class="image-upload-area" id="edit-image-upload" 
                   ondrop="handleDrop(event)" 
                   ondragover="handleDragOver(event)"
                   ondragleave="handleDragLeave(event)"
                   onclick="document.getElementById('edit-file-input').click()">
                <input type="file" id="edit-file-input" multiple accept="image/*,.pdf,.doc,.docx" style="display: none;" onchange="handleFileSelect(event)">
                <div class="upload-text">
                  📁 Drag & drop new images/documents here<br>
                  <small>or click to browse (JPG, PNG, PDF, DOC)</small>
                </div>
                <div id="edit-file-preview"></div>
              </div>
            </div>
            
            <div style="grid-column: 1 / -1; display: flex; gap: 12px; justify-content: flex-end;">
              <button type="button" class="btn" onclick="document.getElementById('edit-modal').remove()">Cancel</button>
              <button type="submit" class="btn primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    `
    
    document.body.insertAdjacentHTML('beforeend', formHtml)
    
    // Store existing images for manipulation
    window.editingPatientImages = [...existingImages]
    
    $('#edit-patient-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      const updates = Object.fromEntries(fd.entries())
      
      // Combine existing images with new uploads
      const allImages = [...window.editingPatientImages, ...uploadedFiles]
      
      // Convert new files to base64 and combine with existing
      if (allImages.length > 0) {
        const imageData = []
        for (const item of allImages) {
          if (item.data) {
            // Existing image (already has data)
            imageData.push(item)
          } else {
            // New file (needs conversion)
            const base64 = await fileToBase64(item)
            imageData.push({
              name: item.name,
              type: item.type,
              size: item.size,
              data: base64
            })
          }
        }
        updates.medical_images = JSON.stringify(imageData)
      } else {
        updates.medical_images = null
      }
      
      try {
        await API.updatePatient(id, updates)
        state.patients = await API.listPatients()
        renderPatients()
        $('#edit-modal').remove()
        // Clear uploaded files
        uploadedFiles = []
        window.editingPatientImages = []
      } catch(err) {
        alert(err.message)
      }
    })
  }

  async function editMedicine(id) {
    const medicine = state.medicines.find(m => m.id === id)
    if (!medicine) return

    // Create a modal-like form
    const formHtml = `
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;" id="edit-modal">
        <div style="background: white; padding: 24px; border-radius: 12px; width: 90%; max-width: 600px; max-height: 80%; overflow-y: auto;">
          <h3>Edit Medicine: ${medicine.name}</h3>
          <form id="edit-medicine-form" class="grid grid-2" style="gap: 16px;">
            <div>
              <label>Name *</label>
              <input name="name" required value="${medicine.name || ''}">
            </div>
            <div>
              <label>Generic Name</label>
              <input name="generic_name" value="${medicine.generic_name || ''}">
            </div>
            <div>
              <label>Strength</label>
              <input name="strength" value="${medicine.strength || ''}">
            </div>
            <div>
              <label>Dosage Form</label>
              <select name="dosage_form">
                <option value="">Select</option>
                <option ${medicine.dosage_form === 'Tablet' ? 'selected' : ''}>Tablet</option>
                <option ${medicine.dosage_form === 'Capsule' ? 'selected' : ''}>Capsule</option>
                <option ${medicine.dosage_form === 'Syrup' ? 'selected' : ''}>Syrup</option>
                <option ${medicine.dosage_form === 'Injection' ? 'selected' : ''}>Injection</option>
                <option ${medicine.dosage_form === 'Ointment' ? 'selected' : ''}>Ointment</option>
                <option ${medicine.dosage_form === 'Drops' ? 'selected' : ''}>Drops</option>
              </select>
            </div>
            <div>
              <label>Manufacturer</label>
              <input name="manufacturer" value="${medicine.manufacturer || ''}">
            </div>
            <div>
              <label>Price (₹)</label>
              <input name="price" type="number" step="0.01" min="0" value="${medicine.price || '0'}">
            </div>
            <div>
              <label>Stock Quantity</label>
              <input name="stock_quantity" type="number" min="0" value="${medicine.stock_quantity || 0}">
            </div>
            <div style="grid-column: 1 / -1; display: flex; gap: 12px; justify-content: flex-end;">
              <button type="button" class="btn" onclick="document.getElementById('edit-modal').remove()">Cancel</button>
              <button type="submit" class="btn primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    `
    
    document.body.insertAdjacentHTML('beforeend', formHtml)
    
    $('#edit-medicine-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      const updates = Object.fromEntries(fd.entries())
      updates.stock_quantity = parseInt(updates.stock_quantity) || 0
      
      try {
        await API.updateMedicine(id, updates)
        state.medicines = await API.listMedicines()
        renderMedicines()
        $('#edit-modal').remove()
      } catch(err) {
        alert(err.message)
      }
    })
  }

  async function updateStock(id, currentStock) {
    const newStock = prompt(`Update stock for this medicine:\nCurrent: ${currentStock}`, currentStock)
    if (newStock === null) return
    
    const stockNum = parseInt(newStock) || 0
    if (stockNum < 0) {
      alert('Stock cannot be negative')
      return
    }

    try {
      await API.updateMedicine(id, { stock_quantity: stockNum })
      state.medicines = await API.listMedicines()
      renderMedicines()
    } catch(err) {
      alert(err.message)
    }
  }

  function openImageInNewTab(dataUrl) {
    const newWindow = window.open()
    newWindow.document.write(`
      <html>
        <head><title>Medical Image</title></head>
        <body style="margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #000;">
          <img src="${dataUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
        </body>
      </html>
    `)
    newWindow.document.close()
  }

  function viewPatientDetails(id) {
    const patient = state.patients.find(p => p.id === id)
    if (!patient) return

    // Parse medical images if they exist
    let medicalImages = []
    if (patient.medical_images) {
      try {
        medicalImages = JSON.parse(patient.medical_images)
      } catch (e) {
        console.error('Error parsing medical images:', e)
      }
    }

    const modalHtml = `
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;" id="patient-details-modal">
        <div style="background: white; padding: 24px; border-radius: 12px; width: 90%; max-width: 800px; max-height: 90%; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2>Patient Details: ${patient.name}</h2>
            <button onclick="document.getElementById('patient-details-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div>
              <h3>Personal Information</h3>
              <p><strong>Name:</strong> ${patient.name}</p>
              <p><strong>Email:</strong> ${patient.email || 'Not provided'}</p>
              <p><strong>Phone:</strong> ${patient.phone || 'Not provided'}</p>
              <p><strong>Date of Birth:</strong> ${patient.date_of_birth || 'Not provided'}</p>
              <p><strong>Gender:</strong> ${patient.gender || 'Not provided'}</p>
              <p><strong>Blood Group:</strong> ${patient.blood_group || 'Not provided'}</p>
            </div>
            <div>
              <h3>Medical Information</h3>
              <p><strong>Allergies:</strong> ${patient.allergies || 'None reported'}</p>
              <p><strong>Medical History:</strong> ${patient.medical_history || 'None reported'}</p>
              <p><strong>Emergency Contact:</strong> ${patient.emergency_contact || 'Not provided'}</p>
            </div>
          </div>
          
          ${patient.address ? `
            <div style="margin-bottom: 20px;">
              <h3>Address</h3>
              <p>${patient.address}</p>
            </div>
          ` : ''}
          
          ${patient.notes ? `
            <div style="margin-bottom: 20px;">
              <h3>Notes</h3>
              <p>${patient.notes}</p>
            </div>
          ` : ''}
          
          ${medicalImages.length > 0 ? `
            <div style="margin-bottom: 20px;">
              <h3>Medical Images</h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
                ${medicalImages.map(img => `
                  <div style="border: 1px solid #ddd; border-radius: 8px; padding: 12px; text-align: center;">
                    ${img.type.startsWith('image/') ? `
                      <img src="${img.data}" alt="${img.name}" style="max-width: 100%; max-height: 150px; object-fit: cover; border-radius: 4px; margin-bottom: 8px; cursor: pointer;" onclick="openImageInNewTab('${img.data.replace(/'/g, "\\'")}')">
                    ` : `
                      <div style="padding: 40px; background: #f5f5f5; border-radius: 4px; margin-bottom: 8px;">
                        📄 ${img.type.includes('pdf') ? 'PDF' : 'Document'}
                      </div>
                    `}
                    <p style="font-size: 12px; margin: 0; word-break: break-all;">${img.name}</p>
                    <p style="font-size: 10px; color: #666; margin: 4px 0 0 0;">${(img.size / 1024).toFixed(1)} KB</p>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <div style="text-align: right; margin-top: 20px;">
            <button class="btn" onclick="editPatient('${patient.id}'); document.getElementById('patient-details-modal').remove()">Edit Patient</button>
            <button class="btn" onclick="document.getElementById('patient-details-modal').remove()">Close</button>
          </div>
        </div>
      </div>
    `
    
    document.body.insertAdjacentHTML('beforeend', modalHtml)
  }

  function clearFilters() {
    state.analysisFilters = {}
    renderAnalysis()
  }

  function downloadAnalysisExcel() {
    const invoices = state.invoices
    const rows = []
    
    for (const inv of invoices){
      for (const it of (inv.items || [])){
        const isIssue = typeof it.description === 'string' && it.description.startsWith('Issue:')
        if (isIssue) continue
        rows.push([
          inv.patient_name || '—',
          it.description || '',
          it.qty || 0,
          inv.total || 0,
          inv.issue_date || '',
          (inv.items||[]).find(x => typeof x.description === 'string' && x.description.startsWith('Issue:'))?.description?.slice(7) || ''
        ])
      }
    }

    const data = [
      ['Patient', 'Medicine', 'Qty', 'Bill Total', 'Bill Date', 'Issue'],
      ...rows
    ]
    downloadExcel(data, 'Billing_Analysis')
  }

  function downloadExcel(data, filename) {
    // Create CSV content
    const csvContent = data.map(row => 
      row.map(cell => {
        // Handle cells with commas or quotes
        const cellStr = String(cell || '')
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return '"' + cellStr.replace(/"/g, '""') + '"'
        }
        return cellStr
      }).join(',')
    ).join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0,10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // File upload functions
  let uploadedFiles = []

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error)
    })
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.currentTarget.classList.add('drag-over')
  }

  function handleDragLeave(e) {
    e.preventDefault()
    e.currentTarget.classList.remove('drag-over')
  }

  function handleDrop(e) {
    e.preventDefault()
    e.currentTarget.classList.remove('drag-over')
    const files = Array.from(e.dataTransfer.files)
    processFiles(files, e.currentTarget)
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files)
    processFiles(files, e.target.closest('.image-upload-area'))
  }

  function processFiles(files, container) {
    const previewDiv = container.querySelector('[id$="file-preview"]') || container.querySelector('#file-preview')
    
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`File ${file.name} is too large. Maximum size is 10MB.`)
        return
      }

      uploadedFiles.push(file)
      
      const fileDiv = document.createElement('div')
      fileDiv.className = 'file-item'
      fileDiv.innerHTML = `
        <div class="file-info">
          <span class="file-name">${file.name}</span>
          <span class="file-size">(${(file.size / 1024).toFixed(1)} KB)</span>
          <button type="button" class="remove-file" onclick="removeFile('${file.name}', this)">×</button>
        </div>
        ${file.type.startsWith('image/') ? `<img src="${URL.createObjectURL(file)}" class="file-thumbnail" alt="${file.name}">` : ''}
      `
      previewDiv.appendChild(fileDiv)
    })
  }

  function removeFile(fileName, button) {
    uploadedFiles = uploadedFiles.filter(f => f.name !== fileName)
    button.closest('.file-item').remove()
  }

  // Make functions global
  window.deletePatient = deletePatient
  window.editPatient = editPatient
  window.clearFilters = clearFilters
  window.downloadAnalysisExcel = downloadAnalysisExcel
  window.toggleSelectAll = toggleSelectAll
  window.updateSelection = updateSelection
  window.handleDragOver = handleDragOver
  window.handleDragLeave = handleDragLeave
  window.handleDrop = handleDrop
  window.handleFileSelect = handleFileSelect
  window.removeFile = removeFile
  window.viewPatientDetails = viewPatientDetails
  window.openImageInNewTab = openImageInNewTab
  window.removeExistingImage = removeExistingImage
  window.clearPatientFilters = clearPatientFilters

  function clearPatientFilters() {
    state.patientSearch = ''
    state.patientSort = 'name'
    state.patientSortOrder = 'asc'
    renderPatients()
  }

  function removeExistingImage(index) {
    if (window.editingPatientImages && window.editingPatientImages[index]) {
      window.editingPatientImages.splice(index, 1)
      
      // Re-render the existing images section
      const container = $('#existing-images')
      if (container) {
        container.innerHTML = window.editingPatientImages.map((img, newIndex) => `
          <div class="existing-image-item" data-index="${newIndex}" style="border: 1px solid #ddd; border-radius: 8px; padding: 8px; text-align: center; position: relative;">
            ${img.type.startsWith('image/') ? `
              <img src="${img.data}" alt="${img.name}" style="max-width: 100%; max-height: 100px; object-fit: cover; border-radius: 4px; margin-bottom: 4px;">
            ` : `
              <div style="padding: 30px; background: #f5f5f5; border-radius: 4px; margin-bottom: 4px;">
                📄 ${img.type.includes('pdf') ? 'PDF' : 'DOC'}
              </div>
            `}
            <p style="font-size: 10px; margin: 0; word-break: break-all;">${img.name}</p>
            <button type="button" onclick="removeExistingImage(${newIndex})" style="position: absolute; top: 4px; right: 4px; background: red; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 12px;">×</button>
          </div>
        `).join('')
      }
    }
  }

  // ---------- Router ----------
  async function render(){
    const hash = location.hash || '#patients'
    setActiveNav(hash)
    const view = hash.replace('#','')
    try{
      await loadDataFor(view)
    } catch(err){ console.error(err); alert(err.message) }

    if (view === 'patients') renderPatients()
    else if (view === 'billing') renderBilling()
    else if (view === 'analysis') renderAnalysis()
    else {
      location.hash = '#patients'
      return
    }
  }

  window.addEventListener('hashchange', render)
  window.addEventListener('load', render)
})()
