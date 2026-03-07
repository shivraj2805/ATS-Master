# ATSMaster Project Costing
## Complete Cost Breakdown for Production Deployment (All Costs in INR)

---

## 📊 EXECUTIVE SUMMARY

| Component | Monthly Cost (₹) | Annual Cost (₹) |
|-----------|------------------|-----------------|
| **AWS Deployment** | ₹4,596 - ₹27,579 | ₹55,158 - ₹3,30,948 |
| **AI API (Gemini/OpenAI)** | ₹460 - ₹18,386 | ₹5,516 - ₹2,20,632 |
| **GitHub API** | FREE | FREE |
| **Total** | **₹5,056 - ₹45,965** | **₹60,674 - ₹5,51,580** |

**Exchange Rate Used:** 1 USD = ₹91.93 (March 2026)

---

## 🤖 AI API COSTS BREAKDOWN

### 1. GEMINI API (Recommended - Currently Using)

**Pricing:**
- Model: Gemini 2.5 Flash
- Input: ₹6.89 per 1M tokens
- Output: ₹27.58 per 1M tokens
- **Free Tier: 15 requests/minute (21,600/day)**

#### Single Resume Analysis Cost:
```
Average Resume + Job Description:
  Input:  ~2,500 tokens (resume text + job description)
  Output: ~1,500 tokens (analysis + optimization suggestions)

Cost per analysis:
  Input:  2,500 × ₹6.89/1M = ₹0.0172
  Output: 1,500 × ₹27.58/1M = ₹0.0414
  ─────────────────────────────────────────
  TOTAL PER RESUME: ₹0.059 (~6 paise)
```

#### User-Based Costing:

| Users | Resumes/Month | Monthly Cost (₹) | Notes |
|-------|---------------|------------------|-------|
| **1 user** | 10 analyses | ₹0.59 | Practically FREE |
| **100 users** | 1,000 analyses | ₹59 | Very affordable |
| **1,000 users** | 10,000 analyses | ₹586 | Still cheap |
| **10,000 users** | 100,000 analyses | ₹5,863 | Cost-effective |

#### Recruiter Platform - Bulk Upload Costing:

| Bulk Upload Size | API Calls | Cost per Batch (₹) | Daily Batches | Monthly Cost (₹) |
|------------------|-----------|---------------------|---------------|------------------|
| **100 resumes** | 100 | ₹5.86 | 1 | ₹176 |
| **200 resumes** | 200 | ₹11.73 | 1 | ₹352 |
| **500 resumes** | 500 | ₹29.31 | 1 | ₹879 |
| **1,000 resumes** | 1,000 | ₹58.63 | 1 | ₹1,759 |

**Example Scenarios:**

1. **Small Recruiting Agency:**
   - 10 bulk uploads/day (100 resumes each)
   - Daily cost: ₹59
   - **Monthly cost: ₹1,759**

2. **Medium Recruiting Agency:**
   - 5 bulk uploads/day (200 resumes each)
   - Daily cost: ₹59
   - **Monthly cost: ₹1,759**

3. **Large Recruiting Platform:**
   - 10 bulk uploads/day (1,000 resumes each)
   - Daily cost: ₹586
   - **Monthly cost: ₹17,590**

**✅ Gemini Verdict: EXTREMELY COST-EFFECTIVE**

---

### 2. OPENAI API (Alternative)

**Pricing:**
- Model: GPT-4o Mini (similar capability)
- Input: ₹13.79 per 1M tokens (2× more expensive)
- Output: ₹55.16 per 1M tokens (2× more expensive)
- Free Tier: ₹460 credit only (limited)

#### Single Resume Analysis Cost:
```
Average Resume + Job Description:
  Input:  ~2,500 tokens
  Output: ~1,500 tokens

Cost per analysis:
  Input:  2,500 × ₹13.79/1M = ₹0.0345
  Output: 1,500 × ₹55.16/1M = ₹0.0827
  ─────────────────────────────────────────
  TOTAL PER RESUME: ₹0.117 (~12 paise)
  
  ⚠️ 2× MORE EXPENSIVE than Gemini
```

