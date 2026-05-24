// Helper: Get value by ID
const v = (id) => document.getElementById(id)?.value?.trim() || '';

let lesionCount = 0;

document.addEventListener('DOMContentLoaded', () => {
  // Set today's date
  const today = new Date().toISOString().split('T')[0];
  const examInput = document.getElementById('examDate');
  const dobInput = document.getElementById('patientDob');
  if (examInput) examInput.value = today;
  if (dobInput) dobInput.max = today;

  // Title Case on blur for all text inputs
  document.querySelectorAll('input[type="text"], textarea').forEach(el => {
    el.addEventListener('blur', function() {
      if (!this.value) return;
      const oldVal = this.value;
      const newVal = this.value.replace(/\b\w/g, char => char.toUpperCase());
      if (oldVal !== newVal) {
        this.value = newVal;
        this.classList.add('title-cased');
        setTimeout(() => this.classList.remove('title-cased'), 500);
        updatePreview();
      }
    });
  });

  // Attach preview listeners to static inputs
  document.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('input', updatePreview);
    el.addEventListener('change', updatePreview);
  });

  updatePreview();
  showToast('Welcome — start by entering patient details', 'info');
});

// Calculate age from DOB
function calcAge() {
  const dobVal = v('patientDob');
  const ageInput = document.getElementById('patientAge');
  if (!dobVal || !ageInput) return;
  
  const dob = new Date(dobVal);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  if (age >= 0) {
    ageInput.value = age;
    ageInput.readOnly = true;
    ageInput.parentElement.classList.add('age-filled');
    setTimeout(() => ageInput.parentElement.classList.remove('age-filled'), 600);
    updatePreview();
  }
}

// Lesion Management
function addLesion() {
  lesionCount++;
  const container = document.getElementById('lesionsContainer');
  const template = document.getElementById('lesion-template');
  const clone = template.content.cloneNode(true);
  
  const card = clone.querySelector('.lesion-card');
  clone.querySelector('.lesion-index').textContent = lesionCount;
  
  // Attach listeners to new elements for live preview
  clone.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', updatePreview);
    el.addEventListener('change', updatePreview);
  });

  container.appendChild(clone);
  updatePreview();
}

function removeLesion(btn) {
  btn.closest('.lesion-card').remove();
  // Renumber lesions
  const cards = document.querySelectorAll('.lesion-card');
  lesionCount = cards.length;
  cards.forEach((card, i) => {
    card.querySelector('.lesion-index').textContent = i + 1;
  });
  updatePreview();
}

function toggleBiopsyDetails(checkbox) {
  const detailsDiv = checkbox.closest('.lesion-card').querySelector('.biopsy-details');
  if (checkbox.checked) {
    detailsDiv.style.display = 'block';
  } else {
    detailsDiv.style.display = 'none';
    // Clear biopsy fields if unchecked
    detailsDiv.querySelector('.biopsy-instrument').value = '';
    detailsDiv.querySelector('.biopsy-samples').value = '1';
  }
  updatePreview();
}

// Show toast
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Gather all state
function getState() {
  const s = {
    name: v('patientName'),
    id: v('patientId'),
    age: v('patientAge'),
    gender: v('patientGender'),
    date: v('examDate'),
    procedure: v('procedureType'),
    anesthesia: v('anesthesia'),
    vcMobility: v('vcMobility'),
    airway: v('airwayPatency'),
    findings: v('generalFindings'),
    plan: v('clinicalPlan'),
    doctor: v('doctorName'),
    inst: v('institution'),
    indications: [],
    anatomy: [],
    lesions: []
  };

  document.querySelectorAll('#indicationsGroup input:checked').forEach(cb => {
    s.indications.push(cb.value);
  });

  document.querySelectorAll('.anatomy-grid input').forEach(cb => {
    const label = cb.nextElementSibling.textContent;
    if (cb.checked) {
      s.anatomy.push({ label, status: 'Normal' });
    } else {
      s.anatomy.push({ label, status: 'Abnormal/Not Assessed' });
    }
  });

  document.querySelectorAll('.lesion-card').forEach((card, i) => {
    const isBiopsy = card.querySelector('.lesion-biopsy-check').checked;
    s.lesions.push({
      index: i + 1,
      site: card.querySelector('.lesion-site').value || 'Unspecified site',
      size: card.querySelector('.lesion-size').value || '—',
      morphology: card.querySelector('.lesion-morph').value,
      leukoplakia: card.querySelector('.lesion-leuk').value,
      biopsy: isBiopsy,
      instrument: isBiopsy ? card.querySelector('.biopsy-instrument').value : null,
      samples: isBiopsy ? card.querySelector('.biopsy-samples').value : null
    });
  });

  return s;
}

