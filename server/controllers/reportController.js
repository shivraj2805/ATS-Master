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

    // === LEVEL 1: FINAL ATS SCORE (Big Number) ===
    const scoreStartY = doc.y;
    
    // Large score box
    doc.rect(30, scoreStartY, 535, 85).fillAndStroke('#F9FAFB', '#E5E7EB');
    
    // "FINAL ATS SCORE" label
    doc.fontSize(11).fillColor('#6B7280').font('Helvetica-Bold')
       .text('FINAL ATS SCORE', 40, scoreStartY + 15);
    
    const atsScore = results.ats_score || 0;
    let scoreColor = '#EF4444';
    let credibilityLevel = 'NEEDS IMPROVEMENT';
    if (atsScore >= 80) {
      scoreColor = '#10B981';
      credibilityLevel = 'EXCELLENT';
    } else if (atsScore >= 60) {
      scoreColor = '#F59E0B';
      credibilityLevel = 'GOOD';
    }
    
    // Big score number
    doc.fontSize(48).fillColor(scoreColor).font('Helvetica-Bold')
       .text(atsScore.toString(), 40, scoreStartY + 30);
    
    doc.fontSize(10).fillColor('#6B7280').font('Helvetica')
       .text('/ 100', 95, scoreStartY + 55);
    
    // Category badge
    doc.fontSize(12).fillColor(scoreColor).font('Helvetica-Bold')
       .text(credibilityLevel, 140, scoreStartY + 45);
    
    // Credibility badge (if projects verified)
    if (results.project_verification?.summary?.verification_rate >= 100) {
      doc.fontSize(8).fillColor('#10B981').font('Helvetica-Bold')
         .text('✓ HIGH CREDIBILITY', 380, scoreStartY + 20);
      doc.fontSize(7).fillColor('#059669').font('Helvetica')
         .text('All projects verified on GitHub', 380, scoreStartY + 32);
    }
    
    doc.y = scoreStartY + 95;

    // === LEVEL 2: MAIN COMPONENTS (Two Cards) ===
    const cardsY = doc.y;
    
    // Left Card: Resume Match
    doc.rect(30, cardsY, 260, 75).fillAndStroke('#EEF2FF', '#C7D2FE');
    doc.fontSize(9).fillColor('#4338CA').font('Helvetica-Bold')
       .text('Resume Match (60%)', 40, cardsY + 12);
    
    const resumeScore = results.score_breakdown?.scoring_formula?.resume_score || atsScore;
    doc.fontSize(32).fillColor('#3B82F6').font('Helvetica-Bold')
       .text(resumeScore.toString(), 40, cardsY + 30);
    doc.fontSize(9).fillColor('#6366F1').font('Helvetica')
       .text('Content & keyword alignment', 40, cardsY + 60);
    
    // Right Card: Proof & Credibility
    doc.rect(305, cardsY, 260, 75).fillAndStroke('#F0FDF4', '#BBF7D0');
    doc.fontSize(9).fillColor('#065F46').font('Helvetica-Bold')
       .text('Proof & Credibility (40%)', 315, cardsY + 12);
    
    const proofScore = results.score_breakdown?.scoring_formula?.proof_score || 0;
    doc.fontSize(32).fillColor('#10B981').font('Helvetica-Bold')
       .text(proofScore.toString(), 315, cardsY + 30);
    doc.fontSize(9).fillColor('#059669').font('Helvetica')
       .text('GitHub + Projects + CP', 315, cardsY + 60);
    
    doc.y = cardsY + 85;

    // === LEVEL 3: PROOF BREAKDOWN ===
    if (results.score_breakdown?.scoring_formula) {
      doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke('#D1D5DB');
      doc.y += 10;
      
      doc.fontSize(10).fillColor('#1F2937').font('Helvetica-Bold')
         .text('Proof Score Breakdown (40% of Final)', 30, doc.y);
      doc.y += 15;
      
      const formula = results.score_breakdown.scoring_formula;
      const proofY = doc.y;
      
      // GitHub Profile Link vs Portfolio
      const githubScore = formula.github_score || 0;
      const githubMissing = formula.missing_profiles?.github;
      
      // GitHub Profile Link
      doc.fontSize(8).fillColor('#4B5563').font('Helvetica')
         .text('├─ GitHub Profile Link', 30, proofY);
      if (githubMissing) {
        doc.fontSize(8).fillColor('#DC2626').font('Helvetica-Bold')
           .text('❌ Missing (0 impact)', 180, proofY);
        doc.fontSize(7).fillColor('#6B7280').font('Helvetica-Oblique')
           .text('Add profile URL to unlock GitHub score', 180, proofY + 10);
      } else {
        doc.fontSize(8).fillColor('#10B981').font('Helvetica-Bold')
           .text(`✓ ${githubScore}`, 180, proofY);
      }
      
      // Project Verification
      const projectScore = formula.project_score || 0;
      const projectMissing = formula.missing_profiles?.projects;
      doc.fontSize(8).fillColor('#4B5563').font('Helvetica')
         .text('├─ Project Verification', 30, proofY + 25);
      if (projectMissing || projectScore === 0) {
        doc.fontSize(8).fillColor('#DC2626').font('Helvetica-Bold')
           .text('❌ No Projects', 180, proofY + 25);
      } else if (projectScore >= 75) {
        doc.fontSize(8).fillColor('#10B981').font('Helvetica-Bold')
           .text(`✓ ${projectScore} — Strong`, 180, proofY + 25);
      } else if (projectScore >= 50) {
        doc.fontSize(8).fillColor('#F59E0B').font('Helvetica-Bold')
           .text(`⚠ ${projectScore} — Moderate`, 180, proofY + 25);
      } else {
        doc.fontSize(8).fillColor('#DC2626').font('Helvetica-Bold')
           .text(`✗ ${projectScore} — Weak`, 180, proofY + 25);
      }
      
      // CP / LeetCode
      const cpScore = formula.cp_score || 0;
      const cpMissing = formula.missing_profiles?.competitive_programming;
      doc.fontSize(8).fillColor('#4B5563').font('Helvetica')
         .text('└─ CP / LeetCode', 30, proofY + 50);
      if (cpMissing || cpScore === 0) {
        doc.fontSize(8).fillColor('#DC2626').font('Helvetica-Bold')
           .text('❌ Missing', 180, proofY + 50);
      } else if (cpScore >= 75) {
        doc.fontSize(8).fillColor('#10B981').font('Helvetica-Bold')
           .text(`✓ ${cpScore} — Strong`, 180, proofY + 50);
      } else {
        doc.fontSize(8).fillColor('#F59E0B').font('Helvetica-Bold')
           .text(`⚠ ${cpScore}`, 180, proofY + 50);
      }
      
      doc.y = proofY + 65;
    }

    // === SEMANTIC ANALYSIS (Enhanced with Explanations) ===
    if (results.semantic_analysis) {
      doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke('#D1D5DB');
      doc.y += 10;
      
      doc.fontSize(10).fillColor('#1F2937').font('Helvetica-Bold')
         .text('Resume Analysis', 30, doc.y);
      doc.y += 15;
      
      const semY = doc.y;
      
      // Semantic Match
      doc.fontSize(8).fillColor('#4338CA').font('Helvetica-Bold')
         .text('Semantic Match', 30, semY);
      doc.fontSize(16).fillColor('#3B82F6')
         .text(`${results.semantic_analysis.semantic_score}`, 30, semY + 12);
      doc.fontSize(7).fillColor('#6366F1').font('Helvetica-Oblique')
         .text('→ Contextually aligned with role', 30, semY + 30);
      
      // Keyword Match
      doc.fontSize(8).fillColor('#7C3AED').font('Helvetica-Bold')
         .text('Keyword Match', 120, semY);
      doc.fontSize(16).fillColor('#8B5CF6')
         .text(`${results.semantic_analysis.keyword_score}`, 120, semY + 12);
      doc.fontSize(7).fillColor('#A78BFA').font('Helvetica-Oblique')
         .text('→ Required keywords detected', 120, semY + 30);
      
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

    // === PROFILE ANALYSIS (Enhanced) ===
    if (results.github_report || results.cp_report) {
      doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke('#D1D5DB');
      doc.y += 10;
      
      const profileY = doc.y;
      
      // Left: GitHub (Split into Link Status + Portfolio Score)
      if (results.github_report) {
        doc.fontSize(10).fillColor('#1F2937').font('Helvetica-Bold')
           .text('GitHub Analysis', 30, profileY);
        doc.y += 15;
        
        // GitHub Profile Link Status
        const githubLinked = !(results.score_breakdown?.scoring_formula?.missing_profiles?.github);
        doc.fontSize(8).fillColor('#4B5563').font('Helvetica')
           .text('Profile Link:', 30, profileY + 20);
        if (githubLinked) {
          doc.fontSize(8).fillColor('#10B981').font('Helvetica-Bold')
             .text('✓ Connected', 95, profileY + 20);
        } else {
          doc.fontSize(8).fillColor('#9CA3AF').font('Helvetica-Bold')
             .text('❌ Not Provided', 95, profileY + 20);
          doc.fontSize(7).fillColor('#6B7280').font('Helvetica-Oblique')
             .text('(Repositories analyzed via projects)', 95, profileY + 30);
        }
        
        // GitHub Portfolio Score
        doc.fontSize(8).fillColor('#4B5563').font('Helvetica')
           .text('Portfolio Score:', 30, profileY + 45);
        doc.fontSize(14).fillColor('#3B82F6').font('Helvetica-Bold')
           .text(`${results.github_report.overall_score}/100`, 115, profileY + 42);
        doc.fontSize(7).fillColor('#6B7280').font('Helvetica')
           .text(`Grade: ${results.github_report.grade || 'N/A'}`, 30, profileY + 60);
        
        if (results.github_report.good_repos?.length > 0) {
          doc.fontSize(7).fillColor('#10B981')
             .text(`${results.github_report.good_repos.length} quality repositories`, 30, profileY + 70);
        }
      }
      
      // Right: CP (Enhanced with Context)
      if (results.cp_report) {
        doc.fontSize(10).fillColor('#1F2937').font('Helvetica-Bold')
           .text('Competitive Programming', 290, profileY);
        doc.fontSize(14).fillColor('#F59E0B')
           .text(`${results.cp_report.overall_score}/100`, 290, profileY + 15);
        
        doc.fontSize(7).fillColor('#6B7280').font('Helvetica')
           .text('Score based on:', 290, profileY + 32);
        
        const hasLeetcodeData = results.cp_report.platform_data?.leetcode;
        const totalSolved = hasLeetcodeData?.total_solved || 0;
        
        if (totalSolved > 0) {
          doc.fontSize(7).fillColor('#059669').font('Helvetica')
             .text('✓ Profile presence', 290, profileY + 42);
          doc.fontSize(7).fillColor('#6B7280').font('Helvetica')
             .text(`${totalSolved} problems solved`, 290, profileY + 52);
          doc.text(`E:${hasLeetcodeData.easy_solved || 0} M:${hasLeetcodeData.medium_solved || 0} H:${hasLeetcodeData.hard_solved || 0}`, 290, profileY + 62);
        } else {
          doc.fontSize(7).fillColor('#059669').font('Helvetica')
             .text('✓ Profile presence', 290, profileY + 42);
          doc.fontSize(7).fillColor('#F59E0B').font('Helvetica')
             .text('⚠ Problem breakdown unavailable', 290, profileY + 52);
          doc.fontSize(7).fillColor('#6B7280').font('Helvetica-Oblique')
             .text('Score based on activity signals', 290, profileY + 62);
        }
      }
      
      doc.y = profileY + 85;
    }

    // === PROJECT VERIFICATION — ENHANCED ===
    if (results.project_verification) {
      doc.moveTo(30, doc.y).lineTo(565, doc.y).stroke('#D1D5DB');
      doc.y += 10;
      
      const pv = results.project_verification;
      const pvY = doc.y;
      
      // Header with Badge
      doc.fontSize(11).fillColor('#1F2937').font('Helvetica-Bold')
         .text('PROJECT VERIFICATION', 30, pvY);
      
      // Overall Score Card
      if (pv.summary) {
        const summary = pv.summary;
        const projectScore = results.score_breakdown?.scoring_formula?.project_score || 0;
        
        // Status Badge
        let statusText = 'NEEDS IMPROVEMENT';
        let badgeColor = '#DC2626';
        if (summary.verification_rate >= 100 && projectScore >= 75) {
          statusText = 'EXCELLENT';
          badgeColor = '#10B981';
        } else if (summary.verification_rate >= 70) {
          statusText = 'STRONG';
          badgeColor = '#10B981';
        } else if (summary.verification_rate >= 50) {
          statusText = 'MODERATE';
          badgeColor = '#F59E0B';
        }
        
        doc.fontSize(9).fillColor(badgeColor).font('Helvetica-Bold')
           .text(`— ${statusText}`, 180, pvY + 2);
        
        doc.y = pvY + 20;
        
        // Main Score Box
        doc.rect(30, doc.y, 535, 55).fillAndStroke('#F0FDF4', '#BBF7D0');
        
        // Project Score
        doc.fontSize(28).fillColor('#10B981').font('Helvetica-Bold')
           .text(`${projectScore}`, 40, doc.y + 12);
        doc.fontSize(9).fillColor('#059669').font('Helvetica')
           .text('/ 100', 75, doc.y + 30);
        
        // Verification Status
        doc.fontSize(9).fillColor('#065F46').font('Helvetica-Bold')
           .text(`✓ ${summary.verification_rate}% Projects Verified`, 130, doc.y + 12);
        doc.fontSize(8).fillColor('#059669').font('Helvetica')
           .text(`✓ ${summary.found} Found  •  ${summary.maybe} Maybe  •  ${summary.not_found} Missing`, 130, doc.y + 25);
        if (summary.verification_rate >= 100) {
          doc.fontSize(7).fillColor('#047857').font('Helvetica-Oblique')
             .text('All claimed projects publicly verified on GitHub', 130, doc.y + 38);
        }
        
        // Calculate scores for display
        const T = summary.total_projects;
        const F = summary.found;
        const M = summary.maybe;
        const N = summary.not_found;
        
        let avgQuality = 0;
        let totalWeightedQuality = 0;
        let totalWeight = 0;
        
        if (pv.results) {
          pv.results.forEach(result => {
            if (result.quality && result.quality.score) {
              const quality = result.quality.score;
              let weight = 0;
              if (result.present === 'FOUND') weight = 1;
              else if (result.present === 'MAYBE') weight = 0.5;
              if (weight > 0) {
                totalWeightedQuality += quality * weight;
                totalWeight += weight;
              }
            }
          });
        }
        avgQuality = totalWeight > 0 ? Math.round(totalWeightedQuality / totalWeight) : 0;
        
        const baseScore = Math.round(0.70 * summary.verification_rate + 0.30 * avgQuality);
        const alpha = 1.2;
        const missingRatio = T > 0 ? N / T : 0;
        const credibility = Math.exp(-alpha * missingRatio);
        
        // Mini metrics
        const cardX = 390;
        doc.fontSize(7).fillColor('#065F46').font('Helvetica')
           .text('Quality:', cardX, doc.y + 12);
        doc.fontSize(11).fillColor('#10B981').font('Helvetica-Bold')
           .text(`${avgQuality}`, cardX, doc.y + 21);
        
        doc.fontSize(7).fillColor('#065F46').font('Helvetica')
           .text('Credibility:', cardX + 80, doc.y + 12);
        doc.fontSize(11).fillColor(credibility >= 0.9 ? '#10B981' : '#F59E0B').font('Helvetica-Bold')
           .text(`×${credibility.toFixed(2)}`, cardX + 80, doc.y + 21);
        
        doc.y += 65;
      }
      
      // Individual Project Quality Breakdown
      doc.fontSize(8).fillColor('#065F46').font('Helvetica-Bold')
         .text('Project Quality Breakdown:', 40, doc.y);
      doc.y += 12;
      
      // Show top projects with quality scores
      if (pv.results && pv.results.length > 0) {
        const displayProjects = pv.results.slice(0, 5);
        
        displayProjects.forEach((project, index) => {
          if (doc.y > 680) return; // Prevent overflow
          
          // Status badge
          let statusIcon = '✗';
          let statusColor = '#EF4444';
          let bgColor = '#FEE2E2';
          
          if (project.present === 'FOUND') {
            statusIcon = '✓';
            statusColor = '#10B981';
            bgColor = '#D1FAE5';
          } else if (project.present === 'MAYBE') {
            statusIcon = '?';
            statusColor = '#F59E0B';
            bgColor = '#FEF3C7';
          }
          
          // Project row background
          doc.rect(40, doc.y - 2, 515, 16).fill(bgColor);
          
          // Status icon
          doc.fontSize(10).fillColor(statusColor).font('Helvetica-Bold')
             .text(statusIcon, 45, doc.y);
          
          // Project name (truncate if too long)
          const projectName = project.project_name || 'Unknown';
          const displayName = projectName.length > 45 ? projectName.substring(0, 42) + '...' : projectName;
          doc.fontSize(8).fillColor('#1F2937').font('Helvetica')
             .text(displayName, 60, doc.y);
          
          // Quality score (if available)
          if (project.quality && project.quality.score !== undefined) {
            const qScore = project.quality.score;
            const qColor = qScore >= 70 ? '#10B981' : qScore >= 50 ? '#F59E0B' : '#9CA3AF';
            doc.fontSize(8).fillColor(qColor).font('Helvetica-Bold')
               .text(`Q: ${qScore}`, 480, doc.y);
          }
          
          // Verification note (if available)
          if (project.present === 'FOUND' && project.verification_notes) {
            doc.fontSize(6).fillColor('#6B7280').font('Helvetica-Oblique')
               .text(project.verification_notes.substring(0, 80), 60, doc.y + 10);
            doc.y += 8;
          }
          
          doc.y += 20;
        });
        
        // Show count if more projects exist
        if (pv.results.length > 5) {
          doc.fontSize(7).fillColor('#6B7280').font('Helvetica-Oblique')
             .text(`... and ${pv.results.length - 5} more projects`, 45, doc.y);
          doc.y += 10;
        }
      }
      
      doc.y += 5;
    }

    // ========== PAGE 2 ==========
    doc.addPage();
    doc.y = 30;

    // === MISSING PROFILES — ACTIONABLE CTA ===
    if (results.score_breakdown?.scoring_formula?.missing_profiles) {
      const missing = results.score_breakdown.scoring_formula.missing_profiles;
      const hasMissing = missing.github || missing.projects || missing.competitive_programming;
      
      if (hasMissing) {
        doc.moveTo(30, doc.y + 10).lineTo(565, doc.y + 10).stroke('#FED7AA');
        doc.y += 20;
        
        // Warning CTA Box
        doc.rect(30, doc.y, 535, 95).fillAndStroke('#FEF3C7', '#F59E0B');
        doc.y += 15;
        
        doc.fontSize(12).fillColor('#92400E').font('Helvetica-Bold')
           .text('⚠ BOOST YOUR SCORE', 45, doc.y);
        doc.y += 20;
        
        // Calculate potential score improvement
        const currentProof = results.score_breakdown?.scoring_formula?.proof_score || 0;
        const finalAts = results.score_breakdown?.final_ats_score || 0;
        
        // Estimate what score could be if missing profiles were added (rough calculation)
        let potentialGain = 0;
        if (missing.github) potentialGain += 12; // 30% of 40% = 12% of final
        if (missing.projects) potentialGain += 16; // 40% of 40% = 16% of final
        if (missing.competitive_programming) potentialGain += 12; // 30% of 40% = 12% of final
        
        const potentialScore = Math.min(100, Math.round(finalAts + potentialGain));
        
        doc.fontSize(9).fillColor('#78350F').font('Helvetica')
           .text(`Adding missing profiles could increase your score by up to ${potentialGain} points → `, 45, doc.y);
        doc.fontSize(10).fillColor('#92400E').font('Helvetica-Bold')
           .text(`${potentialScore}/100`, 395, doc.y);
        doc.y += 18;
        
        // Missing items with checkboxes
        doc.fontSize(9).fillColor('#92400E').font('Helvetica-Bold')
           .text('Complete these to maximize your ATS rating:', 45, doc.y);
        doc.y += 14;
        
        if (missing.github) {
          doc.fontSize(8).fillColor('#78350F').font('Helvetica')
             .text('☐  Add GitHub profile link (username + portfolio score)', 55, doc.y);
          doc.y += 12;
        }
        if (missing.projects) {
          doc.fontSize(8).fillColor('#78350F').font('Helvetica')
             .text('☐  List GitHub projects for verification (strongest impact: +16%)', 55, doc.y);
          doc.y += 12;
        }
        if (missing.competitive_programming) {
          doc.fontSize(8).fillColor('#78350F').font('Helvetica')
             .text('☐  Add CodeChef/Codeforces/LeetCode profile', 55, doc.y);
          doc.y += 12;
        }
        
        doc.y += 8;
      }
    }

    // === SCORING FORMULA — VISUAL FLOW ===
    if (doc.y < 500) {
      doc.moveTo(30, doc.y + 10).lineTo(565, doc.y + 10).stroke('#D1D5DB');
      doc.y += 20;
      
      doc.fontSize(12).fillColor('#1F2937').font('Helvetica-Bold')
         .text('HOW YOUR SCORE IS CALCULATED', 30, doc.y);
      doc.y += 20;
      
      // Scoring Formula Flow Diagram
      if (results.score_breakdown?.scoring_formula) {
        const formula = results.score_breakdown.scoring_formula;
        
        // Step 1: Component Scores in Cards
        doc.fontSize(8).fillColor('#6B7280').font('Helvetica')
           .text('Step 1: Individual Components', 30, doc.y);
        doc.y += 14;
        
        const components = [
          { label: 'Resume\nMatch', value: formula.resume_score, color: '#3B82F6', bgColor: '#DBEAFE' },
          { label: 'GitHub\nProfile', value: formula.github_score, color: '#10B981', bgColor: '#D1FAE5' },
          { label: 'Project\nVerif.', value: formula.project_score, color: '#8B5CF6', bgColor: '#E9D5FF' },
          { label: 'Comp.\nProg.', value: formula.cp_score, color: '#F59E0B', bgColor: '#FEF3C7' }
        ];
        
        const cardWidth = 125;
        const startX = 35;
        
        components.forEach((comp, index) => {
          const x = startX + (index * cardWidth);
          
          // Card
          doc.rect(x, doc.y, 115, 50).fillAndStroke(comp.bgColor, comp.color);
          
          // Label
          doc.fontSize(7).fillColor(comp.color).font('Helvetica-Bold')
             .text(comp.label, x + 5, doc.y + 5, { width: 105, align: 'center' });
          
          // Score
          doc.fontSize(16).fillColor(comp.color).font('Helvetica-Bold')
             .text(`${comp.value || 0}`, x + 5, doc.y + 25, { width: 105, align: 'center' });
        });
        
        doc.y += 60;
        
        // Step 2: Proof Score Calculation
        doc.fontSize(8).fillColor('#6B7280').font('Helvetica')
           .text('Step 2: Calculate Proof Score', 30, doc.y);
        doc.y += 14;
        
        // Formula box
        doc.rect(35, doc.y, 520, 35).fillAndStroke('#FDF4FF', '#D8B4FE');
        doc.y += 10;
        
        doc.fontSize(9).fillColor('#7C3AED').font('Helvetica')
           .text('Proof Score = ', 45, doc.y);
        doc.fontSize(8).fillColor('#10B981').font('Helvetica-Bold')
           .text(`30% × ${formula.github_score}`, 130, doc.y + 1);
        doc.fontSize(8).fillColor('#7C3AED').font('Helvetica')
           .text(' + ', 220, doc.y + 1);
        doc.fontSize(8).fillColor('#8B5CF6').font('Helvetica-Bold')
           .text(`40% × ${formula.project_score}`, 245, doc.y + 1);
        doc.fontSize(8).fillColor('#7C3AED').font('Helvetica')
           .text(' + ', 340, doc.y + 1);
        doc.fontSize(8).fillColor('#F59E0B').font('Helvetica-Bold')
           .text(`30% × ${formula.cp_score}`, 365, doc.y + 1);
        doc.fontSize(9).fillColor('#A855F7').font('Helvetica-Bold')
           .text(` = ${formula.proof_score}`, 455, doc.y);
        
        doc.y += 30;
        
        // Step 3: Final ATS Score
        doc.fontSize(8).fillColor('#6B7280').font('Helvetica')
           .text('Step 3: Combine with Resume Score', 30, doc.y);
        doc.y += 14;
        
        // Final formula box
        doc.rect(35, doc.y, 520, 35).fillAndStroke('#EFF6FF', '#BAE6FD');
        doc.y += 10;
        
        doc.fontSize(9).fillColor('#1E40AF').font('Helvetica-Bold')
           .text('Final ATS = ', 45, doc.y);
        doc.fontSize(8).fillColor('#3B82F6').font('Helvetica-Bold')
           .text(`60% × ${formula.resume_score}`, 120, doc.y + 1);
        doc.fontSize(8).fillColor('#1E40AF').font('Helvetica')
           .text(' + ', 205, doc.y + 1);
        doc.fontSize(8).fillColor('#A855F7').font('Helvetica-Bold')
           .text(`40% × ${formula.proof_score}`, 230, doc.y + 1);
        doc.fontSize(12).fillColor('#1E40AF').font('Helvetica-Bold')
           .text(` = ${results.score_breakdown.final_ats_score}`, 320, doc.y - 2);
        
        doc.y += 40;
        
        // Weight Distribution Visual
        doc.fontSize(8).fillColor('#6B7280').font('Helvetica')
           .text('Overall Weight Distribution:', 30, doc.y);
        doc.y += 12;
        
        // Resume bar (60%)
        const barY = doc.y;
        doc.rect(35, barY, 312, 18).fill('#3B82F6');
        doc.fontSize(8).fillColor('#FFFFFF').font('Helvetica-Bold')
           .text('Resume Match — 60%', 45, barY + 5);
        
        // Proof components (40% total)
        doc.rect(352, barY, 62, 18).fill('#10B981');
        doc.fontSize(7).fillColor('#FFFFFF').font('Helvetica-Bold')
           .text('Git 12%', 356, barY + 5);
        
        doc.rect(419, barY, 83, 18).fill('#8B5CF6');
        doc.fontSize(7).fillColor('#FFFFFF').font('Helvetica-Bold')
           .text('Projects 16%', 423, barY + 5);
        
        doc.rect(507, barY, 62, 18).fill('#F59E0B');
        doc.fontSize(7).fillColor('#FFFFFF').font('Helvetica-Bold')
           .text('CP 12%', 511, barY + 5);
        
        doc.y += 25;
      }
      
      doc.y += 10;
    }

    // === KEY INSIGHTS & RECOMMENDATIONS ===
    if (doc.y < 620 && results.score_breakdown?.scoring_formula) {
      doc.moveTo(30, doc.y + 10).lineTo(565, doc.y + 10).stroke('#D1D5DB');
      doc.y += 20;
      
      doc.fontSize(12).fillColor('#1F2937').font('Helvetica-Bold')
         .text('💡 KEY INSIGHTS & NEXT STEPS', 30, doc.y);
      doc.y += 20;
      
      const formula = results.score_breakdown.scoring_formula;
      const finalAts = results.score_breakdown.final_ats_score;
      const strengths = [];
      const improvements = [];
      
      // === ANALYZE STRENGTHS ===
      if (formula.resume_score >= 80) {
        strengths.push({
          icon: '✓',
          title: 'Strong Resume Match',
          text: `Excellent resume-JD alignment (${formula.resume_score}/100). Your skills and experience match the job requirements well.`
        });
      }
      
      if (formula.project_score >= 75) {
        strengths.push({
          icon: '✓',
          title: 'Verified Projects',
          text: `High project verification score (${formula.project_score}/100). Your GitHub projects demonstrate real hands-on experience.`
        });
      }
      
      if (formula.github_score >= 70) {
        strengths.push({
          icon: '✓',
          title: 'Active GitHub Profile',
          text: `Strong GitHub presence (${formula.github_score}/100). Active contributions and quality repositories boost credibility.`
        });
      }
      
      if (formula.cp_score >= 70) {
        strengths.push({
          icon: '✓',
          title: 'Proven Problem-Solving',
          text: `Solid competitive programming track record (${formula.cp_score}/100). Demonstrates algorithmic thinking.`
        });
      }
      
      // === IDENTIFY IMPROVEMENT AREAS ===
      if (formula.resume_score < 70) {
        improvements.push({
          icon: '⚠',
          priority: 'HIGH',
          title: 'Resume Optimization Needed',
          text: `Resume match is ${formula.resume_score}/100. Focus on: keyword alignment, skill emphasis, quantifiable achievements.`,
          impact: 'Resume contributes 60% to final ATS — biggest potential impact!'
        });
      }
      
      if (formula.project_score < 60) {
        improvements.push({
          icon: '⚠',
          priority: 'HIGH',
          title: 'Strengthen Project Portfolio',
          text: `Project score is ${formula.project_score}/100. Add GitHub links, ensure repos are public, improve README documentation.`,
          impact: 'Projects contribute 16% to final score.'
        });
      } else if (formula.project_score === 0) {
        improvements.push({
          icon: '❌',
          priority: 'CRITICAL',
          title: 'Add Projects to Resume',
          text: 'No projects found. Add 3-5 GitHub projects with clear descriptions and links.',
          impact: 'Missing 16% of total score — highest proof component!'
        });
      }
      
      if (formula.github_score === 0) {
        improvements.push({
          icon: '⚠',
          priority: 'MEDIUM',
          title: 'Add GitHub Profile',
          text: 'Include GitHub username and link to active repositories.',
          impact: 'Missing 12% of total score.'
        });
      } else if (formula.github_score < 50) {
        improvements.push({
          icon: '⚠',
          priority: 'MEDIUM',
          title: 'Improve GitHub Activity',
          text: `GitHub score is ${formula.github_score}/100. Contribute more regularly, add stars, improve repo descriptions.`,
          impact: 'Could gain up to ${Math.round((100 - formula.github_score) * 0.12)} points.'
        });
      }
      
      if (formula.cp_score === 0) {
        improvements.push({
          icon: '⚠',
          priority: 'LOW',
          title: 'Consider Adding CP Profile',
          text: 'LeetCode/Codeforces profile strengthens technical credibility.',
          impact: 'Potential +12% score boost.'
        });
      }
      
      // === DISPLAY STRENGTHS (max 2) ===
      if (strengths.length > 0) {
        doc.fontSize(9).fillColor('#059669').font('Helvetica-Bold')
           .text('Your Strengths:', 30, doc.y);
        doc.y += 14;
        
        strengths.slice(0, 2).forEach((strength) => {
          if (doc.y > 700) return;
          
          doc.rect(35, doc.y - 3, 520, 20).fill('#D1FAE5');
          
          doc.fontSize(8).fillColor('#047857').font('Helvetica-Bold')
             .text(`${strength.icon}  ${strength.title}`, 45, doc.y);
          doc.fontSize(7).fillColor('#065F46').font('Helvetica')
             .text(strength.text, 45, doc.y + 10);
          
          doc.y += 26;
        });
        
        doc.y += 5;
      }
      
      // === DISPLAY TOP IMPROVEMENTS (max 3) ===
      if (improvements.length > 0) {
        doc.fontSize(9).fillColor('#DC2626').font('Helvetica-Bold')
           .text('Priority Improvements:', 30, doc.y);
        doc.y += 14;
        
        improvements.slice(0, 3).forEach((imp) => {
          if (doc.y > 700) return;
          
          const bgColor = imp.priority === 'CRITICAL' ? '#FEE2E2' : imp.priority === 'HIGH' ? '#FEF3C7' : '#E5E7EB';
          const textColor = imp.priority === 'CRITICAL' ? '#991B1B' : imp.priority === 'HIGH' ? '#92400E' : '#374151';
          
          doc.rect(35, doc.y - 3, 520, 34).fill(bgColor);
          
          // Priority badge
          doc.fontSize(7).fillColor(textColor).font('Helvetica-Bold')
             .text(imp.priority, 45, doc.y);
          
          // Title
          doc.fontSize(8).fillColor(textColor).font('Helvetica-Bold')
             .text(`${imp.icon}  ${imp.title}`, 95, doc.y);
          doc.fontSize(7).fillColor(textColor).font('Helvetica')
             .text(imp.text, 45, doc.y + 10);
          doc.fontSize(6).fillColor(textColor).font('Helvetica-Oblique')
             .text(`Impact: ${imp.impact}`, 45, doc.y + 22);
          
          doc.y += 40;
        });
      }
      
      doc.y += 5;
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
