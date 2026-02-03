import React, { useState, useEffect } from 'react';
import { ChevronRight, TrendingUp, AlertCircle, FileText, Sparkles, Download, RefreshCw, BarChart3, MessageSquare } from 'lucide-react';

// Main Application Component
export default function EarningsQATool() {
  const [activeTab, setActiveTab] = useState('questions');
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState(null);
  const [metrics, setMetrics] = useState(null);

  // Load and parse the CSV data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Load Snowflake metrics
      const metricsResponse = await fetch('/mnt/user-data/uploads/snowflake_ir_metrics.csv');
      const metricsText = await metricsResponse.text();
      const metricsData = parseCSV(metricsText);
      
      // Load peer financial data
      const peerResponse = await fetch('/mnt/user-data/uploads/data_peer_financial_metrics.csv');
      const peerText = await peerResponse.text();
      const peerData = parseCSV(peerText);
      
      // Load analyst ratings
      const ratingsResponse = await fetch('/mnt/user-data/uploads/analyst_ratings.csv');
      const ratingsText = await ratingsResponse.text();
      const ratingsData = parseCSV(ratingsText);
      
      // Load news snippets
      const newsResponse = await fetch('/mnt/user-data/uploads/data_peer_news_snippets.csv');
      const newsText = await newsResponse.text();
      const newsData = parseCSV(newsText);

      setMetrics({
        snowflake: metricsData,
        peers: peerData,
        ratings: ratingsData,
        news: newsData
      });
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = values[i] ? values[i].replace(/^"|"$/g, '').trim() : '';
      });
      return obj;
    });
  };

  const generateQuestions = async (count = 5) => {
    setIsGenerating(true);
    
    try {
      const prompt = `You are a senior Wall Street equity research analyst preparing for Snowflake's earnings call. Based on the following data, generate ${count} tough, specific questions that analysts are likely to ask during the Q&A session.

Context:
1. Snowflake's latest quarter (Q3 FY2026, ending Oct 31, 2025):
   - Product Revenue: $1,160M
   - Total Revenue: $1,210M
   - NRR: 125% (down from 127% YoY)
   - Customers >$1M: 688 (up from 542 YoY)
   - Free Cash Flow: $110.5M
   - Gross Margin: 76%

2. Key Competitive Intelligence:
   - MongoDB Q3 FY2025: Revenue $529M (+22% YoY), Atlas grew 26% YoY, raised FY25 guidance
   - Datadog showing strong performance in observability market
   - Multiple analyst upgrades for MongoDB citing AI opportunity

3. Industry Trends:
   - GenAI adoption accelerating
   - Data platform consolidation
   - Consumption model volatility concerns
   - Competitive pressure in data warehousing

Generate questions that:
- Focus on NRR deceleration and what it signals
- Challenge growth sustainability vs peers
- Probe AI strategy and competitive positioning
- Question consumption trends and optimization
- Examine competitive losses or wins
- Challenge margin trajectory and profitability

Format each question as a JSON object with:
{
  "id": "unique_id",
  "question": "the full question text",
  "category": "Growth|Profitability|Competition|AI Strategy|Customer Trends",
  "difficulty": "Hard|Very Hard",
  "context": "brief explanation of why this question matters"
}

Return ONLY a JSON array of questions, no other text.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await response.json();
      const content = data.content.find(c => c.type === 'text')?.text || '';
      
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsedQuestions = JSON.parse(jsonMatch[0]);
        setQuestions(parsedQuestions);
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      // Fallback to sample questions
      setQuestions(getSampleQuestions());
    } finally {
      setIsGenerating(false);
    }
  };

  const generateResponse = async (question) => {
    setSelectedQuestion(question);
    setResponse({ loading: true });

    try {
      const prompt = `You are the CFO of Snowflake preparing to answer this analyst question during the earnings call:

"${question.question}"

Based on the following data, prepare a comprehensive, data-backed response:

Snowflake Metrics (Q3 FY2026 vs Q3 FY2025):
- Product Revenue: $1,160M vs $900.3M (+28.9% YoY)
- Total Revenue: $1,210M vs $942.1M (+28.4% YoY)
- RPO: $6,900M vs $5,700M (+21.1% YoY)
- NRR: 125% vs 127% (-200 bps)
- Customers >$1M: 688 vs 542 (+27.0%)
- FCF: $110.5M vs $78.2M (+41.3%)
- Gross Margin: 76% (flat)

Key Points to Address:
1. Lead with the positive narrative
2. Acknowledge concerns directly but with context
3. Use specific data points and metrics
4. Reference competitive differentiation
5. Provide forward-looking commentary
6. Be concise but comprehensive (2-3 paragraphs)

Format your response as JSON:
{
  "talking_points": ["point 1", "point 2", "point 3"],
  "key_metrics": ["metric 1", "metric 2"],
  "response_text": "full response text",
  "risk_level": "Low|Medium|High",
  "follow_up_concerns": ["potential follow-up 1", "potential follow-up 2"]
}

Return ONLY valid JSON.`;

      const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await apiResponse.json();
      const content = data.content.find(c => c.type === 'text')?.text || '';
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedResponse = JSON.parse(jsonMatch[0]);
        setResponse(parsedResponse);
      }
    } catch (error) {
      console.error('Error generating response:', error);
      setResponse(getSampleResponse(question));
    }
  };

  const getSampleQuestions = () => [
    {
      id: 'q1',
      question: 'Your NRR declined 200 basis points year-over-year to 125%. Given that MongoDB just reported 26% Atlas growth and raised guidance, how do you explain the deceleration in your core consumption metrics?',
      category: 'Growth',
      difficulty: 'Very Hard',
      context: 'NRR is a key metric for SaaS companies and any deceleration raises concerns about customer health and competitive pressure'
    },
    {
      id: 'q2',
      question: 'With customer optimization continuing to impact consumption and GenAI workloads still ramping, when should investors expect NRR to stabilize? What are the leading indicators you\'re watching?',
      category: 'Customer Trends',
      difficulty: 'Hard',
      context: 'Investors need visibility into when consumption patterns will normalize'
    },
    {
      id: 'q3',
      question: 'MongoDB and Databricks are both aggressively positioning around AI-native data platforms. What具体 customer wins can you point to where Snowflake beat these competitors for GenAI workloads?',
      category: 'Competition',
      difficulty: 'Very Hard',
      context: 'Competitive positioning in the AI era is critical for maintaining market share'
    },
    {
      id: 'q4',
      question: 'Your Remaining Performance Obligations grew 21%, which is decelerating faster than revenue growth. Is this indicating softer enterprise commitment levels or shorter contract durations?',
      category: 'Growth',
      difficulty: 'Hard',
      context: 'RPO growth deceleration can signal weakening customer commitment'
    },
    {
      id: 'q5',
      question: 'Free cash flow grew 41% while revenue grew 28%. Can you sustain this operating leverage, or should we expect increased sales and R&D investment to defend against MongoDB and Databricks?',
      category: 'Profitability',
      difficulty: 'Hard',
      context: 'Balance between profitability and growth investment is critical'
    }
  ];

  const getSampleResponse = (question) => ({
    talking_points: [
      'Strong underlying business fundamentals with 29% revenue growth',
      'NRR decline primarily driven by optimization, not competitive losses',
      'Leading AI/ML workload growth in the industry'
    ],
    key_metrics: [
      '688 customers over $1M, up 27% YoY',
      '$110.5M FCF, up 41% YoY'
    ],
    response_text: 'Thank you for the question. While we did see NRR compress 200 basis points to 125%, I want to provide important context. First, our revenue growth of 29% year-over-year demonstrates strong underlying demand. The NRR decline is primarily attributable to customer optimization behaviors, not competitive displacement. In fact, we added 146 net new customers over $1M this quarter, our strongest growth in this cohort in the past year. Second, regarding GenAI workloads, we\'re seeing accelerating adoption with Snowflake Cortex being used by over 1,000 customers. Our consumption economics actually benefit from AI workloads as they tend to be more compute-intensive. We believe we\'re well-positioned as customers consolidate their data infrastructure around platforms that can handle both traditional analytics and AI workloads at scale.',
    risk_level: 'Medium',
    follow_up_concerns: [
      'Request for specific customer win examples',
      'Questions about optimization timeline'
    ]
  });

  return (
    <div className="earnings-tool">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Newsreader:ital,wght@0,400;0,600;1,400&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          background: #0a0a0f;
          color: #e0e0e8;
          font-family: 'JetBrains Mono', monospace;
          overflow-x: hidden;
        }

        .earnings-tool {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a0f 0%, #151520 50%, #0a0a0f 100%);
          position: relative;
        }

        .earnings-tool::before {
          content: '';
          position: fixed;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: 
            radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.03) 0%, transparent 50%);
          animation: pulse 20s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.8; transform: scale(1.1) rotate(5deg); }
        }

        .header {
          background: rgba(10, 10, 15, 0.8);
          border-bottom: 1px solid rgba(99, 102, 241, 0.2);
          backdrop-filter: blur(20px);
          padding: 2rem 3rem;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }

        .title-section h1 {
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
        }

        .subtitle {
          font-size: 0.9rem;
          color: #9ca3af;
          font-weight: 400;
        }

        .war-room-badge {
          background: rgba(220, 38, 38, 0.1);
          border: 1px solid rgba(220, 38, 38, 0.3);
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #fca5a5;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .tabs {
          display: flex;
          gap: 1rem;
          border-bottom: 1px solid rgba(99, 102, 241, 0.1);
        }

        .tab {
          background: none;
          border: none;
          color: #9ca3af;
          padding: 0.75rem 1.5rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.3s ease;
          position: relative;
        }

        .tab:hover {
          color: #e0e0e8;
        }

        .tab.active {
          color: #6366f1;
          border-bottom-color: #6366f1;
        }

        .main-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 3rem;
          position: relative;
          z-index: 1;
        }

        .intro-section {
          background: rgba(21, 21, 32, 0.6);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
          backdrop-filter: blur(10px);
        }

        .intro-section h2 {
          font-size: 1.25rem;
          margin-bottom: 1rem;
          color: #e0e0e8;
        }

        .intro-section p {
          color: #9ca3af;
          line-height: 1.6;
          font-size: 0.9rem;
        }

        .action-bar {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .btn {
          background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
          border: none;
          color: white;
          padding: 0.875rem 1.5rem;
          border-radius: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s ease;
        }

        .btn:hover::before {
          left: 100%;
        }

        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.3);
          color: #a5b4fc;
        }

        .questions-grid {
          display: grid;
          gap: 1.25rem;
        }

        .question-card {
          background: rgba(21, 21, 32, 0.6);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 12px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          backdrop-filter: blur(10px);
        }

        .question-card:hover {
          border-color: #6366f1;
          transform: translateX(4px);
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.2);
        }

        .question-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .question-badges {
          display: flex;
          gap: 0.5rem;
        }

        .badge {
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .badge-category {
          background: rgba(99, 102, 241, 0.15);
          color: #a5b4fc;
          border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .badge-difficulty {
          background: rgba(220, 38, 38, 0.15);
          color: #fca5a5;
          border: 1px solid rgba(220, 38, 38, 0.3);
        }

        .question-text {
          font-family: 'Newsreader', serif;
          font-size: 1.05rem;
          line-height: 1.6;
          color: #e0e0e8;
          margin-bottom: 1rem;
          font-weight: 400;
        }

        .question-context {
          font-size: 0.85rem;
          color: #9ca3af;
          font-style: italic;
          line-height: 1.5;
        }

        .response-panel {
          background: rgba(21, 21, 32, 0.6);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 12px;
          padding: 2rem;
          margin-top: 2rem;
          backdrop-filter: blur(10px);
        }

        .response-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(99, 102, 241, 0.1);
        }

        .response-header h3 {
          font-size: 1.1rem;
          color: #e0e0e8;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .risk-indicator {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .risk-low {
          background: rgba(34, 197, 94, 0.15);
          color: #86efac;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .risk-medium {
          background: rgba(251, 191, 36, 0.15);
          color: #fcd34d;
          border: 1px solid rgba(251, 191, 36, 0.3);
        }

        .risk-high {
          background: rgba(220, 38, 38, 0.15);
          color: #fca5a5;
          border: 1px solid rgba(220, 38, 38, 0.3);
        }

        .talking-points {
          margin-bottom: 2rem;
        }

        .talking-points h4 {
          font-size: 0.9rem;
          color: #a5b4fc;
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        .talking-points ul {
          list-style: none;
          padding: 0;
        }

        .talking-points li {
          padding: 0.75rem;
          margin-bottom: 0.5rem;
          background: rgba(99, 102, 241, 0.05);
          border-left: 3px solid #6366f1;
          border-radius: 4px;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .response-text {
          background: rgba(0, 0, 0, 0.3);
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid rgba(99, 102, 241, 0.1);
          margin-bottom: 2rem;
        }

        .response-text p {
          font-family: 'Newsreader', serif;
          font-size: 1rem;
          line-height: 1.8;
          color: #e0e0e8;
        }

        .metrics-highlight {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .metric-card {
          background: rgba(99, 102, 241, 0.05);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 8px;
          padding: 1rem;
          text-align: center;
        }

        .metric-card .label {
          font-size: 0.75rem;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .metric-card .value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #6366f1;
        }

        .follow-up {
          background: rgba(251, 191, 36, 0.05);
          border: 1px solid rgba(251, 191, 36, 0.2);
          border-radius: 8px;
          padding: 1.25rem;
        }

        .follow-up h4 {
          font-size: 0.9rem;
          color: #fcd34d;
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .follow-up ul {
          list-style: none;
          padding: 0;
        }

        .follow-up li {
          padding: 0.5rem 0;
          color: #e0e0e8;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .follow-up li::before {
          content: '▸';
          color: #fcd34d;
        }

        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          gap: 1rem;
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(99, 102, 241, 0.2);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #9ca3af;
        }

        .empty-state svg {
          margin: 0 auto 1.5rem;
          opacity: 0.5;
        }

        .empty-state p {
          font-size: 0.95rem;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 768px) {
          .header {
            padding: 1.5rem;
          }

          .header-top {
            flex-direction: column;
            gap: 1rem;
          }

          .main-content {
            padding: 1.5rem;
          }

          .action-bar {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="header">
        <div className="header-content">
          <div className="header-top">
            <div className="title-section">
              <h1>Earnings Call War Room</h1>
              <p className="subtitle">AI-Powered Q&A Preparation for Snowflake Q3 FY2026</p>
            </div>
            <div className="war-room-badge">
              ⚡ LIVE SESSION
            </div>
          </div>
          
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'questions' ? 'active' : ''}`}
              onClick={() => setActiveTab('questions')}
            >
              <MessageSquare size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Predicted Questions
            </button>
            <button 
              className={`tab ${activeTab === 'metrics' ? 'active' : ''}`}
              onClick={() => setActiveTab('metrics')}
            >
              <BarChart3 size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Competitive Dashboard
            </button>
            <button 
              className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
              onClick={() => setActiveTab('documents')}
            >
              <FileText size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Document Library
            </button>
          </div>
        </div>
      </div>

      <div className="main-content">
        {activeTab === 'questions' && (
          <>
            <div className="intro-section">
              <h2>Question Prediction Engine</h2>
              <p>
                This tool uses AI to analyze Snowflake's performance, competitive dynamics, and market trends 
                to predict the toughest questions analysts will ask during the earnings call Q&A. Each question 
                comes with a data-backed response template that executives can customize.
              </p>
            </div>

            <div className="action-bar">
              <button 
                className="btn" 
                onClick={() => generateQuestions(5)}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="spinner"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate New Questions
                  </>
                )}
              </button>
              <button className="btn btn-secondary">
                <Download size={18} />
                Export to PDF
              </button>
            </div>

            {questions.length === 0 && !isGenerating && (
              <div className="empty-state">
                <Sparkles size={48} />
                <p>Click "Generate New Questions" to start predicting analyst questions</p>
                <button className="btn" onClick={() => generateQuestions(5)}>
                  <Sparkles size={18} />
                  Get Started
                </button>
              </div>
            )}

            {isGenerating && (
              <div className="loading">
                <div className="spinner"></div>
                <span>Analyzing competitive data and generating questions...</span>
              </div>
            )}

            {questions.length > 0 && !isGenerating && (
              <div className="questions-grid">
                {questions.map((q) => (
                  <div 
                    key={q.id} 
                    className="question-card"
                    onClick={() => generateResponse(q)}
                  >
                    <div className="question-header">
                      <div className="question-badges">
                        <span className="badge badge-category">{q.category}</span>
                        <span className="badge badge-difficulty">{q.difficulty}</span>
                      </div>
                      <ChevronRight size={20} style={{ color: '#6366f1' }} />
                    </div>
                    <div className="question-text">{q.question}</div>
                    <div className="question-context">
                      <AlertCircle size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      {q.context}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedQuestion && response && (
              <div className="response-panel">
                <div className="response-header">
                  <h3>
                    <TrendingUp size={20} />
                    Prepared Response
                  </h3>
                  {!response.loading && (
                    <span className={`risk-indicator risk-${response.risk_level?.toLowerCase() || 'medium'}`}>
                      {response.risk_level || 'Medium'} Risk
                    </span>
                  )}
                </div>

                {response.loading ? (
                  <div className="loading">
                    <div className="spinner"></div>
                    <span>Generating data-backed response...</span>
                  </div>
                ) : (
                  <>
                    <div className="question-text" style={{ marginBottom: '2rem', opacity: 0.7 }}>
                      "{selectedQuestion.question}"
                    </div>

                    <div className="talking-points">
                      <h4>Key Talking Points</h4>
                      <ul>
                        {response.talking_points?.map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>

                    {response.key_metrics && (
                      <div className="metrics-highlight">
                        {response.key_metrics.map((metric, i) => (
                          <div key={i} className="metric-card">
                            <div className="label">Supporting Metric</div>
                            <div className="value" style={{ fontSize: '0.95rem' }}>{metric}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="response-text">
                      <p>{response.response_text}</p>
                    </div>

                    {response.follow_up_concerns && response.follow_up_concerns.length > 0 && (
                      <div className="follow-up">
                        <h4>
                          <AlertCircle size={16} />
                          Potential Follow-Up Questions
                        </h4>
                        <ul>
                          {response.follow_up_concerns.map((concern, i) => (
                            <li key={i}>{concern}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'metrics' && (
          <div className="intro-section">
            <h2>Competitive Dashboard</h2>
            <p>Real-time comparison of Snowflake vs. key peers (MongoDB, Datadog) across critical metrics</p>
            <p style={{ marginTop: '1rem', color: '#9ca3af' }}>
              Dashboard visualization coming soon...
            </p>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="intro-section">
            <h2>Document Library</h2>
            <p>Upload and process additional PDFs for enhanced question generation</p>
            <p style={{ marginTop: '1rem', color: '#9ca3af' }}>
              PDF processing interface coming soon...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
