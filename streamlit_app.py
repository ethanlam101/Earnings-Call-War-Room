#!/usr/bin/env python3
"""
Earnings Call War Room - Streamlit Application
AI-Powered Q&A Preparation with PDF Intelligence

Features:
- Generate analyst questions based on data and PDFs
- Create data-backed responses
- Upload and process PDF documents
- Semantic search across all materials
- Export Q&A preparation to PDF
"""

import streamlit as st
import pandas as pd
import json
import os
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

import anthropic
from pypdf import PdfReader
import pdfplumber

# Configure Streamlit
st.set_page_config(
    page_title="Earnings Call War Room",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for professional styling
st.markdown("""
<style>
    .main-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 2rem;
        border-radius: 10px;
        color: white;
        margin-bottom: 2rem;
    }
    .metric-card {
        background: #f8f9fa;
        padding: 1.5rem;
        border-radius: 8px;
        border-left: 4px solid #667eea;
        margin-bottom: 1rem;
    }
    .question-card {
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        border: 2px solid #e9ecef;
        margin-bottom: 1rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .response-card {
        background: #f1f3f5;
        padding: 1.5rem;
        border-radius: 8px;
        border-left: 4px solid #28a745;
        margin-top: 1rem;
        color: #856404;
    }
    .risk-high {
        background-color: #fff5f5;
        border-left-color: #dc3545;
        color: #721c24;
    }
    .risk-medium {
        background-color: #fff9e6;
        border-left-color: #ffc107;
        color: #856404;
    }
    .risk-low {
        background-color: #f0f9ff;
        border-left-color: #28a745;
        color: #155724;
    }
    .stButton>button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 0.75rem 2rem;
        font-weight: 600;
        border-radius: 8px;
    }
    .stButton>button:hover {
        opacity: 0.9;
    }
</style>
""", unsafe_allow_html=True)


class PDFIntelligence:
    """Process and search PDFs for enhanced context"""
    
    def __init__(self):
        self.documents = []
        self.processed_files = []
    
    def process_pdf(self, pdf_file, filename: str) -> Dict[str, Any]:
        """Process a single PDF file"""
        try:
            # Extract text using pdfplumber for better quality
            text_content = ""
            tables = []
            
            with pdfplumber.open(pdf_file) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    # Extract text
                    page_text = page.extract_text()
                    if page_text:
                        text_content += f"\n--- Page {page_num} ---\n{page_text}"
                    
                    # Extract tables
                    page_tables = page.extract_tables()
                    if page_tables:
                        for table in page_tables:
                            tables.append({
                                'page': page_num,
                                'data': table
                            })
            
            # Also extract metadata
            try:
                with open(pdf_file, 'rb') as f:
                    reader = PdfReader(f)
                    metadata = {
                        'pages': len(reader.pages),
                        'title': reader.metadata.title if reader.metadata else None,
                        'author': reader.metadata.author if reader.metadata else None,
                        'subject': reader.metadata.subject if reader.metadata else None,
                    }
            except:
                metadata = {'pages': 0}
            
            doc = {
                'filename': filename,
                'text': text_content,
                'tables': tables,
                'metadata': metadata,
                'word_count': len(text_content.split()),
                'processed_at': datetime.now().isoformat()
            }
            
            self.documents.append(doc)
            self.processed_files.append(filename)
            
            return doc
            
        except Exception as e:
            st.error(f"Error processing {filename}: {str(e)}")
            return None
    
    def search_documents(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """Search for relevant content in PDFs"""
        results = []
        query_lower = query.lower()
        
        for doc in self.documents:
            # Simple keyword search (can be enhanced with embeddings)
            text_lower = doc['text'].lower()
            
            if query_lower in text_lower:
                # Find all occurrences
                sentences = doc['text'].split('.')
                relevant_sentences = [s for s in sentences if query_lower in s.lower()]
                
                # Calculate relevance score
                score = len(relevant_sentences) / max(len(sentences), 1)
                
                results.append({
                    'filename': doc['filename'],
                    'relevance_score': score,
                    'matches': len(relevant_sentences),
                    'context': '. '.join(relevant_sentences[:3]) + '...',
                    'metadata': doc['metadata']
                })
        
        # Sort by relevance
        results.sort(key=lambda x: x['relevance_score'], reverse=True)
        return results[:max_results]
    
    def get_summary(self) -> str:
        """Get summary of all processed documents"""
        total_docs = len(self.documents)
        total_words = sum(doc['word_count'] for doc in self.documents)
        total_tables = sum(len(doc['tables']) for doc in self.documents)
        
        return f"""
**PDF Library Summary:**
- Documents Processed: {total_docs}
- Total Word Count: {total_words:,}
- Tables Extracted: {total_tables}
- Files: {', '.join(self.processed_files[:5])}{"..." if len(self.processed_files) > 5 else ""}
"""


class EarningsQAApp:
    """Main application class"""
    
    def __init__(self):
        # Try to find data directory intelligently
        possible_paths = [
            Path("/mnt/user-data/uploads"),  # Linux/Claude environment
            Path("./data"),                   # Relative to current directory
            Path("../data"),                  # One level up
            Path(r"C:\Users\lamet\dsc\snowflake_oa\data"),  # User's specific path
        ]
        
        self.data_dir = None
        for path in possible_paths:
            if path.exists():
                self.data_dir = path
                break
        
        # If no existing path found, use ./data as default
        if self.data_dir is None:
            self.data_dir = Path("./data")
            st.warning(f"⚠️ Data directory not found. Using: {self.data_dir.absolute()}")
            st.info("Please place your CSV files in the 'data' folder in your project directory.")
        
        # Initialize Anthropic client
        try:
            # Try to initialize with API key from environment
            api_key = os.environ.get("ANTHROPIC_API_KEY")
            if api_key:
                self.client = anthropic.Anthropic(api_key=api_key)
            else:
                # If no API key set, initialize without it (will use default)
                self.client = anthropic.Anthropic()
        except Exception as e:
            st.warning(f"⚠️ Anthropic API initialization: {str(e)}")
            st.info("💡 Set ANTHROPIC_API_KEY environment variable to enable question generation.")
            st.code("Windows PowerShell: $env:ANTHROPIC_API_KEY = ''", language="powershell")
            self.client = None
        
        self.pdf_intel = PDFIntelligence()
        
        # Initialize session state
        if 'questions' not in st.session_state:
            st.session_state.questions = []
        if 'selected_question' not in st.session_state:
            st.session_state.selected_question = None
        if 'response' not in st.session_state:
            st.session_state.response = None
        if 'data_loaded' not in st.session_state:
            st.session_state.data_loaded = False
        if 'snowflake_data' not in st.session_state:
            st.session_state.snowflake_data = {}
    
    def load_data(self):
        """Load CSV data files"""
        if st.session_state.data_loaded:
            return
        
        with st.spinner("Loading data files..."):
            data = {}
            
            # Load Snowflake metrics
            if (self.data_dir / "snowflake_ir_metrics.csv").exists():
                data['snowflake_metrics'] = pd.read_csv(
                    self.data_dir / "snowflake_ir_metrics.csv"
                )
            
            # Load peer metrics
            if (self.data_dir / "data_peer_financial_metrics.csv").exists():
                data['peer_metrics'] = pd.read_csv(
                    self.data_dir / "data_peer_financial_metrics.csv"
                )
            
            # Load analyst ratings
            if (self.data_dir / "analyst_ratings.csv").exists():
                data['analyst_ratings'] = pd.read_csv(
                    self.data_dir / "analyst_ratings.csv"
                )
            
            # Load news
            if (self.data_dir / "data_peer_news_snippets.csv").exists():
                data['news'] = pd.read_csv(
                    self.data_dir / "data_peer_news_snippets.csv"
                )
            
            st.session_state.snowflake_data = data
            st.session_state.data_loaded = True
    
    def get_snowflake_context(self) -> str:
        """Generate Snowflake performance context"""
        data = st.session_state.snowflake_data
        if 'snowflake_metrics' not in data or len(data['snowflake_metrics']) < 2:
            return "No Snowflake metrics available"
        
        df = data['snowflake_metrics']
        latest = df.iloc[0]
        previous = df.iloc[1]
        
        return f"""
SNOWFLAKE Q{latest['FISCAL_QUARTER']} FY{latest['FISCAL_YEAR']} (ended {latest['PERIOD_END_DATE']}):
- Product Revenue: ${latest['PRODUCT_REVENUE_M']}M (+{((latest['PRODUCT_REVENUE_M'] / previous['PRODUCT_REVENUE_M']) - 1) * 100:.1f}% YoY)
- Total Revenue: ${latest['TOTAL_REVENUE_M']}M (+{((latest['TOTAL_REVENUE_M'] / previous['TOTAL_REVENUE_M']) - 1) * 100:.1f}% YoY)
- RPO: ${latest['RPO_M']}M (+{((latest['RPO_M'] / previous['RPO_M']) - 1) * 100:.1f}% YoY)
- NRR: {latest['NRR_PERCENT']}% ({latest['NRR_PERCENT'] - previous['NRR_PERCENT']:+.0f} bps YoY)
- Customers >$1M: {latest['CUSTOMERS_1M_PLUS']} (+{((latest['CUSTOMERS_1M_PLUS'] / previous['CUSTOMERS_1M_PLUS']) - 1) * 100:.1f}% YoY)
- FCF: ${latest['FCF_IN_MILLIONS']}M (+{((latest['FCF_IN_MILLIONS'] / previous['FCF_IN_MILLIONS']) - 1) * 100:.1f}% YoY)
- Gross Margin: {latest['GROSS_MARGIN_PERCENT']}%
"""
    
    def get_competitive_context(self) -> str:
        """Generate competitive intelligence context"""
        data = st.session_state.snowflake_data
        parts = []
        
        if 'news' in data and len(data['news']) > 0:
            parts.append("RECENT COMPETITOR NEWS:")
            for _, news in data['news'].head(5).iterrows():
                parts.append(f"- {news['COMPANY']}: {news['HEADLINE']}")
                parts.append(f"  {news['SUMMARY']}")
        
        if 'analyst_ratings' in data and len(data['analyst_ratings']) > 0:
            parts.append("\nRECENT ANALYST RATINGS:")
            for _, rating in data['analyst_ratings'].head(5).iterrows():
                parts.append(f"- {rating['COMPANY']}: {rating['RATING']} (${rating['PRICE_TARGET']} target)")
        
        return "\n".join(parts)
    
    def get_pdf_context(self, topic: str = "") -> str:
        """Get relevant context from PDFs"""
        if not self.pdf_intel.documents:
            return ""
        
        if topic:
            results = self.pdf_intel.search_documents(topic, max_results=3)
            if results:
                parts = ["\nADDITIONAL CONTEXT FROM DOCUMENTS:"]
                for result in results:
                    parts.append(f"\nFrom {result['filename']}:")
                    parts.append(result['context'])
                return "\n".join(parts)
        
        return ""
    
    def generate_questions(self, num_questions: int = 5):
        """Generate analyst questions using Claude"""
        if not self.client:
            st.error("⚠️ Anthropic API client not initialized. Please set ANTHROPIC_API_KEY environment variable.")
            return []
        
        context = f"""
{self.get_snowflake_context()}

{self.get_competitive_context()}

{self.get_pdf_context("NRR consumption AI competitive")}

KEY MARKET TRENDS:
- GenAI adoption accelerating
- Consumption model volatility concerns
- Data platform consolidation
- Competitive pressure from MongoDB, Databricks
"""
        
        prompt = f"""You are a senior Wall Street equity research analyst preparing for Snowflake's earnings call.

Based on this data, generate {num_questions} tough, specific questions analysts are likely to ask:

{context}

Focus on:
- NRR deceleration and consumption trends
- Competitive positioning vs MongoDB/Databricks
- AI strategy and GenAI workload adoption
- Growth sustainability and profitability balance
- Customer health and optimization behaviors

Format as JSON array:
[
  {{
    "id": "q1",
    "question": "full question text",
    "category": "Growth|Profitability|Competition|AI Strategy|Customer Trends",
    "difficulty": "Hard|Very Hard",
    "context": "why this matters",
    "data_points": ["relevant metrics"]
  }}
]

Return ONLY valid JSON."""
        
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = response.content[0].text
            start = content.find('[')
            end = content.rfind(']') + 1
            
            if start != -1 and end > start:
                questions = json.loads(content[start:end])
                st.session_state.questions = questions
                return questions
            
        except Exception as e:
            st.error(f"Error generating questions: {str(e)}")
            return []
    
    def generate_response(self, question: Dict[str, Any]):
        """Generate response for a question"""
        if not self.client:
            st.error("⚠️ Anthropic API client not initialized. Please set ANTHROPIC_API_KEY environment variable.")
            return None
        
        context = f"""
{self.get_snowflake_context()}

{self.get_competitive_context()}

{self.get_pdf_context(question['question'])}
"""
        
        prompt = f"""You are Snowflake's CFO preparing to answer this analyst question:

QUESTION: "{question['question']}"

Based on this data:
{context}

Prepare a comprehensive response that:
1. Leads with positive narrative
2. Acknowledges concerns directly with context
3. Uses specific metrics
4. Provides forward-looking commentary
5. Sounds natural (2-3 paragraphs max)

Format as JSON:
{{
  "talking_points": ["point 1", "point 2", "point 3"],
  "key_metrics": ["metric 1", "metric 2"],
  "response_text": "full response as CFO would deliver",
  "risk_level": "Low|Medium|High",
  "follow_up_concerns": ["potential follow-up 1", "potential follow-up 2"]
}}

Return ONLY valid JSON."""
        
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = response.content[0].text
            start = content.find('{')
            end = content.rfind('}') + 1
            
            if start != -1 and end > start:
                return json.loads(content[start:end])
            
        except Exception as e:
            st.error(f"Error generating response: {str(e)}")
            return None
    
    def run(self):
        """Main application"""
        # Header
        st.markdown("""
        <div class="main-header">
            <h1>📊 Earnings Call War Room</h1>
            <p style="font-size: 1.1rem; margin-top: 0.5rem;">
                AI-Powered Q&A Preparation for Snowflake Q3 FY2026
            </p>
        </div>
        """, unsafe_allow_html=True)
        
        # Load data
        self.load_data()
        
        # Sidebar
        with st.sidebar:
            st.header("⚙️ Configuration")
            
            # Data status
            st.subheader("📁 Data Status")
            data = st.session_state.snowflake_data
            st.metric("CSV Files Loaded", len(data))
            st.metric("PDF Documents", len(self.pdf_intel.documents))
            
            # PDF Upload
            st.subheader("📄 Upload PDFs")
            uploaded_files = st.file_uploader(
                "Add earnings transcripts, analyst reports, SEC filings",
                type=['pdf'],
                accept_multiple_files=True
            )
            
            if uploaded_files:
                with st.spinner("Processing PDFs..."):
                    for uploaded_file in uploaded_files:
                        if uploaded_file.name not in self.pdf_intel.processed_files:
                            self.pdf_intel.process_pdf(uploaded_file, uploaded_file.name)
                    st.success(f"Processed {len(uploaded_files)} PDFs")
            
            if self.pdf_intel.documents:
                st.markdown(self.pdf_intel.get_summary())
            
            st.divider()
            
            # Generation settings
            st.subheader("🎯 Generation Settings")
            num_questions = st.slider("Number of questions", 3, 10, 5)
            
            st.divider()
            
            # Export
            st.subheader("📥 Export")
            if st.session_state.questions:
                if st.button("Export to PDF", use_container_width=True):
                    st.info("PDF export functionality coming...")
        
        # Main content tabs
        tab1, tab2, tab3, tab4 = st.tabs([
            "🎯 Question Generator",
            "📊 Performance Dashboard",
            "🔍 Document Search",
            "📚 PDF Library"
        ])
        
        with tab1:
            st.header("Predicted Analyst Questions")
            st.markdown("""
            Generate tough questions based on Snowflake's performance, competitive dynamics, 
            and content from uploaded PDFs. Each question comes with a data-backed response.
            """)
            
            col1, col2 = st.columns([1, 1])
            with col1:
                if st.button("🎲 Generate New Questions", use_container_width=True):
                    with st.spinner("Analyzing data and generating questions..."):
                        self.generate_questions(num_questions)
            
            with col2:
                if st.session_state.questions and st.button("🔄 Clear Questions", use_container_width=True):
                    st.session_state.questions = []
                    st.session_state.selected_question = None
                    st.session_state.response = None
                    st.rerun()
            
            # Display questions
            if st.session_state.questions:
                st.divider()
                
                for i, q in enumerate(st.session_state.questions, 1):
                    with st.container():
                        col1, col2, col3 = st.columns([3, 1, 1])
                        
                        with col1:
                            st.markdown(f"### Question {i}")
                        with col2:
                            st.markdown(f"**{q['category']}**")
                        with col3:
                            difficulty_color = "🔴" if q['difficulty'] == "Very Hard" else "🟡"
                            st.markdown(f"{difficulty_color} **{q['difficulty']}**")
                        
                        st.markdown(f"*{q['question']}*")
                        
                        with st.expander("📌 Context & Data Points"):
                            st.info(q['context'])
                            st.markdown("**Key Data Points:**")
                            for dp in q['data_points']:
                                st.markdown(f"- {dp}")
                        
                        if st.button(f"📝 Generate Response", key=f"btn_{q['id']}"):
                            st.session_state.selected_question = q
                            with st.spinner("Generating data-backed response..."):
                                response = self.generate_response(q)
                                if response:
                                    st.session_state.response = response
                        
                        # Show response if this is the selected question
                        if (st.session_state.selected_question and 
                            st.session_state.selected_question['id'] == q['id'] and
                            st.session_state.response):
                            
                            resp = st.session_state.response
                            
                            # Risk indicator
                            risk_class = f"risk-{resp['risk_level'].lower()}"
                            st.markdown(f"""
                            <div class="metric-card {risk_class}">
                                <strong>Risk Level: {resp['risk_level']}</strong>
                            </div>
                            """, unsafe_allow_html=True)
                            
                            # Talking points
                            st.markdown("**🎯 Key Talking Points:**")
                            for point in resp['talking_points']:
                                st.markdown(f"- {point}")
                            
                            # Supporting metrics
                            st.markdown("**📊 Supporting Metrics:**")
                            cols = st.columns(len(resp['key_metrics']))
                            for idx, metric in enumerate(resp['key_metrics']):
                                with cols[idx]:
                                    st.metric("Supporting Data", metric)
                            
                            # Full response
                            st.markdown("**💬 Full Response:**")
                            st.markdown(f"""
                            <div class="response-card">
                                {resp['response_text'].replace(chr(10), '<br><br>')}
                            </div>
                            """, unsafe_allow_html=True)
                            
                            # Follow-up concerns
                            if resp['follow_up_concerns']:
                                st.warning("**⚠️ Potential Follow-Up Questions:**")
                                for concern in resp['follow_up_concerns']:
                                    st.markdown(f"- {concern}")
                        
                        st.divider()
            else:
                st.info("👆 Click 'Generate New Questions' to start")
        
        with tab2:
            st.header("Performance Dashboard")
            
            if 'snowflake_metrics' in st.session_state.snowflake_data:
                df = st.session_state.snowflake_data['snowflake_metrics']
                
                if len(df) >= 2:
                    latest = df.iloc[0]
                    previous = df.iloc[1]
                    
                    # Metrics overview
                    col1, col2, col3, col4 = st.columns(4)
                    
                    with col1:
                        revenue_growth = ((latest['TOTAL_REVENUE_M'] / previous['TOTAL_REVENUE_M']) - 1) * 100
                        st.metric(
                            "Total Revenue",
                            f"${latest['TOTAL_REVENUE_M']}M",
                            f"{revenue_growth:+.1f}% YoY"
                        )
                    
                    with col2:
                        nrr_change = latest['NRR_PERCENT'] - previous['NRR_PERCENT']
                        st.metric(
                            "NRR",
                            f"{latest['NRR_PERCENT']}%",
                            f"{nrr_change:+.0f} bps YoY",
                            delta_color="normal" if nrr_change >= 0 else "inverse"
                        )
                    
                    with col3:
                        cust_growth = ((latest['CUSTOMERS_1M_PLUS'] / previous['CUSTOMERS_1M_PLUS']) - 1) * 100
                        st.metric(
                            "Customers >$1M",
                            f"{latest['CUSTOMERS_1M_PLUS']}",
                            f"{cust_growth:+.1f}% YoY"
                        )
                    
                    with col4:
                        fcf_growth = ((latest['FCF_IN_MILLIONS'] / previous['FCF_IN_MILLIONS']) - 1) * 100
                        st.metric(
                            "Free Cash Flow",
                            f"${latest['FCF_IN_MILLIONS']}M",
                            f"{fcf_growth:+.1f}% YoY"
                        )
                    
                    # Detailed metrics
                    st.subheader("Detailed Metrics")
                    st.dataframe(df, use_container_width=True)
            
            # Competitive landscape
            if 'news' in st.session_state.snowflake_data:
                st.subheader("Competitive News")
                news_df = st.session_state.snowflake_data['news']
                
                for _, news in news_df.head(5).iterrows():
                    with st.expander(f"📰 {news['COMPANY']}: {news['HEADLINE']}"):
                        st.markdown(f"**Date:** {news['NEWS_DATE']}")
                        st.markdown(f"**Sentiment:** {news['SENTIMENT']}")
                        st.markdown(news['SUMMARY'])
        
        with tab3:
            st.header("Document Search")
            st.markdown("Search across all uploaded PDFs for relevant information")
            
            search_query = st.text_input("🔍 Search documents", placeholder="e.g., NRR, AI workloads, MongoDB")
            
            if search_query and self.pdf_intel.documents:
                results = self.pdf_intel.search_documents(search_query)
                
                st.markdown(f"### Found {len(results)} relevant documents")
                
                for result in results:
                    with st.expander(f"📄 {result['filename']} (Relevance: {result['relevance_score']:.2%})"):
                        st.markdown(f"**Matches:** {result['matches']}")
                        st.markdown(f"**Context:**")
                        st.markdown(result['context'])
                        
                        if result['metadata']:
                            st.markdown(f"**Pages:** {result['metadata'].get('pages', 'N/A')}")
            elif search_query:
                st.warning("No PDFs uploaded yet. Upload PDFs in the sidebar to enable search.")
        
        with tab4:
            st.header("PDF Library")
            
            if self.pdf_intel.documents:
                st.markdown(f"**Total Documents:** {len(self.pdf_intel.documents)}")
                
                for doc in self.pdf_intel.documents:
                    with st.expander(f"📄 {doc['filename']}"):
                        col1, col2, col3 = st.columns(3)
                        
                        with col1:
                            st.metric("Word Count", f"{doc['word_count']:,}")
                        with col2:
                            st.metric("Tables", len(doc['tables']))
                        with col3:
                            st.metric("Pages", doc['metadata'].get('pages', 'N/A'))
                        
                        st.markdown("**Preview:**")
                        preview = doc['text'][:1000] + "..." if len(doc['text']) > 1000 else doc['text']
                        st.text(preview)
                        
                        if doc['tables']:
                            st.markdown(f"**Tables Found:** {len(doc['tables'])}")
            else:
                st.info("📤 Upload PDFs using the sidebar to build your document library")


def main():
    """Main entry point"""
    app = EarningsQAApp()
    app.run()


if __name__ == "__main__":
    main()
