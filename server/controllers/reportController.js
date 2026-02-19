const PDFDocument = require('pdfkit');

// Helper function to draw a colored box
const drawBox = (doc, x, y, width, height, color) => {
  doc.rect(x, y, width, height).fill(color);
};

// Helper function to draw a compact score bar
const drawCompactScoreBar = (doc, x, y, width, score, maxWidth = 150) => {
  const barHeight = 12;
  const fillWidth = (score / 100) * maxWidth;
  
  // Background bar
  doc.rect(x, y, maxWidth, barHeight).fillAndStroke('#E5E7EB', '#D1D5DB');
  
  // Score bar with color
  let barColor = '#EF4444';
  if (score >= 80) barColor = '#10B981';
  else if (score >= 60) barColor = '#F59E0B';
  
  doc.rect(x, y, fillWidth, barHeight).fill(barColor);
  
  // Score text
  doc.fontSize(9).fillColor('#000000').font('Helvetica-Bold')
     .text(`${score}`, x + maxWidth + 5, y + 2);
};

// @desc    Generate and download PDF report (2-page compact version)
// @route   POST /api/download-report
// @access  Public
exports.downloadReport = async (req, res) => {
  try {
    const results = req.body;

    // Create a new PDF document
    const doc = new PDFDocument({ 
      margin: 30,
      size: 'A4',
      bufferPages: true
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=ats-report-${results.candidate?.name?.replace(/\s+/g, '-') || 'analysis'}.pdf`
    );

    // Pipe the PDF to the response
    doc.pipe(res);

    // ========== PAGE 1 ==========
    
    // === HEADER ===
    drawBox(doc, 0, 0, doc.page.width, 60, '#3B82F6');
    doc.fontSize(22).fillColor('#FFFFFF').font('Helvetica-Bold')
       .text('ATS RESUME ANALYSIS REPORT', 30, 15, { align: 'center' });
    doc.fontSize(9).font('Helvetica')
       .text(`Generated: ${new Date().toLocaleDateString('en-US')}`, 30, 40, { align: 'center' });
    
    doc.y = 70;

    // === CANDIDATE INFO (Compact) ===
    doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold')
       .text(results.candidate?.name || 'N/A', 30, doc.y);
    doc.fontSize(8).fillColor('#4B5563').font('Helvetica');
    const infoLine = [
      results.candidate?.email,
      results.candidate?.phone,
      results.candidate?.location
    ].filter(Boolean).join(' | ');
    doc.text(infoLine, 30, doc.y + 3);
    
    doc.y += 25;

    // === OVERALL SCORE (Left) + COMPOSITION (Right) ===
    const scoreStartY = doc.y;
    
    // Left: Big score circle
    doc.circle(80, scoreStartY + 40, 35).fillAndStroke('#F3F4F6', '#D1D5DB');
    const atsScore = results.ats_score || 0;
    let scoreColor = '#EF4444';
    if (atsScore >= 80) scoreColor = '#10B981';
    else if (atsScore >= 60) scoreColor = '#F59E0B';
    
    doc.fontSize(32).fillColor(scoreColor).font('Helvetica-Bold')
       .text(atsScore.toString(), 55, scoreStartY + 25);
    doc.fontSize(10).fillColor('#6B7280').font('Helvetica')
       .text(results.score_category || 'N/A', 45, scoreStartY + 65, { width: 70, align: 'center' });

    // Right: Score composition
    if (results.score_breakdown?.scoring_formula) {
      const formula = results.score_breakdown.scoring_formula;
      let compY = scoreStartY;
      
      doc.fontSize(9).fillColor('#1F2937').font('Helvetica-Bold')
         .text('Score Composition', 170, compY);
      compY += 15;
      
      // Resume
      doc.fontSize(8).fillColor('#000').font('Helvetica').text('Resume (60%)', 170, compY);
      drawCompactScoreBar(doc, 260, compY - 2, 150, formula.resume_score || 0, 120);
      compY += 18;
      
      // GitHub
      doc.text('GitHub', 170, compY);
      drawCompactScoreBar(doc, 260, compY - 2, 150, formula.github_score || 0, 120);
      if (formula.github_score === 0) {
        doc.fontSize(7).fillColor('#DC2626').text('[!]', 390, compY - 2);
      }
      compY += 18;
      
      // Projects
      doc.text('Projects', 170, compY);
      drawCompactScoreBar(doc, 260, compY - 2, 150, formula.project_score || 0, 120);
      if (formula.project_score === 0) {
        doc.fontSize(7).fillColor('#DC2626').text('[!]', 390, compY - 2);
      }
      compY += 18;
      
      // CP
      doc.text('CP/LeetCode', 170, compY);
      drawCompactScoreBar(doc, 260, compY - 2, 150, formula.cp_score || 0, 120);
      if (formula.cp_score === 0) {
        doc.fontSize(7).fillColor('#DC2626').text('[!]', 390, compY - 2);
      }
      compY += 18;
      
      // Proof
      doc.fontSize(8).fillColor('#000').font('Helvetica-Bold').text('Proof (40%)', 170, compY);
      drawCompactScoreBar(doc, 260, compY - 2, 150, formula.proof_score || 0, 120);
    }
    
    doc.y = scoreStartY + 95;

    // === SEMANTIC ANALYSIS (2 columns) ===
    if (results.semantic_analysis) {
      doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke('#D1D5DB');
      doc.y += 10;
      
      doc.fontSize(10).fillColor('#1F2937').font('Helvetica-Bold')
         .text('Semantic Analysis', 30, doc.y);
      doc.y += 15;
      
      const semY = doc.y;
      
      // Left column: Scores
      doc.fontSize(8).fillColor('#4338CA').font('Helvetica-Bold')
         .text('Context Match', 30, semY);
      doc.fontSize(16).fillColor('#3B82F6')
         .text(`${results.semantic_analysis.semantic_score}`, 30, semY + 12);
      
      doc.fontSize(8).fillColor('#7C3AED').font('Helvetica-Bold')
         .text('Keyword Match', 120, semY);
      doc.fontSize(16).fillColor('#8B5CF6')
         .text(`${results.semantic_analysis.keyword_score}`, 120, semY + 12);
      
      // Right column: Skills
      let skillY = semY;
      
      if (results.semantic_analysis.matched_skills?.length > 0) {
        doc.fontSize(8).fillColor('#059669').font('Helvetica-Bold')
           .text(`[+] Matched (${results.semantic_analysis.matched_skills.length})`, 220, skillY);
        doc.fontSize(7).fillColor('#047857').font('Helvetica')
           .text(results.semantic_analysis.matched_skills.slice(0, 8).join(', '), 220, skillY + 10, {
             width: 345,
             height: 20,
             ellipsis: true
           });
        skillY += 32;
      }
      
      if (results.semantic_analysis.missing_skills?.length > 0) {
        doc.fontSize(8).fillColor('#DC2626').font('Helvetica-Bold')
           .text(`[-] Missing (${results.semantic_analysis.missing_skills.length})`, 220, skillY);
        doc.fontSize(7).fillColor('#B91C1C').font('Helvetica')
           .text(results.semantic_analysis.missing_skills.slice(0, 8).join(', '), 220, skillY + 10, {
             width: 345,
             height: 20,
             ellipsis: true
           });
      }
      
      doc.y = semY + 45;
    }

    // === SKILLS & DOMAIN (2 columns) ===
    doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke('#D1D5DB');
    doc.y += 10;
    
    const detailsY = doc.y;
    
    // Left: Domain
    if (results.domain) {
      doc.fontSize(10).fillColor('#1F2937').font('Helvetica-Bold')
         .text('Domain', 30, detailsY);
      doc.fontSize(9).fillColor('#78350F').font('Helvetica')
         .text(results.domain.primary || 'N/A', 30, detailsY + 15);
      doc.fontSize(7).fillColor('#92400E')
         .text(`${results.domain.confidence}% confidence`, 30, detailsY + 28);
    }
    
    // Right: Skills Summary
    if (results.skills) {
      doc.fontSize(10).fillColor('#1F2937').font('Helvetica-Bold')
         .text('Skills Summary', 220, detailsY);
      
      let skillText = '';
      if (results.skills.programming_languages?.length > 0) {
        skillText += 'LANG: ' + results.skills.programming_languages.slice(0, 6).join(', ');
      }
      if (results.skills.frameworks?.length > 0) {
        if (skillText) skillText += ' | ';
        skillText += 'TOOLS: ' + results.skills.frameworks.slice(0, 6).join(', ');
      }
      
      doc.fontSize(7).fillColor('#1F2937').font('Helvetica')
         .text(skillText, 220, detailsY + 15, {
           width: 345,
           height: 30,
           ellipsis: true
         });
    }
    
    doc.y = detailsY + 50;

    // === PROFILE ANALYSIS (GitHub + CP) ===
    if (results.github_report || results.cp_report) {
      doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke('#D1D5DB');
      doc.y += 10;
      
      const profileY = doc.y;
      
      // Left: GitHub
      if (results.github_report) {
        doc.fontSize(10).fillColor('#1F2937').font('Helvetica-Bold')
           .text('GitHub Portfolio', 30, profileY);
        doc.fontSize(14).fillColor('#3B82F6')
           .text(`${results.github_report.overall_score}/100`, 30, profileY + 15);
        doc.fontSize(7).fillColor('#6B7280').font('Helvetica')
           .text(`Grade: ${results.github_report.grade || 'N/A'}`, 30, profileY + 32);
        
        if (results.github_report.good_repos?.length > 0) {
          doc.fontSize(7).fillColor('#10B981')
             .text(`${results.github_report.good_repos.length} quality repos`, 30, profileY + 42);
        }
      }
      
      // Right: CP
      if (results.cp_report) {
        doc.fontSize(10).fillColor('#1F2937').font('Helvetica-Bold')
           .text('Competitive Programming', 220, profileY);
        doc.fontSize(14).fillColor('#F59E0B')
           .text(`${results.cp_report.overall_score}/100`, 220, profileY + 15);
        
        if (results.cp_report.platform_data?.leetcode) {
          const lc = results.cp_report.platform_data.leetcode;
          doc.fontSize(7).fillColor('#6B7280').font('Helvetica')
             .text(`${lc.total_solved || 0} problems solved`, 220, profileY + 32);
          doc.text(`E:${lc.easy_solved || 0} M:${lc.medium_solved || 0} H:${lc.hard_solved || 0}`, 220, profileY + 42);
        }
      }
      
      doc.y = profileY + 60;
    }

    // === ISSUES (Compact List) ===
    if (results.issues?.length > 0) {
      doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke('#D1D5DB');
      doc.y += 10;
      
      doc.fontSize(10).fillColor('#DC2626').font('Helvetica-Bold')
         .text(`[!] Issues Detected (${results.issues.length})`, 30, doc.y);
      doc.y += 15;
      
      results.issues.slice(0, 5).forEach((issue, index) => {
        const severity = issue.severity === 'high' ? '[HIGH]' : issue.severity === 'medium' ? '[MED]' : '[LOW]';
        const issueText = issue.type || issue.description || 'Issue';
        doc.fontSize(7).fillColor('#1F2937').font('Helvetica')
           .text(`${severity} ${issueText}`, 30, doc.y, {
             width: 535,
             ellipsis: true
           });
        doc.y += 12;
      });
    }

    // ========== PAGE 2 ==========
    doc.addPage();
    doc.y = 30;

    // === SUGGESTIONS ===
    doc.fontSize(12).fillColor('#1F2937').font('Helvetica-Bold')
       .text('IMPROVEMENT SUGGESTIONS', 30, doc.y);
    doc.y += 20;
    
    if (results.suggestions?.length > 0) {
      results.suggestions.slice(0, 15).forEach((suggestion, index) => {
        if (doc.y > 750) return; // Prevent overflow
        
        const suggestionText = typeof suggestion === 'string' ? suggestion : suggestion.suggestion;
        const priority = typeof suggestion === 'object' ? suggestion.priority : 'Medium';
        const priorityColor = priority === 'High' ? '#DC2626' : priority === 'Medium' ? '#F59E0B' : '#10B981';
        
        // Number circle
        doc.circle(38, doc.y + 5, 6).fillAndStroke(priorityColor, priorityColor);
        doc.fontSize(7).fillColor('#FFFFFF').font('Helvetica-Bold')
           .text((index + 1).toString(), 35, doc.y + 2);
        
        // Suggestion text
        doc.fontSize(8).fillColor('#1F2937').font('Helvetica')
           .text(suggestionText, 52, doc.y, {
             width: 513,
             ellipsis: true
           });
        
        doc.y += 20;
      });
    } else {
      doc.fontSize(9).fillColor('#6B7280').font('Helvetica')
         .text('No specific suggestions available. Keep improving your resume!', 30, doc.y);
    }

    // === DETAILED SCORE BREAKDOWN ===
    if (doc.y < 500) {
      doc.moveTo(30, doc.y + 10).lineTo(565, doc.y + 10).stroke('#D1D5DB');
      doc.y += 20;
      
      doc.fontSize(12).fillColor('#1F2937').font('Helvetica-Bold')
         .text('DETAILED METRICS', 30, doc.y);
      doc.y += 20;
      
      if (results.score_breakdown) {
        const breakdown = Object.entries(results.score_breakdown)
          .filter(([key, value]) => key !== 'scoring_formula' && typeof value === 'number')
          .slice(0, 10);
        
        const colWidth = 270;
        let leftY = doc.y;
        let rightY = doc.y;
        
        breakdown.forEach(([key, value], index) => {
          const isLeft = index % 2 === 0;
          const x = isLeft ? 30 : 305;
          const currentY = isLeft ? leftY : rightY;
          
          if (currentY > 750) return;
          
          doc.fontSize(8).fillColor('#4B5563').font('Helvetica')
             .text(key.replace(/_/g, ' ').toUpperCase(), x, currentY);
          drawCompactScoreBar(doc, x + 120, currentY - 2, 120, value, 100);
          
          if (isLeft) leftY += 18;
          else rightY += 18;
        });
        
        doc.y = Math.max(leftY, rightY);
      }
    }

    // === PROFESSIONAL FOOTER ===
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Footer line
      doc.moveTo(50, doc.page.height - 50)
         .lineTo(doc.page.width - 50, doc.page.height - 50)
         .stroke('#D1D5DB');
      
      // Footer text
      doc.fontSize(8).fillColor('#6B7280').font('Helvetica')
         .text(`ATSMaster Professional Report`, 50, doc.page.height - 40, { 
           width: doc.page.width / 2 - 50,
           align: 'left' 
         });
      
      doc.text(`Page ${i + 1} of ${pageCount}`, doc.page.width / 2, doc.page.height - 40, { 
           width: doc.page.width / 2 - 50,
           align: 'right' 
         });
    }

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF report',
      error: error.message
    });
  }
};
