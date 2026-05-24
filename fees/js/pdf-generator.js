/**
 * FEES Evaluation App — PDF Report Generator
 * Uses jsPDF to produce a professional clinical report
 */

function generateFEESReport(formData) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const { suggestions, diets, findings } = generateTherapySuggestions(formData);

  // Monochrome / Grayscale logic
  const isMono = formData.summary?.monochrome;
  const theme = {
    primary: isMono ? [60, 60, 60] : [0, 150, 130],
    accent: isMono ? [100, 100, 100] : [0, 180, 160],
    accent2: isMono ? [140, 140, 140] : [0, 210, 190],
    bg: isMono ? [240, 240, 240] : [240, 248, 247],
    textDark: [30, 30, 30],
    textMedium: [70, 70, 70],
    textLight: [100, 100, 100],
    textWhite: [255, 255, 255],
    border: isMono ? [180, 180, 180] : [200, 220, 215]
  };

  const PAGE_W = 210;
  const MARGIN = 18;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let y = 0;

  /* ──────────────────────────────────────
     HELPERS
  ───────────────────────────────────────*/

  function checkPage(needed = 14) {
    if (y + needed > 275) {
      doc.addPage();
      y = 20;
      drawHeader(false);
      y += 8;
    }
  }

  function colorFromHex(hex) {
    if (!hex) return [100, 100, 100];
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  }

  function hLine(yPos, color = theme.border) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, yPos, PAGE_W - MARGIN, yPos);
  }

  function sectionTitle(text, icon = '') {
    checkPage(16);
    doc.setFillColor(...theme.primary);
    doc.roundedRect(MARGIN, y, CONTENT_W, 9, 1.5, 1.5, 'F');
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...theme.textWhite);
    const titleText = icon ? `${icon}  ${text}` : text;
    doc.text(titleText, MARGIN + 4, y + 6.2);
    doc.setTextColor(...theme.textDark);
    y += 13;
  }

  function fieldRow(label, value, mono = false) {
    checkPage(9);
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...theme.textMedium);
    doc.text(label + ':', MARGIN, y);
    doc.setFont(mono ? 'courier' : 'helvetica', 'normal');
    doc.setTextColor(20, 20, 20);
    const wrapped = doc.splitTextToSize(value || '—', CONTENT_W - 52);
    doc.text(wrapped, MARGIN + 52, y);
    y += Math.max(6, wrapped.length * 5);
  }

  function paragraph(text, indent = 0) {
    if (!text) return;
    checkPage(10);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(text, CONTENT_W - indent);
    doc.text(lines, MARGIN + indent, y);
    y += lines.length * 5 + 2;
  }

  function bulletPoint(text, color = theme.primary) {
    checkPage(8);
    doc.setFillColor(...color);
    doc.circle(MARGIN + 3, y - 1.2, 1.2, 'F');
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...theme.textDark);
    const lines = doc.splitTextToSize(text, CONTENT_W - 9);
    doc.text(lines, MARGIN + 7, y);
    y += lines.length * 4.8 + 1.5;
  }

  function priorityBadge(priority, xPos, yPos) {
    const colors = {
      CRITICAL: [200, 30, 30],
      HIGH:     [220, 100, 20],
      MODERATE: [180, 140, 0],
      LOW:      [30, 140, 80]
    };
    let c = colors[priority] || [100, 100, 100];
    if (isMono) {
      const avg = Math.round((c[0] + c[1] + c[2]) / 3);
      c = [avg, avg, avg];
    }
    doc.setFillColor(...c);
    doc.roundedRect(xPos, yPos - 4, 22, 6, 1, 1, 'F');
    doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...theme.textWhite);
    doc.text(priority, xPos + 11, yPos, { align: 'center' });
    doc.setTextColor(...theme.textDark);
  }

  /* ──────────────────────────────────────
     HEADER
  ───────────────────────────────────────*/

  function drawHeader(firstPage = true) {
    doc.setFillColor(...theme.primary);
    doc.rect(0, 0, PAGE_W, firstPage ? 38 : 14, 'F');

    if (firstPage) {
      // Embed Logo from DOM
      const logoImg = document.querySelector('.header-logo img');
      if (logoImg && logoImg.complete) {
        try {
          // Draw a small white circle/rect behind logo for contrast if needed
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(MARGIN, 6, 22, 22, 2, 2, 'F');
          doc.addImage(logoImg, 'PNG', MARGIN + 1, 7, 20, 20);
        } catch (e) {
          console.warn("Logo image could not be added to PDF:", e);
        }
      }

      const textX = logoImg ? MARGIN + 26 : MARGIN;
      
      doc.setFontSize(18); doc.setFont('helvetica', 'bold');
      doc.setTextColor(...theme.textWhite);
      doc.text('FEES Evaluation Report', textX, 16);
      doc.setFontSize(9.5); doc.setFont('helvetica', 'normal');
      doc.text('Fiberoptic Endoscopic Evaluation of Swallowing', textX, 23);

      doc.setFontSize(8.5);
      const dateStr = formData.patient?.evaluationDate || new Date().toLocaleDateString();
      doc.text(`Date: ${dateStr}    Evaluator: ${formData.patient?.evaluatorName || ''}`, textX, 30);

      if (!isMono) {
        doc.setFillColor(...theme.accent);
        doc.circle(PAGE_W - 20, 8, 18, 'F');
        doc.setFillColor(...theme.accent2);
        doc.circle(PAGE_W - 10, 25, 10, 'F');
      }

      y = 46;
    } else {
      doc.setFontSize(8); doc.setFont('helvetica', 'italic');
      doc.setTextColor(...theme.textWhite);
      doc.text('FEES Evaluation Report — Continued', MARGIN, 10);
    }
    doc.setTextColor(...theme.textDark);
  }

  /* ══════════════════════════════════════
     PAGE 1 — HEADER + PATIENT INFO
  ═══════════════════════════════════════*/

  drawHeader(true);
  sectionTitle('PATIENT INFORMATION');

  const p = formData.patient || {};
  fieldRow('Patient Name', p.name);
  fieldRow('Date of Birth', p.dob);
  fieldRow('Age', p.age ? `${p.age} years` : '—');
  fieldRow('Gender', p.gender);
  fieldRow('MRN / ID', p.mrn);
  fieldRow('Referring Physician', p.referringPhysician);
  fieldRow('Primary Diagnosis', p.primaryDiagnosis);
  fieldRow('Reason for Referral', p.reasonForReferral);
  fieldRow('Date of Evaluation', p.evaluationDate);
  fieldRow('Evaluator Name / Credentials', p.evaluatorName);
  fieldRow('Facility / Setting', p.facility);
  y += 4;

  /* ──────── Pre-Swallow Assessment ──────── */
  checkPage(20);
  sectionTitle('PRE-SWALLOW ASSESSMENT');

  const ps = formData.preSwallow || {};
  const psStartY = y;
  const colW = CONTENT_W / 2;
  
  const psFields = [
    ['Pharyngeal Symmetry', ps.pharyngealSymmetry],
    ['VF Appearance', ps.vfAppearance],
    ['VF Mobility (L)', ps.vocalFoldMobilityLeft],
    ['VF Mobility (R)', ps.vocalFoldMobilityRight],
    ['VP Closure', ps.velopharyngeal],
    ['Laryngeal Elevation', ps.laryngealElevation],
    ['Sensation', ps.sensation],
    ['BOT Retraction', ps.tongueBaseRetraction]
  ];

  psFields.forEach((field, i) => {
    const colX = (i % 2 === 0) ? MARGIN : MARGIN + colW + 4;
    const rowY = psStartY + (Math.floor(i/2) * 7);
    y = rowY;
    checkPage(8);
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...theme.textMedium);
    doc.text(field[0] + ':', colX, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(20, 20, 20);
    doc.text(field[1] || '—', colX + 42, y);
  });
  
  y += 10;
  fieldRow('Secretion Rating', ps.secretionRating ? `Rating ${ps.secretionRating}/4` : '—');
  if (ps.preSwallowNotes) {
    y += 2;
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...theme.textMedium);
    doc.text('Clinical Observations:', MARGIN, y); y += 5;
    paragraph(ps.preSwallowNotes, 4);
  }

  /* ──────── Swallow Trials ──────── */
  y += 5;
  sectionTitle('SWALLOW TRIALS');

  const trials = formData.swallowTrials || [];
  if (trials.length === 0) {
    paragraph('No specific swallow trials were recorded.');
  } else {
    trials.forEach((t, i) => {
      checkPage(35);
      doc.setFillColor(...theme.bg);
      doc.roundedRect(MARGIN, y, CONTENT_W, 30, 2, 2, 'F');
      
      doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      doc.setTextColor(...theme.primary);
      doc.text(`TRIAL ${i + 1}: ${t.consistency || '—'} (${t.volume || '—'})`, MARGIN + 4, y + 6);
      
      doc.setFontSize(8); doc.setTextColor(...theme.textDark);
      doc.text(`PAS SCORE: ${t.pasScore || '—'}`, MARGIN + CONTENT_W - 25, y + 6);
      
      doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
      const trialDetails = [
        `Swallow Initiation: ${t.swallowInitiation || '—'}`,
        `Airway Closure: ${t.airwayClosure || '—'}`,
        `Residue: ${t.residueSeverity || 'None'} ${t.residueLocations?.length ? '(' + t.residueLocations.join(', ') + ')' : ''}`
      ].join('  |  ');
      
      doc.text(trialDetails, MARGIN + 4, y + 12);
      
      if (t.trialNotes) {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5);
        const notes = doc.splitTextToSize(`Notes: ${t.trialNotes}`, CONTENT_W - 10);
        doc.text(notes, MARGIN + 4, y + 18);
      }
      y += 34;
    });
  }

  /* ──────── Findings & Recommendations ──────── */
  y += 5;
  sectionTitle('FINDINGS & RECOMMENDATIONS');

  doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...theme.textDark);
  doc.text('Dietary Recommendations:', MARGIN, y); y += 6;

  // Manual Diet Info from DetermineDiet
  if (diets.liquid) {
    checkPage(12);
    let iddsiColor = colorFromHex(diets.liquid.color || '#888888');
    if (isMono) iddsiColor = [100, 100, 100];
    doc.setFillColor(...iddsiColor);
    doc.circle(MARGIN + 4, y - 1.2, 3.5, 'F');
    doc.setFontSize(9); doc.setTextColor(...theme.textWhite);
    doc.text(String(diets.liquid.level), MARGIN + 4, y, { align: 'center' });
    doc.setTextColor(...theme.textDark); doc.setFont('helvetica', 'bold');
    doc.text('Recommended Liquid: ' + diets.liquid.name, MARGIN + 10, y);
    y += 8;
  }

  if (diets.food) {
    checkPage(12);
    let iddsiColor = colorFromHex(diets.food.color || '#888888');
    if (isMono) iddsiColor = [100, 100, 100];
    doc.setFillColor(...iddsiColor);
    doc.circle(MARGIN + 4, y - 1.2, 3.5, 'F');
    doc.setFontSize(9); doc.setTextColor(...theme.textWhite);
    doc.text(String(diets.food.level), MARGIN + 4, y, { align: 'center' });
    doc.setTextColor(...theme.textDark); doc.setFont('helvetica', 'bold');
    doc.text('Recommended Food: ' + diets.food.name, MARGIN + 10, y);
    y += 12;
  }

  y += 5;
  doc.setFontSize(9.5); doc.setFont('helvetica', 'bold');
  doc.text('Suggested Therapy Strategies:', MARGIN, y); y += 6;

  if (suggestions.length === 0) {
    paragraph('No specific compensatory strategies are indicated at this time.');
  } else {
    suggestions.forEach(s => {
      checkPage(30);
      doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      doc.setTextColor(...theme.primary);
      doc.text(`> ${s.finding}`, MARGIN, y);
      priorityBadge(s.priority, MARGIN + CONTENT_W - 22, y);
      y += 6;
      
      if (s.immediateAction) {
        doc.setFont('helvetica', 'bold'); doc.setTextColor(200, 30, 30); doc.setFontSize(8.5);
        doc.text('! ACTION: ' + s.immediateAction, MARGIN + 4, y);
        y += 6;
      }
      
      if (s.therapies?.length) {
        doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40); doc.setFontSize(8.5);
        s.therapies.forEach(ex => {
           bulletPoint(ex.name + ': ' + ex.description, theme.primary);
        });
      }
      y += 4;
    });
  }

  /* ──────── Clinical Impressions ──────── */
  y += 5;
  sectionTitle('CLINICAL IMPRESSIONS');
  paragraph(formData.summary?.clinicalImpression || 'The FEES evaluation was performed to assess pharyngeal swallowing safety and efficiency.');

  checkPage(40);
  sectionTitle('FOLLOW-UP PLAN');
  paragraph(formData.summary?.followUp || 'To be determined based on clinical progress.', 2);
  y += 15;

  /* ──────── Signature Area ──────── */
  checkPage(30);
  const sigLineW = CONTENT_W / 2 - 10;
  const sig1x = MARGIN;
  const sig2x = MARGIN + CONTENT_W / 2 + 5;

  doc.setDrawColor(...theme.textLight);
  doc.setLineWidth(0.4);
  
  // Left: Clinician
  doc.line(sig1x, y, sig1x + sigLineW, y);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...theme.textDark);
  doc.text(formData.patient?.evaluatorName || 'Evaluating Clinician', sig1x, y + 6);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...theme.textLight);
  doc.text('Speech-Language Pathologist', sig1x, y + 11);

  // Right: Date
  const dateLineX = sig2x + 12;
  doc.line(dateLineX, y, PAGE_W - MARGIN, y);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...theme.textDark);
  doc.text('Date:', sig2x, y + 6);

  /* ──────── Footer ──────── */
  const totalPages = doc.internal.getNumberOfPages();
  for (let pi = 1; pi <= totalPages; pi++) {
    doc.setPage(pi);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 160, 160);
    doc.text(`FEES Evaluation Report — Confidential Medical Document    |    Page ${pi} of ${totalPages}`, MARGIN, 291);
    doc.text(formData.patient?.name ? `Patient: ${formData.patient.name}   MRN: ${formData.patient.mrn || '—'}` : '', PAGE_W - MARGIN, 291, { align: 'right' });
    if (!isMono) {
      doc.setDrawColor(...theme.primary);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, 288, PAGE_W - MARGIN, 288);
    }
  }

  const filename = `FEES_Report_${(formData.patient?.name || 'Patient').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(filename);
}
