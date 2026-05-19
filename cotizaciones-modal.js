// ===== Cotizaciones — Modal Nueva Cotización (Estructura Completa) =====
// Ref: cotizaciones-estructura.md

function showNewCotizacionModal() {
  let orders = _otCache;
  if (!orders.length) {
    // Pre-fetch OT options if not cached
    try {
      const res = await apiFetch(`${API_URL}/work-orders`);
      if (res.ok) { orders = await res.json(); _otCache = orders; }
    } catch { /* continue */ }
  }
  const otOptions = orders.map((o) => `<option value="${esc(o.id)}" data-number="${esc(o.otNumber)}">${esc(o.otNumber)} · ${esc(o.client)}</option>`).join('');

  const actividadesOptions = [
    'Actividad no especificada',
    'Desarrollo y preventa',
    'Compras',
    'Planeacion y Ctrl prod (procesos)',
    'Seguridad Industrial',
    'Gestion de calidad (ISO)',
    'Almacen',
    'Control de Costo',
    'Supervicion',
    'Mantenimiento',
    'Actividades administrativas/contables/RH',
    'Juntas',
    'Curso/capacitacion',
  ].map((a) => `<option value="${esc(a)}">${esc(a)}</option>`).join('');

  const bodyHtml = `
    <form id="new-cot-form" style="max-height:70vh;overflow-y:auto;padding-right:12px">

      <!-- SECCIÓN 1: DATOS BÁSICOS -->
      <fieldset>
        <legend>📋 Datos Básicos</legend>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="fg"><label>Cliente *</label><input name="cliente" required></div>
          <div class="fg"><label>Proyecto / Programa</label><input name="proyecto"></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
          <div class="fg"><label>Celda</label><input name="celda"></div>
          <div class="fg"><label>RFQ</label><input name="rfq"></div>
          <div class="fg"><label>MECR</label><input name="mecr"></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="fg"><label>COT REF. ALENSTEC (COT-AL) *</label><input name="cotRefAlenstec" placeholder="CZ-2026-###" required></div>
          <div class="fg"><label>Fecha COT (dd/mm/yyyy) *</label><input name="fechaCot" type="date" required></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="fg"><label>COSTO COT-AL (USD) (Sin IVA) *</label><input name="costoCotUsd" type="number" step="0.01" min="0" required></div>
          <div class="fg"><label>Orden de Compra (Cliente)</label><input name="ocCliente"></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="fg"><label>Tipo de Contrato</label>
            <select name="tipoContrato">
              <option value="">—</option>
              <option value="Abierta">Abierta</option>
              <option value="Cerrada">Cerrada</option>
              <option value="Administración">Administración</option>
              <option value="Marco">Marco</option>
            </select>
          </div>
          <div class="fg"><label>Fecha O.C. (dd/mm/yyyy)</label><input name="fechaOc" type="date"></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="fg"><label>COSTO O.C. (USD) (Sin IVA)</label><input name="costoOcUsd" type="number" step="0.01" min="0"></div>
          <div class="fg"><label>Fecha Compromiso Entrega (dd/mm/yyyy)</label><input name="fechaCompromiso" type="date"></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="fg"><label>Tipo de Cambio (USD) [MXN-USD]</label><input name="tipoCambio" type="number" step="0.01" min="0" placeholder="17.50"></div>
          <div class="fg"><label>OT. ALENSTEC (OT-AL)</label>
            <select name="otId">
              <option value="">—</option>
              ${otOptions}
            </select>
          </div>
        </div>

        <div class="fg"><label>Descripción de Proyecto</label><textarea name="descripcionProyecto" placeholder="Detalle del proyecto…" style="min-height:80px"></textarea></div>
      </fieldset>

      <!-- SECCIÓN 2: LABOR INDIRECTA -->
      <fieldset>
        <legend>👤 Labor Indirecta [1-13 actividades]</legend>
        <div id="labor-indirecta-group" style="display:grid;grid-template-columns:1fr;gap:12px">
          <!-- Rows will be added dynamically or as a repeating group -->
          <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:8px;align-items:end">
            <div class="fg"><label>Actividad</label>
              <select name="actividad_1" class="act-select">
                <option value="">Selecciona…</option>
                ${actividadesOptions}
              </select>
            </div>
            <div class="fg"><label>Cot. (HRS)</label><input name="cotHrs_1" type="number" step="0.01" min="0" class="labor-input"></div>
            <div class="fg"><label>Real (HRS)</label><input name="realHrs_1" type="number" step="0.01" min="0" class="labor-input"></div>
            <div class="fg"><label>$/HR (USD)</label><input name="costPerHr_1" type="number" step="0.01" min="0" class="labor-input"></div>
            <div class="fg"><label>Costo (USD)</label><input name="totalCost_1" type="number" step="0.01" min="0" readonly class="labor-calc"></div>
          </div>
        </div>
        <button type="button" class="btn sm" onclick="addLaborIndirectRow()" style="margin-top:8px">+ Añadir actividad</button>
      </fieldset>

      <!-- SECCIÓN 3: LABOR DIRECTA — INGENIERIA/DISEÑO -->
      <fieldset>
        <legend>🔧 Labor Directa — Ingeniería/Diseño</legend>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px">
          <div class="fg"><label>Ing. [COTIZADO] (HRS) [A]</label><input name="ingCotHrs" type="number" step="0.01" min="0"></div>
          <div class="fg"><label>Ing. [REAL] (HRS) [A]</label><input name="ingRealHrs" type="number" step="0.01" min="0"></div>
          <div class="fg"><label>Costo/HR (USD)</label><input name="ingCostPerHr" type="number" step="0.01" min="0" class="ing-input"></div>
          <div class="fg"><label>Costo Ing. (USD)</label><input name="ingTotal" type="number" step="0.01" min="0" readonly class="ing-calc"></div>
        </div>
      </fieldset>

      <!-- SECCIÓN 4: LABOR DIRECTA — MANUFACTURA -->
      <fieldset>
        <legend>⚙️ Labor Directa — Manufactura</legend>

        <h4 style="margin-top:0;font-size:12px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px">Procesos [COTIZADO] (HRS)</h4>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;font-size:12px">
          <div class="fg"><label>[B] Corte</label><input name="mnf_corte_cot" type="number" step="0.01" min="0" class="mnf-input"></div>
          <div class="fg"><label>[C] Fabricación</label><input name="mnf_fab_cot" type="number" step="0.01" min="0" class="mnf-input"></div>
          <div class="fg"><label>[E] Maquinado</label><input name="mnf_maq_cot" type="number" step="0.01" min="0" class="mnf-input"></div>
          <div class="fg"><label>[F] Hilo erosión</label><input name="mnf_hilo_cot" type="number" step="0.01" min="0" class="mnf-input"></div>
          <div class="fg"><label>[G] Ensamble</label><input name="mnf_ens_cot" type="number" step="0.01" min="0" class="mnf-input"></div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;font-size:12px">
          <div class="fg"><label>[H] Labor Eléc.</label><input name="mnf_elec_cot" type="number" step="0.01" min="0" class="mnf-input"></div>
          <div class="fg"><label>[D] Otros Proc.</label><input name="mnf_otros_cot" type="number" step="0.01" min="0" class="mnf-input"></div>
          <div class="fg"><label>[J] Shopper</label><input name="mnf_shopper_cot" type="number" step="0.01" min="0" class="mnf-input"></div>
          <div class="fg"><label>[K] Cert. Dim.</label><input name="mnf_cert_cot" type="number" step="0.01" min="0" class="mnf-input"></div>
          <div class="fg"><label>[L] Empaque</label><input name="mnf_empaque_cot" type="number" step="0.01" min="0" class="mnf-input"></div>
        </div>

        <h4 style="margin-top:12px;font-size:12px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px">Instalación [COTIZADO] (HRS) [M]</h4>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
          <div class="fg"><label>Supervisor</label><input name="inst_sup_cot" type="number" step="0.01" min="0" class="inst-input"></div>
          <div class="fg"><label>Técnico Mecánico</label><input name="inst_tec_cot" type="number" step="0.01" min="0" class="inst-input"></div>
          <div class="fg"><label>Eléctrico</label><input name="inst_elec_cot" type="number" step="0.01" min="0" class="inst-input"></div>
          <div class="fg"><label>Programador</label><input name="inst_prog_cot" type="number" step="0.01" min="0" class="inst-input"></div>
        </div>
        <div class="fg"><label>Total Instalación [COTIZADO] (HRS)</label><input name="instTotalCot" type="number" step="0.01" min="0" readonly class="inst-total"></div>

        <h4 style="margin-top:12px;font-size:12px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px">Procesos [REAL] (HRS)</h4>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;font-size:12px">
          <div class="fg"><label>[B] Corte</label><input name="mnf_corte_real" type="number" step="0.01" min="0"></div>
          <div class="fg"><label>[C] Fabricación</label><input name="mnf_fab_real" type="number" step="0.01" min="0"></div>
          <div class="fg"><label>[E] Maquinado</label><input name="mnf_maq_real" type="number" step="0.01" min="0"></div>
          <div class="fg"><label>[F] Hilo erosión</label><input name="mnf_hilo_real" type="number" step="0.01" min="0"></div>
          <div class="fg"><label>[G] Ensamble</label><input name="mnf_ens_real" type="number" step="0.01" min="0"></div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-size:12px">
          <div class="fg"><label>[H] Labor Eléc.</label><input name="mnf_elec_real" type="number" step="0.01" min="0"></div>
          <div class="fg"><label>[D] Otros Proc.</label><input name="mnf_otros_real" type="number" step="0.01" min="0"></div>
          <div class="fg"><label>[J] Shopper</label><input name="mnf_shopper_real" type="number" step="0.01" min="0"></div>
          <div class="fg"><label>[K] Cert. Dim.</label><input name="mnf_cert_real" type="number" step="0.01" min="0"></div>
        </div>

        <h4 style="margin-top:12px;font-size:12px;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px">Instalación [REAL] (HRS) [L]</h4>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
          <div class="fg"><label>Diseño</label><input name="inst_design_real" type="number" step="0.01" min="0"></div>
          <div class="fg"><label>Técnico</label><input name="inst_tec_real" type="number" step="0.01" min="0"></div>
          <div class="fg"><label>Eléctrico</label><input name="inst_elec_real" type="number" step="0.01" min="0"></div>
          <div class="fg"><label>Programador</label><input name="inst_prog_real" type="number" step="0.01" min="0"></div>
        </div>
        <div class="fg"><label>Total Instalación [REAL] (HRS)</label><input name="instTotalReal" type="number" step="0.01" min="0" readonly></div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">
          <div class="fg"><label>Costo/HR [COTIZADO] (USD)</label><input name="mnfCostPerHr" type="number" step="0.01" min="0" class="mnf-calc-input"></div>
          <div class="fg"><label>Costo Mnf. [COTIZADO] (USD)</label><input name="mnfTotal" type="number" step="0.01" min="0" readonly class="mnf-total"></div>
        </div>
      </fieldset>

      <!-- SECCIÓN 5: LABOR DIRECTA — AUTOMATIZACIÓN -->
      <fieldset>
        <legend>🤖 Labor Directa — Automatización</legend>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px">
          <div class="fg"><label>Auto. [COTIZADO] (HRS) [I]</label><input name="autoCotHrs" type="number" step="0.01" min="0"></div>
          <div class="fg"><label>Auto. [REAL] (HRS) [I]</label><input name="autoRealHrs" type="number" step="0.01" min="0"></div>
          <div class="fg"><label>Costo/HR (USD)</label><input name="autoCostPerHr" type="number" step="0.01" min="0" class="auto-input"></div>
          <div class="fg"><label>Costo Auto. (USD)</label><input name="autoTotal" type="number" step="0.01" min="0" readonly class="auto-calc"></div>
        </div>
      </fieldset>

      <!-- SECCIÓN 6: MATERIALES -->
      <fieldset>
        <legend>📦 Materiales [COTIZADO] (USD)</legend>
        <div style="display:grid;grid-template-columns:1fr;gap:8px">
          <div class="fg"><label>Aceros (Aluminio, Hierro, Bronce, C.R., Amutit, Inox)</label><input name="matAceros" type="number" step="0.01" min="0" class="mat-input"></div>
          <div class="fg"><label>Plásticos (Nylamid, Acetal, PVC, Ultem, Renshape, Policarbonato, Acrílico)</label><input name="matPlasticos" type="number" step="0.01" min="0" class="mat-input"></div>
          <div class="fg"><label>Recubrimientos (Electroless, Pavonado, Pintura, Galvanizado, Zincado, Titanio)</label><input name="matRecubrimientos" type="number" step="0.01" min="0" class="mat-input"></div>
          <div class="fg"><label>Tratamientos Térmicos (Temple, Normalizado, R.F, Recocido, Revenido, Cementado)</label><input name="matTratamientos" type="number" step="0.01" min="0" class="mat-input"></div>
          <div class="fg"><label>Componentes (Eléctrico, Mecánico, Control, Consumibles)</label><input name="matComponentes" type="number" step="0.01" min="0" class="mat-input"></div>
          <div class="fg"><label>Certificados (Dureza, Dimensional)</label><input name="matCertificados" type="number" step="0.01" min="0" class="mat-input"></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">
          <div class="fg"><label>SUB-TOTAL MATERIALES (USD)</label><input name="matSubtotal" type="number" step="0.01" min="0" readonly class="mat-subtotal"></div>
          <div class="fg"><label>% Utilidad {PROFIT}</label><input name="matProfitPct" type="number" step="0.01" min="0" placeholder="10" class="mat-profit"></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="fg"><label>Utilidad {PROFIT} (USD)</label><input name="matProfitUsd" type="number" step="0.01" min="0" readonly class="mat-profit-usd"></div>
          <div class="fg"><label>TOTAL MAT. COMERCIALES (USD)</label><input name="matTotal" type="number" step="0.01" min="0" readonly class="mat-total-final"></div>
        </div>
      </fieldset>

      <!-- SECCIÓN 7: VIATICOS -->
      <fieldset>
        <legend>✈️ Viáticos [COTIZADO] (USD)</legend>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
          <div class="fg"><label>Comida (USD)</label><input name="viatComida" type="number" step="0.01" min="0" class="viat-input"></div>
          <div class="fg"><label>Estancia (USD)</label><input name="viatEstancia" type="number" step="0.01" min="0" class="viat-input"></div>
          <div class="fg"><label>Peaje (USD)</label><input name="viatPeaje" type="number" step="0.01" min="0" class="viat-input"></div>
          <div class="fg"><label>Gasolina (USD)</label><input name="viatGasolina" type="number" step="0.01" min="0" class="viat-input"></div>
        </div>
        <div class="fg"><label>TOTAL Viáticos (USD)</label><input name="viatTotal" type="number" step="0.01" min="0" readonly class="viat-total"></div>
      </fieldset>

      <!-- SECCIÓN 8: LOGISTICA -->
      <fieldset>
        <legend>📮 Logística [COTIZADO] (USD)</legend>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="fg"><label>Envío (USD)</label><input name="logisticaEnvio" type="number" step="0.01" min="0" class="log-input"></div>
          <div class="fg"><label>Embalaje (USD)</label><input name="logisticaEmbalaje" type="number" step="0.01" min="0" class="log-input"></div>
        </div>
        <div class="fg"><label>TOTAL Logística (USD)</label><input name="logisticaTotal" type="number" step="0.01" min="0" readonly class="log-total"></div>
      </fieldset>

      <!-- SECCIÓN 9: FINALES -->
      <fieldset>
        <legend>💰 Totales Finales</legend>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="fg"><label>UTILIDAD / PROFIT (USD)</label><input name="utilidadFinal" type="number" step="0.01" min="0" class="final-input"></div>
          <div class="fg"><label>PARTIDA DE IVA P/ EMPRESA US (USD)</label><input name="ivaEmpresa" type="number" step="0.01" min="0" class="final-input"></div>
        </div>
        <div class="fg"><label style="font-weight:600">TOTAL [COTIZADO] (USD) ★</label><input name="totalFinal" type="number" step="0.01" min="0" readonly style="font-weight:600;font-size:14px;color:var(--green)" class="final-total"></div>

        <div class="fg"><label>Notas</label><textarea name="notas" placeholder="Observaciones, aclaraciones…" style="min-height:100px"></textarea></div>
      </fieldset>

      <div class="modal-error" id="new-cot-error"></div>
      <div class="modal-actions">
        <button type="button" class="btn sm" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn p sm" id="new-cot-submit">Crear Cotización</button>
      </div>
    </form>
  `;

  openModal({
    title: '+ Nueva Cotización',
    bodyHtml: bodyHtml,
  });

  // Attach event listeners for calculated fields
  setupCotizacionCalculators();

  // Attach form submit handler
  const form = document.getElementById('new-cot-form');
  const err  = document.getElementById('new-cot-error');
  const submitBtn = document.getElementById('new-cot-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creando…';

    try {
      const data = Object.fromEntries(new FormData(form).entries());
      // Convert numeric fields
      ['costoCotUsd', 'costoOcUsd', 'tipoCambio', 'cotHrs_1', 'realHrs_1', 'costPerHr_1', 'totalCost_1',
       'ingCotHrs', 'ingRealHrs', 'ingCostPerHr', 'ingTotal', 'autoCotHrs', 'autoRealHrs', 'autoCostPerHr', 'autoTotal',
       'mnfCostPerHr', 'mnfTotal', 'matAceros', 'matPlasticos', 'matRecubrimientos', 'matTratamientos', 'matComponentes', 'matCertificados',
       'matSubtotal', 'matProfitPct', 'matProfitUsd', 'matTotal', 'viatComida', 'viatEstancia', 'viatPeaje', 'viatGasolina', 'viatTotal',
       'logisticaEnvio', 'logisticaEmbalaje', 'logisticaTotal', 'utilidadFinal', 'ivaEmpresa', 'totalFinal'
      ].forEach((k) => { if (data[k] !== '' && data[k] != null) data[k] = Number(data[k]); });

      const res = await apiFetch(`${API_URL}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || body.mensaje || `HTTP ${res.status}`);

      closeModal();
      await loadCotizaciones();
    } catch (e2) {
      err.textContent = e2.message;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Crear Cotización';
    }
  });
}

// Helper: Setup auto-calculators for cotización form
function setupCotizacionCalculators() {
  // Labor Indirecta row calculator
  const laborIndirectaInputs = document.querySelectorAll('#new-cot-form .labor-input');
  laborIndirectaInputs.forEach((input) => {
    input.addEventListener('blur', () => {
      const row = input.closest('div');
      const cotHrs = Number(row.querySelector('input[name^="cotHrs_"]')?.value) || 0;
      const costPerHr = Number(row.querySelector('input[name^="costPerHr_"]')?.value) || 0;
      const totalField = row.querySelector('input[name^="totalCost_"]');
      if (totalField) totalField.value = (cotHrs * costPerHr).toFixed(2);
    });
  });

  // Ingeniería calculator
  const ingInputs = document.querySelectorAll('#new-cot-form .ing-input');
  ingInputs.forEach((input) => {
    input.addEventListener('blur', () => {
      const form = document.getElementById('new-cot-form');
      const cotHrs = Number(form.ingCotHrs.value) || 0;
      const costPerHr = Number(form.ingCostPerHr.value) || 0;
      form.ingTotal.value = (cotHrs * costPerHr).toFixed(2);
    });
  });

  // Automatización calculator
  const autoInputs = document.querySelectorAll('#new-cot-form .auto-input');
  autoInputs.forEach((input) => {
    input.addEventListener('blur', () => {
      const form = document.getElementById('new-cot-form');
      const cotHrs = Number(form.autoCotHrs.value) || 0;
      const costPerHr = Number(form.autoCostPerHr.value) || 0;
      form.autoTotal.value = (cotHrs * costPerHr).toFixed(2);
    });
  });

  // Instalación total calculator
  const instInputs = document.querySelectorAll('#new-cot-form .inst-input');
  instInputs.forEach((input) => {
    input.addEventListener('blur', () => {
      const form = document.getElementById('new-cot-form');
      const sup = Number(form.inst_sup_cot.value) || 0;
      const tec = Number(form.inst_tec_cot.value) || 0;
      const elec = Number(form.inst_elec_cot.value) || 0;
      const prog = Number(form.inst_prog_cot.value) || 0;
      form.instTotalCot.value = (sup + tec + elec + prog).toFixed(2);

      // Also recalc manufacturing total if cost/hr is set
      const form2 = document.getElementById('new-cot-form');
      const costPerHr = Number(form2.mnfCostPerHr.value) || 0;
      form2.mnfTotal.value = (form.instTotalCot.value * costPerHr).toFixed(2);
    });
  });

  // Materials calculator
  const matInputs = document.querySelectorAll('#new-cot-form .mat-input');
  const updateMatTotals = () => {
    const form = document.getElementById('new-cot-form');
    const aceros = Number(form.matAceros.value) || 0;
    const plasticos = Number(form.matPlasticos.value) || 0;
    const recubrimientos = Number(form.matRecubrimientos.value) || 0;
    const tratamientos = Number(form.matTratamientos.value) || 0;
    const componentes = Number(form.matComponentes.value) || 0;
    const certificados = Number(form.matCertificados.value) || 0;
    const subtotal = aceros + plasticos + recubrimientos + tratamientos + componentes + certificados;
    form.matSubtotal.value = subtotal.toFixed(2);

    const profitPct = Number(form.matProfitPct.value) || 0;
    const profitUsd = (subtotal * profitPct / 100);
    form.matProfitUsd.value = profitUsd.toFixed(2);

    const total = subtotal + profitUsd;
    form.matTotal.value = total.toFixed(2);
  };
  matInputs.forEach((input) => { input.addEventListener('blur', updateMatTotals); });
  document.getElementById('new-cot-form').matProfitPct?.addEventListener('blur', updateMatTotals);

  // Viáticos calculator
  const viatInputs = document.querySelectorAll('#new-cot-form .viat-input');
  const updateViatTotal = () => {
    const form = document.getElementById('new-cot-form');
    const comida = Number(form.viatComida.value) || 0;
    const estancia = Number(form.viatEstancia.value) || 0;
    const peaje = Number(form.viatPeaje.value) || 0;
    const gasolina = Number(form.viatGasolina.value) || 0;
    form.viatTotal.value = (comida + estancia + peaje + gasolina).toFixed(2);
  };
  viatInputs.forEach((input) => { input.addEventListener('blur', updateViatTotal); });

  // Logística calculator
  const logInputs = document.querySelectorAll('#new-cot-form .log-input');
  const updateLogTotal = () => {
    const form = document.getElementById('new-cot-form');
    const envio = Number(form.logisticaEnvio.value) || 0;
    const embalaje = Number(form.logisticaEmbalaje.value) || 0;
    form.logisticaTotal.value = (envio + embalaje).toFixed(2);
  };
  logInputs.forEach((input) => { input.addEventListener('blur', updateLogTotal); });
}

// Helper: Add a new Labor Indirecta activity row
function addLaborIndirectRow() {
  const container = document.getElementById('labor-indirecta-group');
  const rowCount = container.querySelectorAll('div[style*="grid-template-columns"]').length + 1;

  const actividadesOptions = [
    'Actividad no especificada', 'Desarrollo y preventa', 'Compras', 'Planeacion y Ctrl prod (procesos)',
    'Seguridad Industrial', 'Gestion de calidad (ISO)', 'Almacen', 'Control de Costo', 'Supervicion',
    'Mantenimiento', 'Actividades administrativas/contables/RH', 'Juntas', 'Curso/capacitacion',
  ].map((a) => `<option value="${esc(a)}">${esc(a)}</option>`).join('');

  const html = `
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:8px;align-items:end">
      <div class="fg"><label>Actividad</label>
        <select name="actividad_${rowCount}" class="act-select">
          <option value="">Selecciona…</option>
          ${actividadesOptions}
        </select>
      </div>
      <div class="fg"><label>Cot. (HRS)</label><input name="cotHrs_${rowCount}" type="number" step="0.01" min="0" class="labor-input"></div>
      <div class="fg"><label>Real (HRS)</label><input name="realHrs_${rowCount}" type="number" step="0.01" min="0" class="labor-input"></div>
      <div class="fg"><label>$/HR (USD)</label><input name="costPerHr_${rowCount}" type="number" step="0.01" min="0" class="labor-input"></div>
      <div class="fg"><label>Costo (USD)</label><input name="totalCost_${rowCount}" type="number" step="0.01" min="0" readonly class="labor-calc"></div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);

  // Re-attach calculator to new row
  const newInputs = container.querySelectorAll('div:last-child .labor-input');
  newInputs.forEach((input) => {
    input.addEventListener('blur', () => {
      const row = input.closest('div');
      const cotHrs = Number(row.querySelector('input[name^="cotHrs_"]')?.value) || 0;
      const costPerHr = Number(row.querySelector('input[name^="costPerHr_"]')?.value) || 0;
      const totalField = row.querySelector('input[name^="totalCost_"]');
      if (totalField) totalField.value = (cotHrs * costPerHr).toFixed(2);
    });
  });
}