#### User-Based Costing:

| Users | Resumes/Month | Monthly Cost (₹) | vs. Gemini |
|-------|---------------|------------------|------------|
| **1 user** | 10 analyses | ₹1.17 | 2× more |
| **100 users** | 1,000 analyses | ₹117 | 2× more |
| **1,000 users** | 10,000 analyses | ₹1,173 | 2× more |
| **10,000 users** | 100,000 analyses | ₹11,726 | 2× more |

#### Recruiter Platform - Bulk Upload Costing:

| Bulk Upload Size | API Calls | Cost per Batch (₹) | Daily Batches | Monthly Cost (₹) |
|------------------|-----------|---------------------|---------------|------------------|
| **100 resumes** | 100 | ₹11.73 | 1 | ₹352 |
| **200 resumes** | 200 | ₹23.45 | 1 | ₹704 |
| **500 resumes** | 500 | ₹58.63 | 1 | ₹1,759 |
| **1,000 resumes** | 1,000 | ₹117.26 | 1 | ₹3,518 |

**Example Scenarios:**

1. **Small Recruiting Agency:**
   - 10 bulk uploads/day (100 resumes each)
   - **Monthly cost: ₹3,518** (vs. Gemini ₹1,759)

2. **Medium Recruiting Agency:**
   - 5 bulk uploads/day (200 resumes each)
   - **Monthly cost: ₹3,518** (vs. Gemini ₹1,759)

3. **Large Recruiting Platform:**
   - 10 bulk uploads/day (1,000 resumes each)
   - **Monthly cost: ₹35,179** (vs. Gemini ₹17,590)

**❌ OpenAI Verdict: 2× MORE EXPENSIVE**

---

### 3. GEMINI vs OPENAI COMPARISON

| Feature | Gemini 2.5 Flash | OpenAI GPT-4o Mini |
|---------|------------------|-------------------|
| **Cost per resume** | ₹0.059 | ₹0.117 |
| **100 users/month** | ₹59 | ₹117 |
| **1,000 users/month** | ₹586 | ₹1,173 |
| **10,000 users/month** | ₹5,863 | ₹11,726 |
| **Bulk 1,000 resumes/day** | ₹17,590/month | ₹35,179/month |
| **Free tier** | 15 req/min (generous) | ₹415 credit (limited) |
| **Rate limit** | 21,600/day free | Pay from start |
| **Quality** | Excellent | Excellent |

**🏆 WINNER: GEMINI (2× Cheaper + Better Free Tier)**

---

## 🐙 GITHUB AGENT COSTS

### GitHub API Pricing

**Good News: GitHub API is 100% FREE for your use case!**

| Tier | Rate Limit | Cost | Suitable For |
|------|------------|------|--------------|
| **Unauthenticated** | 60 requests/hour | FREE | Testing only |
| **Authenticated (Personal Token)** | 5,000 requests/hour | **FREE** | ✅ Production |
| **GitHub App** | 15,000 requests/hour | **FREE** | Enterprise scale |

#### GitHub Agent Verification Per Candidate:
```
Operations per verification:
  1. Get user profile:           1 API call
  2. List repositories:          1 API call
  3. Get repo details (×10):     10 API calls
  4. Get commit history (×10):   10 API calls
  5. Get languages/stars:        5 API calls
  ─────────────────────────────────────────
  TOTAL: ~30 API calls per candidate
```

#### Verification Costing:

| Candidates | API Calls | Requests/Hour Needed | Within Limit? | Cost |
|------------|-----------|----------------------|---------------|------|
| **10** | 300 | 300/hour | ✅ Yes | **FREE** |
| **100** | 3,000 | 3,000/hour | ✅ Yes | **FREE** |
| **1,000** | 30,000 | 1,500/hour (spread over 20 hours) | ✅ Yes | **FREE** |
| **10,000** | 300,000 | 5,000/hour (60 hours processing) | ✅ Yes | **FREE** |

