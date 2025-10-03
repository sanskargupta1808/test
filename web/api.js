(function(global){
  const API_BASE = global.API_BASE || '/api/v1'

  async function request(path, opts){
    console.log('API Request:', API_BASE + path, opts)
    
    const res = await fetch(API_BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    })
    
    console.log('API Response status:', res.status)
    
    if (!res.ok){
      let msg = `Request failed: ${res.status}`
      try { 
        const data = await res.json()
        console.error('API Error data:', data)
        msg = data.detail || msg 
      } catch (e) {
        const text = await res.text()
        console.error('API Error text:', text)
        msg = text || msg
      }
      throw new Error(msg)
    }
    
    // Some DELETE endpoints return no body
    const text = await res.text()
    if (!text) return null
    
    const result = JSON.parse(text)
    console.log('API Response data:', result)
    return result
  }

  function unwrapPage(data){
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.items)) return data.items
    return []
  }

  // Patients
  async function listPatients(){
    const data = await request('/patients', { method: 'GET' })
    return unwrapPage(data)
  }
  async function createPatient(payload){
    // Strip empty strings -> undefined
    const body = {}
    for (const [k,v] of Object.entries(payload)){
      if (v !== '' && v !== null && v !== undefined) body[k] = v
    }
    return await request('/patients', { method: 'POST', body: JSON.stringify(body) })
  }
  async function updatePatient(id, payload){
    const body = {}
    for (const [k,v] of Object.entries(payload)){
      if (v !== '' && v !== null && v !== undefined) body[k] = v
    }
    return await request(`/patients/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  }
  async function deletePatient(id){
    return await request(`/patients/${id}`, { method: 'DELETE' })
  }

  // Medicines
  async function listMedicines(){
    const data = await request('/medicines', { method: 'GET' })
    return unwrapPage(data)
  }
  async function createMedicine(payload){
    const body = {}
    for (const [k,v] of Object.entries(payload)){
      if (v !== '' && v !== null && v !== undefined) body[k] = v
    }
    return await request('/medicines', { method: 'POST', body: JSON.stringify(body) })
  }
  async function deleteMedicine(id){
    return await request(`/medicines/${id}`, { method: 'DELETE' })
  }

  async function updateMedicine(id, payload){
    const body = {}
    for (const [k,v] of Object.entries(payload)){
      if (v !== '' && v !== null && v !== undefined) body[k] = v
    }
    return await request(`/medicines/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  }

  // Appointments
  async function listAppointments(){
    const data = await request('/appointments', { method: 'GET' })
    return unwrapPage(data)
  }
  async function createAppointment(payload){
    return await request('/appointments', { method: 'POST', body: JSON.stringify(payload) })
  }
  async function deleteAppointment(id){
    return await request(`/appointments/${id}`, { method: 'DELETE' })
  }

  // Invoices
  async function listInvoices(){
    const data = await request('/invoices', { method: 'GET' })
    return unwrapPage(data)
  }
  async function createInvoice(payload){
    console.log('API: Creating invoice with payload:', payload)
    try {
      const result = await request('/invoices', { 
        method: 'POST', 
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      console.log('API: Invoice created successfully:', result)
      return result
    } catch (error) {
      console.error('API: Invoice creation failed:', error)
      throw error
    }
  }
  async function deleteInvoice(id){
    return await request(`/invoices/${id}`, { method: 'DELETE' })
  }

  global.API = {
    listPatients, createPatient, updatePatient, deletePatient,
    listMedicines, createMedicine, updateMedicine, deleteMedicine,
    listAppointments, createAppointment, deleteAppointment,
    listInvoices, createInvoice, deleteInvoice,
  }
})(window)