// Update Live Preview
function updatePreview() {
  const p = document.getElementById('reportPreview');
  if (!p) return;
  
  const s = getState();
  
  let html = `
    <div class="rep-block">
      <h4>Patient & Setup</h4>
      <div class="rep-row"><div class="rep-label">Patient:</div><div class="rep-val">${s.name || '—'} (ID: ${s.id || '—'})</div></div>
      <div class="rep-row"><div class="rep-label">Demographics:</div><div class="rep-val">${s.age ? s.age + ' yrs' : '—'}, ${s.gender}</div></div>
      <div class="rep-row"><div class="rep-label">Exam Date:</div><div class="rep-val">${s.date}</div></div>
      <div class="rep-row"><div class="rep-label">Procedure:</div><div class="rep-val">${s.procedure}</div></div>
      <div class="rep-row"><div class="rep-label">Anesthesia:</div><div class="rep-val">${s.anesthesia}</div></div>
      <div class="rep-row" style="margin-top: 8px;">
        <div class="rep-label">Indications:</div>
        <div class="rep-val">
          ${s.indications.length > 0 ? s.indications.map(i => `<span class="rep-pill">${i}</span>`).join('') : 'None selected'}
        </div>
      </div>
    </div>

    <div class="rep-block">
      <h4>Anatomical Assessment</h4>
      <div class="rep-row"><div class="rep-label">Vocal Cord Mobility:</div><div class="rep-val">${s.vcMobility}</div></div>
      <div class="rep-row"><div class="rep-label">Airway Patency:</div><div class="rep-val">${s.airway}</div></div>
      <div style="margin-top: 10px;">
        ${s.anatomy.map(a => `<div class="rep-row"><div class="rep-label" style="font-size:0.8rem;">${a.label}:</div><div class="rep-val" style="font-size:0.8rem; color:${a.status==='Normal'?'#10b981':'#fca5a5'}">${a.status}</div></div>`).join('')}
      </div>
    </div>

    <div class="rep-block">
      <h4>Lesions & Biopsies</h4>
      ${s.lesions.length === 0 ? '<p class="rep-text" style="color:#94a3b8; font-style:italic;">No discrete lesions or biopsies recorded.</p>' : ''}
      ${s.lesions.map(l => `
        <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; margin-bottom: 8px;">
          <div style="font-weight:600; color:#e2e8f0; margin-bottom: 4px;">#${l.index} ${l.site}</div>
          <div style="font-size:0.85rem; color:#cbd5e1; margin-bottom: 6px;">
            Size: ${l.size} | Morph: ${l.morphology} ${l.leukoplakia !== 'N/A' ? `| Leuk: ${l.leukoplakia}` : ''}
          </div>
          ${l.biopsy ? `<div style="font-size:0.8rem; color:#fca5a5; background: rgba(239,68,68,0.1); padding: 4px 8px; border-radius: 4px; display:inline-block;">
            Biopsy taken with ${l.instrument || 'instrument'} (${l.samples} piece(s))
          </div>` : '<div style="font-size:0.8rem; color:#94a3b8;">No biopsy taken</div>'}
        </div>
      `).join('')}
      ${s.findings ? `<div style="margin-top: 10px;"><strong style="font-size:0.85rem; color:#94a3b8;">General Findings:</strong><div class="rep-text">${s.findings}</div></div>` : ''}
    </div>

    <div class="rep-block">
      <h4>Clinical Plan & Sign-off</h4>
      <div class="rep-row"><div class="rep-label">Assessment/Plan:</div><div class="rep-val" style="white-space:pre-wrap">${s.plan || '—'}</div></div>
      <div class="rep-row" style="margin-top: 10px;"><div class="rep-label">Clinician:</div><div class="rep-val">Dr. ${s.doctor || '—'}</div></div>
      <div class="rep-row"><div class="rep-label">Institution:</div><div class="rep-val">${s.inst || '—'}</div></div>
    </div>
  `;

  p.innerHTML = html;
}