**Rate Limit Analysis:**
```
With authenticated token: 5,000 requests/hour
  = 120,000 requests/day
  = 3,600,000 requests/month
  = Can verify 120,000 candidates/month
  
For bulk recruiter uploads:
  - 1,000 resume upload → 30,000 API calls
  - Time needed: 6 hours (within rate limit)
  - Cost: FREE ✅
```

**✅ GitHub API Verdict: COMPLETELY FREE**

**Notes:**
- Just need a GitHub Personal Access Token (free)
- 5,000 requests/hour is more than enough
- Can process bulk verifications easily
- No credit card required
- No hidden costs

---

## ☁️ AWS DEPLOYMENT COSTS

### Architecture Overview
```
Frontend (React)     → AWS S3 + CloudFront
Backend (Node.js)    → AWS EC2 / ECS
Python AI Service    → AWS EC2 / Lambda
Database (MongoDB)   → MongoDB Atlas on AWS
```

### 1. FRONTEND HOSTING (S3 + CloudFront)

| Component | Service | Monthly Cost (₹) |
|-----------|---------|------------------|
| Static hosting | S3 Standard | ₹2.11/GB storage |
| CDN delivery | CloudFront | ₹7.81/GB transfer |
| SSL certificate | ACM | FREE |

**Estimated Costs:**
```
Small (< 1K users):
  - Storage: 1GB = ₹2.11
  - Transfer: 50GB = ₹391
  - Total: ~₹460/month

Medium (1K-10K users):
  - Storage: 1GB = ₹2.11
  - Transfer: 500GB = ₹3,906
  - Total: ~₹3,950/month

Large (10K+ users):
  - Storage: 2GB = ₹4.22
  - Transfer: 2TB = ₹15,625
  - Total: ~₹15,629/month
```

---

### 2. BACKEND SERVER (Node.js API)

#### Option A: EC2 Instances

| Instance Type | vCPU | RAM | Monthly Cost (₹) | Best For |
|---------------|------|-----|------------------|----------|
| **t3.micro** | 2 | 1GB | ₹781 | MVP/Testing |
| **t3.small** | 2 | 2GB | ₹1,563 | 100-500 users |
| **t3.medium** | 2 | 4GB | ₹3,126 | 500-2K users |
| **t3.large** | 2 | 8GB | ₹6,251 | 2K-10K users |
| **t3.xlarge** | 4 | 16GB | ₹12,502 | 10K+ users |

**Additional Costs:**
- EBS Storage (30GB): ₹276/month
- Data Transfer: ₹8.27/GB (first 10GB free)
- Elastic IP: ₹331/month (if needed)
- Load Balancer: ₹1,471/month (for high availability)

**Estimated Total:**
```
Small setup (< 1K users):
  - t3.small: ₹1,563
  - Storage: ₹276
  - Total: ~₹1,839/month

Production (1K-5K users):
  - t3.medium (×2): ₹6,251
  - Load Balancer: ₹1,471
  - Storage: ₹551
  - Total: ~₹8,273/month

Scale (10K+ users):
  - t3.large (×3): ₹18,753
  - Load Balancer: ₹1,471
  - Storage: ₹919
  - Total: ~₹21,143/month
```

#### Option B: ECS Fargate (Containerized)

| Configuration | vCPU | RAM | Monthly Cost (₹) | Best For |
|---------------|------|-----|------------------|----------|
| **0.25 vCPU** | 0.25 | 0.5GB | ₹414 | Testing |
| **0.5 vCPU** | 0.5 | 1GB | ₹1,333 | Small production |
| **1 vCPU** | 1 | 2GB | ₹2,666 | Production |
| **2 vCPU** | 2 | 4GB | ₹5,332 | High traffic |

---

### 3. PYTHON AI SERVICE

#### Option A: EC2 Instance

