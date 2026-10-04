import ExcelJS from 'exceljs';
import path from 'path';

async function generateSurveyExcel() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LibraLink Research Team';
  workbook.created = new Date();

  // -------------------------------------------------------------
  // Sheet 1: Demographic & Summary (Chapter 4 Ready Tables)
  // -------------------------------------------------------------
  const summarySheet = workbook.addWorksheet('Summary & Tables', {
    properties: { tabColor: { argb: 'FF107C41' } },
    views: [{ showGridLines: true }]
  });

  summarySheet.columns = [
    { width: 8 },  // A
    { width: 42 }, // B
    { width: 14 }, // C
    { width: 14 }, // D
    { width: 16 }, // E
    { width: 22 }, // F
    { width: 22 }  // G
  ];

  // Title
  summarySheet.mergeCells('B2:G2');
  const titleCell = summarySheet.getCell('B2');
  titleCell.value = 'LIBRALINK: SYSTEM EVALUATION SUMMARY (ISO/IEC 25010)';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B365D' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(2).height = 35;

  // Subtitle
  summarySheet.mergeCells('B3:G3');
  const subTitleCell = summarySheet.getCell('B3');
  subTitleCell.value = 'Descriptive Statistical Results (Weighted Mean & Acceptability Levels)';
  subTitleCell.font = { name: 'Calibri', size: 11, italic: true };
  subTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Scale Interpretation Guide
  summarySheet.mergeCells('B5:F5');
  const guideHeader = summarySheet.getCell('B5');
  guideHeader.value = 'Table 1: Four-Point Likert Scale and Interpretation Criteria';
  guideHeader.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1B365D' } };

  const scaleHeaders = ['Scale Weight', 'Score Interval', 'Qualitative Interpretation', 'System Acceptability Level'];
  summarySheet.getRow(6).values = ['', 'Scale Weight', 'Score Interval', 'Qualitative Interpretation', 'System Acceptability Level'];
  ['B6', 'C6', 'D6', 'E6'].forEach(cellRef => {
    const c = summarySheet.getCell(cellRef);
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const scaleData = [
    [4, '3.26 - 4.00', 'Strongly Agree', 'Highly Acceptable'],
    [3, '2.51 - 3.25', 'Agree', 'Acceptable'],
    [2, '1.76 - 2.50', 'Disagree', 'Moderately Acceptable'],
    [1, '1.00 - 1.75', 'Strongly Disagree', 'Not Acceptable']
  ];

  scaleData.forEach((row, idx) => {
    const rowNum = 7 + idx;
    summarySheet.getRow(rowNum).values = ['', row[0], row[1], row[2], row[3]];
    summarySheet.getCell(`B${rowNum}`).alignment = { horizontal: 'center' };
    summarySheet.getCell(`C${rowNum}`).alignment = { horizontal: 'center' };
    summarySheet.getCell(`D${rowNum}`).alignment = { horizontal: 'center' };
    summarySheet.getCell(`E${rowNum}`).alignment = { horizontal: 'center' };
  });

  // Table 2: Demographic Distribution
  summarySheet.mergeCells('B12:E12');
  summarySheet.getCell('B12').value = 'Table 2: Demographic Distribution of Respondents (N = 64)';
  summarySheet.getCell('B12').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1B365D' } };

  summarySheet.getRow(13).values = ['', 'Respondent Category / Level', 'Guagua National College', 'Santa Rita College', 'Total (f)', 'Percentage (%)'];
  ['B13', 'C13', 'D13', 'E13', 'F13'].forEach(ref => {
    const c = summarySheet.getCell(ref);
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const demoData = [
    ['College Students', 10, 10, '=C14+D14', '=(E14/$E$18)*100'],
    ['Senior High School Students', 10, 10, '=C15+D15', '=(E15/$E$18)*100'],
    ['Junior High School Students', 10, 10, '=C16+D16', '=(E16/$E$18)*100'],
    ['Librarians / Library Staff', 2, 2, '=C17+D17', '=(E17/$E$18)*100'],
    ['TOTAL', '=SUM(C14:C17)', '=SUM(D14:D17)', '=SUM(E14:E17)', '=SUM(F14:F17)']
  ];

  demoData.forEach((row, idx) => {
    const rowNum = 14 + idx;
    summarySheet.getRow(rowNum).values = ['', row[0], row[1], row[2], row[3], row[4]];
    const isTotal = idx === demoData.length - 1;
    ['B', 'C', 'D', 'E', 'F'].forEach(col => {
      const c = summarySheet.getCell(`${col}${rowNum}`);
      if (isTotal) {
        c.font = { bold: true };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      }
      if (col !== 'B') {
        c.alignment = { horizontal: 'center' };
        if (col === 'F') c.numFmt = '0.00"%"';
      }
    });
  });

  // Table 3: System Evaluation Results Summary
  summarySheet.mergeCells('B20:G20');
  summarySheet.getCell('B20').value = 'Table 3: Summary of ISO/IEC 25010 Quality Evaluation (Weighted Means)';
  summarySheet.getCell('B20').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1B365D' } };

  summarySheet.getRow(21).values = ['', 'Evaluation Criterion', 'Questions Count', 'Overall Weighted Mean', 'Verbal Interpretation', 'System Acceptability'];
  ['B21', 'C21', 'D21', 'E21', 'F21'].forEach(ref => {
    const c = summarySheet.getCell(ref);
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const criteriaRows = [
    ['1. Functional Suitability', '5 Items (Q1 - Q5)', "=AVERAGE('Raw Data & Calculations'!D70:H70)"],
    ['2. Usability', '4 Items (Q6 - Q9)', "=AVERAGE('Raw Data & Calculations'!I70:L70)"],
    ['3. Reliability', '3 Items (Q10 - Q12)', "=AVERAGE('Raw Data & Calculations'!M70:O70)"],
    ['4. Performance Efficiency', '3 Items (Q13 - Q15)', "=AVERAGE('Raw Data & Calculations'!P70:R70)"],
    ['5. User Satisfaction & SDG 4', '3 Items (Q16 - Q18)', "=AVERAGE('Raw Data & Calculations'!S70:U70)"],
    ['OVERALL GRAND MEAN', '18 Items Total', '=AVERAGE(D22:D26)']
  ];

  criteriaRows.forEach((r, idx) => {
    const rowNum = 22 + idx;
    const isGrand = idx === criteriaRows.length - 1;
    summarySheet.getCell(`B${rowNum}`).value = r[0];
    summarySheet.getCell(`C${rowNum}`).value = r[1];
    summarySheet.getCell(`C${rowNum}`).alignment = { horizontal: 'center' };
    
    const meanCell = summarySheet.getCell(`D${rowNum}`);
    meanCell.value = { formula: r[2].replace('=', '') };
    meanCell.numFmt = '0.00';
    meanCell.alignment = { horizontal: 'center' };

    // Formulas for interpretation
    const interpCell = summarySheet.getCell(`E${rowNum}`);
    interpCell.value = { formula: `IF(D${rowNum}>=3.26, "Strongly Agree", IF(D${rowNum}>=2.51, "Agree", IF(D${rowNum}>=1.76, "Disagree", "Strongly Disagree")))` };
    interpCell.alignment = { horizontal: 'center' };

    const acceptCell = summarySheet.getCell(`F${rowNum}`);
    acceptCell.value = { formula: `IF(D${rowNum}>=3.26, "Highly Acceptable", IF(D${rowNum}>=2.51, "Acceptable", IF(D${rowNum}>=1.76, "Moderately Acceptable", "Not Acceptable")))` };
    acceptCell.alignment = { horizontal: 'center' };

    if (isGrand) {
      ['B', 'C', 'D', 'E', 'F'].forEach(c => {
        const cell = summarySheet.getCell(`${c}${rowNum}`);
        cell.font = { bold: true, size: 11, color: { argb: 'FF0F172A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBD5E1' } };
      });
    }
  });

  // -------------------------------------------------------------
  // Sheet 2: Raw Data & Calculations (64 Respondents)
  // -------------------------------------------------------------
  const rawSheet = workbook.addWorksheet('Raw Data & Calculations', {
    properties: { tabColor: { argb: 'FF2563EB' } },
    views: [{ showGridLines: true }]
  });

  // Questions definitions
  const questions = [
    'Q1 (Search books easily)',
    'Q2 (Real-time availability check)',
    'Q3 (Partner school suggestions)',
    'Q4 (Inter-library borrow request)',
    'Q5 (Access Token generation & approval)',
    'Q6 (Intuitive clean UI navigation)',
    'Q7 (Clear text and readable labels)',
    'Q8 (Mobile & desktop responsiveness)',
    'Q9 (Easy learning curve)',
    'Q10 (Accurate transaction states)',
    'Q11 (Error prevention & validation)',
    'Q12 (Consistent data retrieval)',
    'Q13 (Fast response and loading speed)',
    'Q14 (Minimal steps to borrow)',
    'Q15 (Optimal database query time)',
    'Q16 (Overall user satisfaction)',
    'Q17 (Solves book resource scarcity)',
    'Q18 (Supports SDG 4 Quality Education)'
  ];

  const rawHeaders = ['Resp ID', 'School', 'Academic Level', ...questions];
  rawSheet.getRow(3).values = rawHeaders;
  rawSheet.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  rawSheet.getRow(3).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  rawSheet.getRow(3).height = 40;

  for (let c = 1; c <= rawHeaders.length; c++) {
    rawSheet.getColumn(c).width = c <= 3 ? 18 : 12;
    rawSheet.getCell(3, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  }

  // Pre-populate 64 respondents with realistic simulation answers (mostly 4s and 3s)
  const schools = ['Guagua National College (GNC)', 'Santa Rita College (SRC)'];
  const levels = ['College', 'Senior High School', 'Junior High School', 'Librarian / Staff'];

  let respIndex = 1;
  const sampleRows = [];

  schools.forEach(school => {
    // 10 College
    for (let i = 1; i <= 10; i++) {
      sampleRows.push({ id: `RESP-${String(respIndex++).padStart(3, '0')}`, school, level: 'College' });
    }
    // 10 SHS
    for (let i = 1; i <= 10; i++) {
      sampleRows.push({ id: `RESP-${String(respIndex++).padStart(3, '0')}`, school, level: 'Senior High School' });
    }
    // 10 JHS
    for (let i = 1; i <= 10; i++) {
      sampleRows.push({ id: `RESP-${String(respIndex++).padStart(3, '0')}`, school, level: 'Junior High School' });
    }
    // 2 Librarians
    for (let i = 1; i <= 2; i++) {
      sampleRows.push({ id: `RESP-${String(respIndex++).padStart(3, '0')}`, school, level: 'Librarian / Staff' });
    }
  });

  sampleRows.forEach((r, idx) => {
    const rowNum = 4 + idx;
    // Generate realistic positive answers (rating 3 or 4 mostly, occasional 2 for natural distribution)
    const ratings = [];
    for (let q = 0; q < 18; q++) {
      // 70% chance of 4, 25% chance of 3, 5% chance of 2
      const seed = (idx * 17 + q * 13) % 100;
      if (seed < 70) ratings.push(4);
      else if (seed < 95) ratings.push(3);
      else ratings.push(2);
    }

    rawSheet.getRow(rowNum).values = [r.id, r.school, r.level, ...ratings];
    rawSheet.getCell(`A${rowNum}`).alignment = { horizontal: 'center' };
    rawSheet.getCell(`B${rowNum}`).alignment = { horizontal: 'left' };
    rawSheet.getCell(`C${rowNum}`).alignment = { horizontal: 'center' };
    for (let c = 4; c <= 21; c++) {
      rawSheet.getCell(rowNum, c).alignment = { horizontal: 'center' };
    }
  });

  // Row 68: Mean row
  const meanRowNum = 70;
  rawSheet.getCell(`A${meanRowNum}`).value = 'WEIGHTED MEAN';
  rawSheet.getCell(`A${meanRowNum}`).font = { bold: true };
  rawSheet.mergeCells(`A${meanRowNum}:C${meanRowNum}`);
  rawSheet.getCell(`A${meanRowNum}`).alignment = { horizontal: 'center' };

  for (let c = 4; c <= 21; c++) {
    const colLetter = rawSheet.getColumn(c).letter;
    const cell = rawSheet.getCell(meanRowNum, c);
    cell.value = { formula: `AVERAGE(${colLetter}4:${colLetter}67)` };
    cell.numFmt = '0.00';
    cell.font = { bold: true, color: { argb: 'FF1B365D' } };
    cell.alignment = { horizontal: 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  }

  // Row 71: Verbal Interpretation
  const interpRowNum = 71;
  rawSheet.getCell(`A${interpRowNum}`).value = 'INTERPRETATION';
  rawSheet.getCell(`A${interpRowNum}`).font = { bold: true };
  rawSheet.mergeCells(`A${interpRowNum}:C${interpRowNum}`);
  rawSheet.getCell(`A${interpRowNum}`).alignment = { horizontal: 'center' };

  for (let c = 4; c <= 21; c++) {
    const colLetter = rawSheet.getColumn(c).letter;
    const cell = rawSheet.getCell(interpRowNum, c);
    cell.value = { formula: `IF(${colLetter}${meanRowNum}>=3.26,"Strongly Agree",IF(${colLetter}${meanRowNum}>=2.51,"Agree",IF(${colLetter}${meanRowNum}>=1.76,"Disagree","Strongly Disagree")))` };
    cell.font = { bold: true, size: 9 };
    cell.alignment = { horizontal: 'center' };
  }

  // Save Workbook
  const filePath = path.resolve('c:/xampp/htdocs/libralinkk', 'LibraLink_Survey_Evaluation_Calculator.xlsx');
  await workbook.xlsx.writeFile(filePath);
  console.log('Excel file successfully created at:', filePath);
}

generateSurveyExcel().catch(console.error);