// Generate PDF using jsPDF
function generatePDF() {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const s = getState();
    
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentW = pageW - 2 * margin;
    let y = margin;

    // Header Graphic
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 40, 'F');
    
    // Draw Logo manually
    const logoX = margin + 8;
    const logoY = 20;
    doc.setDrawColor(125, 211, 252);
    doc.setLineWidth(1.5);
    doc.circle(logoX, logoY, 6, 'S');
    doc.setFillColor(139, 92, 246);
    doc.circle(logoX, logoY, 2.5, 'F');

    const textX = margin + 22;
    doc.setFontSize(16);
    doc.setTextColor(248, 250, 252);
    doc.setFont('helvetica', 'bold');
    doc.text('FOL & Biopsy Assessment', textX, 18);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Fiberoptic Laryngoscopy Documentation Report', textX, 26);
    
    doc.setFontSize(8);
    doc.text(`Date: ${s.date}`, pageW - margin, 18, { align: 'right' });

    // Patient Info Bar
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 40, pageW, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(s.name || 'Unnamed Patient', margin, 48);
    doc.setFont('helvetica', 'normal');
    doc.text(`ID: ${s.id || '—'} | Age: ${s.age || '—'} | ${s.gender}`, margin + 60, 48);
    
    y = 60;

    // Helpers
    const sectionHeader = (title) => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, contentW, 8, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text(title, margin + 4, y + 5.5);
      y += 14;
    };

    const row = (label, val) => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(label + ':', margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      const lines = doc.splitTextToSize(val, contentW - 40);
      doc.text(lines, margin + 40, y);
      y += lines.length * 5 + 2;
    };

    // SECTION 1: Indication & Setup
    sectionHeader('1. CLINICAL BACKGROUND & PROCEDURE');
    row('Procedure Type', s.procedure);
    row('Anesthesia/Prep', s.anesthesia);
    row('Indications', s.indications.length > 0 ? s.indications.join(', ') : 'None documented');
    y += 4;

    // SECTION 2: Assessment
    sectionHeader('2. ANATOMICAL ASSESSMENT');
    row('Vocal Cord Mobility', s.vcMobility);
    row('Airway Patency', s.airway);
    
    const abn = s.anatomy.filter(a => a.status !== 'Normal');
    if (abn.length > 0) {
      row('Abnormalities Noted', abn.map(a => a.label).join(', '));
    } else {
      row('Anatomy Checked', 'All assessed structures appear normal.');
    }
    y += 4;

    // SECTION 3: Lesions
    sectionHeader('3. LESIONS & BIOPSY DETAILS');
    if (s.lesions.length === 0) {
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('No focal lesions or biopsies documented.', margin + 2, y);
      y += 8;
    } else {
      s.lesions.forEach(l => {
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(`Lesion #${l.index}: ${l.site}`, margin + 2, y);
        y += 5;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Size: ${l.size} | Morphology: ${l.morphology} | Leukoplakia: ${l.leukoplakia}`, margin + 4, y);
        y += 5;
        if (l.biopsy) {
          doc.setTextColor(153, 27, 27); // red tint
          doc.text(`[BIOPSY PERFORMED] Instrument: ${l.instrument || 'Not spec'} | Samples: ${l.samples}`, margin + 4, y);
        } else {
          doc.setTextColor(100, 116, 139);
          doc.text('No biopsy taken.', margin + 4, y);
        }
        y += 8;
      });
    }

    if (s.findings) {
      y += 2;
      row('General Findings', s.findings);
    }
    y += 4;

    // SECTION 4: Plan
    sectionHeader('4. CLINICAL PLAN');
    row('Assessment & Plan', s.plan || '—');
    
    // Sign off
    y += 15;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, margin + 60, y);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Dr. ${s.doctor || '___________________'}`, margin, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${s.inst || ''}`, margin, y + 10);

    // Save
    doc.save(`FOL_Report_${s.name.replace(/\s+/g, '_') || 'Patient'}.pdf`);
    showToast('PDF Generated Successfully!', 'success');
  } catch (err) {
    console.error(err);
    alert('Error generating PDF. Check console.');
  }
}