| Instance Type | vCPU | RAM | Monthly Cost (₹) | Best For |
|---------------|------|-----|------------------|----------|
| **t3.small** | 2 | 2GB | ₹1,563 | Light AI processing |
| **t3.medium** | 2 | 4GB | ₹3,126 | Production AI workload |
| **t3.large** | 2 | 8GB | ₹6,251 | Heavy AI processing |

#### Option B: AWS Lambda (Serverless)

**Pricing:**
- ₹18.39 per 1M requests
- ₹0.00153 per GB-second

**Estimated Costs:**
```
1,000 analyses/month (each 10 seconds, 512MB):
  - Requests: 1,000 × ₹18.39/1M = ₹0.018
  - Compute: (0.512GB × 10s × 1,000) × ₹0.00153 = ₹7.83
  - Total: ~₹9/month

10,000 analyses/month:
  - Total: ~₹92/month

100,000 analyses/month:
  - Total: ~₹919/month

✅ Lambda is VERY cost-effective for AI workloads!
```

---

### 4. DATABASE

#### Option A: MongoDB Atlas (Recommended)

| Tier | RAM | Storage | Monthly Cost (₹) | Best For |
|------|-----|---------|------------------|----------|
| **M0** | Shared | 512MB | FREE | Testing |
| **M10** | 2GB | 10GB | ₹5,240 | Production (< 5K users) |
| **M20** | 4GB | 20GB | ₹10,664 | Production (5K-20K users) |
| **M30** | 8GB | 40GB | ₹23,718 | Enterprise (20K+ users) |

**Storage Growth:**
```
Each resume analysis: ~150KB
  - 1,000 users × 10 analyses = 1.5GB → Need M10
  - 10,000 users × 10 analyses = 15GB → Need M20
  - 100,000 users × 10 analyses = 150GB → Need M60+
```

#### Option B: AWS DocumentDB

| Instance | vCPU | RAM | Monthly Cost (₹) | Best For |
|----------|------|-----|------------------|----------|
| **db.t3.medium** | 2 | 4GB | ₹4,597 | Small production |
| **db.r5.large** | 2 | 16GB | ₹18,386 | Production |
| **db.r5.xlarge** | 4 | 32GB | ₹36,772 | Enterprise |

**Additional Costs:**
- Storage: ₹9.19/GB/month
- I/O requests: ₹18.39 per 1M requests
- Backup: ₹1.93/GB

**Verdict: MongoDB Atlas M10 (₹5,240) is better value than DocumentDB**

---

## 💰 COMPLETE AWS DEPLOYMENT SCENARIOS

### Scenario 1: MVP / Testing (< 100 users)
```
Frontend (S3 + CloudFront):           ₹460
Backend (t3.small EC2):               ₹1,839
Python Service (Lambda):              ₹92
Database (MongoDB Atlas M0):          FREE
AI API (Gemini):                      ₹59
GitHub API:                           FREE
────────────────────────────────────────────
TOTAL:                                ₹2,450/month
ANNUAL:                               ₹29,400/year
```

---

### Scenario 2: Small Production (100-1,000 users)
```
Frontend (S3 + CloudFront):           ₹919
Backend (t3.medium EC2):              ₹3,402
Python Service (t3.small EC2):        ₹1,839
Database (MongoDB Atlas M10):         ₹5,240
AI API (Gemini - 10K analyses):       ₹586
GitHub API:                           FREE
────────────────────────────────────────────
TOTAL:                                ₹11,986/month
ANNUAL:                               ₹1,43,832/year
```

---

### Scenario 3: Medium Production (1K-5K users)
```
Frontend (S3 + CloudFront):           ₹2,298
Backend (t3.medium × 2 + LB):         ₹8,273
Python Service (t3.medium EC2):       ₹3,402
Database (MongoDB Atlas M10):         ₹5,240
AI API (Gemini - 50K analyses):       ₹2,932
GitHub API:                           FREE
WAF & Security:                       ₹2,298
Monitoring (CloudWatch):              ₹919
────────────────────────────────────────────
TOTAL:                                ₹25,362/month
ANNUAL:                               ₹3,04,344/year
```

---

### Scenario 4: Large Production (5K-20K users)
```
Frontend (S3 + CloudFront):           ₹4,597
Backend (t3.large × 2 + LB):          ₹13,973
Python Service (t3.large EC2):        ₹6,527
Database (MongoDB Atlas M20):         ₹10,664
AI API (Gemini - 200K analyses):      ₹11,726
GitHub API:                           FREE
WAF & DDoS Protection:                ₹4,597
Monitoring & Logging:                 ₹2,758
Backup & Disaster Recovery:           ₹1,839
────────────────────────────────────────────
TOTAL:                                ₹56,681/month
ANNUAL:                               ₹6,80,172/year
```

---

### Scenario 5: Enterprise (20K-100K users)
```
Frontend (CloudFront + S3):           ₹15,629
Backend (t3.xlarge × 3 + ALB):        ₹38,977
Python Service (t3.xlarge × 2):       ₹25,744
Database (MongoDB Atlas M30):         ₹23,718
AI API (Gemini - 1M analyses):        ₹58,626
GitHub API:                           FREE
Security & Compliance:                ₹18,386
Monitoring & APM:                     ₹9,193
Backup & Disaster Recovery:           ₹4,597
Support (AWS Business):               ₹9,193
────────────────────────────────────────────
TOTAL:                                ₹2,04,063/month
ANNUAL:                               ₹24,48,756/year
```

---

## 📊 RECRUITER PLATFORM - SPECIFIC COSTING

### Bulk Resume Upload Scenarios

#### Small Recruiting Agency
```
Activity:
  - 5 recruiters
  - 10 bulk uploads/day (100 resumes each)
  - Total: 1,000 resumes/day = 30,000/month

Monthly Costs:
  - AI API (Gemini): ₹1,759
  - GitHub Verification: FREE
  - AWS Infrastructure: ₹11,986
  ────────────────────────────────────
  Total: ₹13,745/month
```

#### Medium Recruiting Agency
```
Activity:
  - 20 recruiters
  - 50 bulk uploads/day (200 resumes each)
  - Total: 10,000 resumes/day = 300,000/month

Monthly Costs:
  - AI API (Gemini): ₹17,590
  - GitHub Verification: FREE
  - AWS Infrastructure: ₹25,362
  ────────────────────────────────────
  Total: ₹42,952/month
```

#### Large Recruiting Platform
```
Activity:
  - 100 recruiters
  - 100 bulk uploads/day (1,000 resumes each)
  - Total: 100,000 resumes/day = 3M/month

Monthly Costs:
  - AI API (Gemini): ₹1,75,897
  - GitHub Verification: FREE
  - AWS Infrastructure: ₹56,681
  ────────────────────────────────────
  Total: ₹2,32,578/month
```

---

## 🎯 COST OPTIMIZATION TIPS

### 1. AI API Optimization
```
✅ Use Gemini instead of OpenAI (2× cheaper)
✅ Cache duplicate analyses (same resume + job = same result)
✅ Implement rate limiting for free tier
✅ Batch process when possible
✅ Use shorter prompts (reduce input tokens)

Potential savings: 50-70% on AI costs
```

### 2. AWS Infrastructure Optimization
```
✅ Use Reserved Instances (save 40-60% on EC2)
✅ Use Spot Instances for non-critical workloads (save 70-90%)
✅ Auto-scaling based on demand
✅ Use Lambda for AI processing (pay per use)
✅ Enable S3 Intelligent-Tiering
✅ Use CloudFront caching aggressively

Potential savings: 40-50% on infrastructure
```

### 3. GitHub API Optimization
```
✅ Cache verification results for 30 days
✅ Batch API calls efficiently
✅ Use conditional requests (304 Not Modified)
✅ Implement smart rate limiting

Benefit: Stay within free tier forever (5K/hour is plenty)
```

### 4. Database Optimization
```
✅ Archive old analyses after 90 days
✅ Use indexes on frequently queried fields
✅ Compress stored data
✅ Use MongoDB Atlas (better value than DocumentDB)

Potential savings: 30-40% on database costs
```

---

## ✅ FINAL RECOMMENDATIONS

### Best AI API Choice
```
🏆 GEMINI 2.5 FLASH
Reasons:
  ✅ 2× cheaper than OpenAI (₹0.059 vs ₹0.117 per resume)
  ✅ Generous free tier (15 req/min = 21,600/day)
  ✅ High quality results
  ✅ Fast response times
  ✅ You're already using it!
  
Stick with Gemini - perfect choice!
```

### Best Deployment Strategy
```
🏆 AWS WITH MONGODB ATLAS
Reasons:
  ✅ Full control over infrastructure
  ✅ Enterprise-ready
  ✅ Great scalability
  ✅ MongoDB Atlas is better value than DocumentDB
  ✅ Can optimize costs with Reserved Instances
  
Phase 1 (MVP): ₹2,450/month
Phase 2 (Small Production): ₹11,986/month
Phase 3 (Medium Scale): ₹25,362/month
Phase 4 (Large Scale): ₹56,681/month
```

### Best GitHub Strategy
```
🏆 FREE AUTHENTICATED API
Reasons:
  ✅ Completely free forever
  ✅ 5,000 requests/hour (more than enough)
  ✅ Simple setup (just need personal token)
  ✅ Can verify 120,000 candidates/month
  
No cost, no worries!
```

---

## 🚀 QUICK START COSTING

### To Launch Tomorrow
```
Minimum viable costs:
  - AWS t3.small (backend): ₹1,839
  - AWS Lambda (Python): ₹92
  - MongoDB Atlas M0: FREE
  - S3 + CloudFront: ₹460
  - Gemini API: FREE (up to 21,600/day)
  - GitHub API: FREE
  ─────────────────────────────────
  TOTAL: ₹2,391/month
```

### To Scale Confidently (1K-5K users)
```
Production-ready costs:
  - AWS infrastructure: ₹13,973
  - MongoDB Atlas M10: ₹5,240
  - Gemini API: ₹2,932
  - CloudFront: ₹2,298
  - Monitoring: ₹919
  ─────────────────────────────────
  TOTAL: ₹25,362/month
```

---

## 📊 SUMMARY TABLE

| Metric | Value (₹) |
|--------|-----------|
| **Cost per resume analysis (Gemini)** | ₹0.059 |
| **Cost per resume analysis (OpenAI)** | ₹0.117 |
| **Monthly cost (100 users)** | ₹11,986 |
| **Monthly cost (1,000 users)** | ₹25,362 |
| **Monthly cost (10,000 users)** | ₹56,681 |
| **GitHub API cost** | FREE |
| **Minimum launch cost** | ₹2,391/month |

---

## 💡 KEY INSIGHTS

### Cost Advantages:
1. **Gemini API** - Extremely affordable at ₹0.059 per resume (less than 10 paise!)
2. **GitHub API** - Completely free with authenticated token
3. **AWS Scalability** - Pay only for what you use
4. **MongoDB Atlas** - Better value than AWS DocumentDB

### Recommended Scale Path:
```
Start: ₹2,391/month (MVP with free tiers)
  ↓
Grow: ₹11,986/month (100-1K users)
  ↓
Scale: ₹25,362/month (1K-5K users)
  ↓
Expand: ₹56,681/month (5K-20K users)
```

### Cost Optimization Potential:
- Use AWS Reserved Instances: Save 40-60%
- Cache AI responses: Save 50-70%
- Use Spot Instances: Save 70-90%
- **Total potential savings: 50-70% of infrastructure costs**

---

**Bottom Line:**  
Your project has **excellent unit economics** with Gemini (₹0.059 per resume), GitHub API is completely FREE, and AWS deployment scales efficiently from ₹2,391/month to enterprise level!

🎉 **This is a highly cost-effective solution!**

---

**Last Updated:** March 2026  
**Document Version:** 2.1 (INR)  
**Exchange Rate:** 1 USD = ₹91.93
