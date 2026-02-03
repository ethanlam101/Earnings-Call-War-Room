# Windows Setup Guide - Earnings Call War Room

## Quick Fix for the Error You're Seeing

The error `TypeError: Client.__init__() got an unexpected keyword argument 'proxies'` happens because the Anthropic API key needs to be set as an environment variable.

### Solution (Choose One):

### Option 1: Set Environment Variable (Recommended)

**Open PowerShell and run:**
```powershell
# Set for current session only
$env:ANTHROPIC_API_KEY = "your-api-key-here"

# Then run the app
streamlit run streamlit_app.py
```

**OR set permanently:**
```powershell
# Open System Properties
sysdm.cpl

# Go to Advanced tab → Environment Variables
# Under User Variables, click New:
# Variable name: ANTHROPIC_API_KEY
# Variable value: your-api-key-here
```

### Option 2: Create a .env File

**1. Create a file named `.env` in your project directory:**
```
ANTHROPIC_API_KEY=your-api-key-here
```

**2. Install python-dotenv:**
```bash
pip install python-dotenv
```

**3. The app will automatically load it**

### Option 3: Use Demo Mode (No API Key)

If you don't have an API key yet, you can test with sample data:

**1. Comment out the API calls temporarily**
**2. Use the demo_output.py to see sample questions**

```bash
python demo_output.py
```

## Complete Windows Setup Guide

### Step 1: Verify Python Installation

```powershell
python --version
# Should show Python 3.8 or higher
```

If Python is not installed:
1. Download from https://www.python.org/downloads/
2. **Important:** Check "Add Python to PATH" during installation

### Step 2: Create Virtual Environment (Recommended)

```powershell
# Navigate to your project folder
cd C:\Users\lamet\dsc\snowflake_oa

# Create virtual environment
python -m venv .venv

# Activate it
.venv\Scripts\Activate.ps1
```

**If you get execution policy error:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Step 3: Install Dependencies

```powershell
pip install -r requirements.txt
```

**Common Issues:**
- If `pip` not found: Use `python -m pip install -r requirements.txt`
- If packages fail to install: Try `pip install --upgrade pip` first

### Step 4: Set API Key

**Get your API key:**
1. Go to https://console.anthropic.com/
2. Sign in or create account
3. Go to API Keys section
4. Create a new key
5. Copy it

**Set the key (choose one method):**

**Method A: PowerShell (Session Only)**
```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-your-actual-key-here"
```

**Method B: Windows Environment Variables (Permanent)**
1. Press `Windows + R`
2. Type `sysdm.cpl` and press Enter
3. Click "Advanced" tab
4. Click "Environment Variables"
5. Under "User variables", click "New"
6. Variable name: `ANTHROPIC_API_KEY`
7. Variable value: `sk-ant-your-actual-key-here`
8. Click OK on all dialogs
9. **Restart PowerShell/Terminal**

**Method C: .env File (Recommended for Development)**
```powershell
# Create .env file
New-Item -Path .env -ItemType File

# Edit it with notepad
notepad .env
```

Add this line and save:
```
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

### Step 5: Run the App

```powershell
streamlit run streamlit_app.py
```

**Expected output:**
```
You can now view your Streamlit app in your browser.

  Local URL: http://localhost:8501
  Network URL: http://192.168.x.x:8501
```

Your default browser should open automatically to the app.

## Troubleshooting

### Issue: "streamlit: command not found"

**Solution:**
```powershell
python -m streamlit run streamlit_app.py
```

### Issue: "No module named 'streamlit'"

**Solution:**
```powershell
pip install streamlit
# Or reinstall all dependencies
pip install -r requirements.txt
```

### Issue: "Permission denied" when activating virtual environment

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: API key not recognized after setting

**Solutions:**
1. Restart your terminal/PowerShell completely
2. Verify it's set: `echo $env:ANTHROPIC_API_KEY` (PowerShell) or `echo %ANTHROPIC_API_KEY%` (CMD)
3. Try setting it directly in the session before running

### Issue: "Module not found" errors

**Solution:**
```powershell
# Make sure virtual environment is activated
.venv\Scripts\Activate.ps1

# Reinstall dependencies
pip install -r requirements.txt --upgrade
```

### Issue: PDFs not processing

**Solution:**
```powershell
# Install additional dependencies
pip install pdfplumber pypdf pillow
```

### Issue: Port 8501 already in use

**Solution:**
```powershell
# Use a different port
streamlit run streamlit_app.py --server.port 8502
```

## Data Setup

### Your CSV Files

The app expects CSV files in: `C:\Users\lamet\dsc\snowflake_oa\data\`

Create this folder structure:
```
snowflake_oa\
├── streamlit_app.py
├── requirements.txt
├── .env (optional)
└── data\
    ├── snowflake_ir_metrics.csv
    ├── data_peer_financial_metrics.csv
    ├── analyst_ratings.csv
    └── data_peer_news_snippets.csv
```

### Update File Paths

**Edit `streamlit_app.py` line 205:**

**Change from:**
```python
self.data_dir = Path("/mnt/user-data/uploads")
```

**Change to:**
```python
# Use relative path
self.data_dir = Path("./data")

# OR use absolute Windows path
# self.data_dir = Path(r"C:\Users\lamet\dsc\snowflake_oa\data")
```

## Testing the Setup

### Test 1: Check Python and Pip
```powershell
python --version
pip --version
```

### Test 2: Check Dependencies
```powershell
pip list | Select-String "streamlit|anthropic|pandas|pdfplumber"
```

### Test 3: Check API Key
```powershell
echo $env:ANTHROPIC_API_KEY
# Should show your key (or at least confirm it exists)
```

### Test 4: Run Demo (No API Required)
```powershell
python demo_output.py
```

### Test 5: Run Streamlit App
```powershell
streamlit run streamlit_app.py
```

## Alternative: Run Without Installation

If you're having trouble with the setup, you can use the React version:

1. Open `earnings_qa_tool.jsx` in the Claude.ai interface
2. It will render as an interactive artifact
3. No installation needed (but no PDF support)

## Getting Your API Key

### Free Tier (Testing)
1. Sign up at https://console.anthropic.com/
2. Get $5 free credits
3. Good for ~500 questions/responses

### Paid Tier (Production)
1. Add payment method
2. Pay-as-you-go pricing
3. ~$0.003 per question/response pair
4. ~$0.15 for 50 questions

### For This Project
- Testing: Free tier is sufficient
- Production: ~$5-10/month for weekly use

## Project Structure

```
C:\Users\lamet\dsc\snowflake_oa\
│
├── .venv\                          # Virtual environment (created by you)
├── data\                           # Your CSV files (create this)
│   ├── snowflake_ir_metrics.csv
│   ├── analyst_ratings.csv
│   └── ...
│
├── pdfs\                           # PDFs to upload (optional)
│   ├── mongodb_q3_transcript.pdf
│   └── ...
│
├── streamlit_app.py                # Main application
├── requirements.txt                # Dependencies
├── .env                            # API key (create this)
│
├── earnings_qa_tool.jsx            # React version
├── earnings_qa_tool.py             # Python CLI version
│
└── docs\                           # Documentation
    ├── COMPLETE_SOLUTION_GUIDE.md
    ├── STREAMLIT_GUIDE.md
    └── README_STREAMLIT.md
```

## Quick Command Reference

```powershell
# Setup
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Set API Key (for session)
$env:ANTHROPIC_API_KEY = "your-key"

# Run App
streamlit run streamlit_app.py

# Run on different port
streamlit run streamlit_app.py --server.port 8502

# Deactivate virtual environment
deactivate
```

## Next Steps

1. ✅ Fix the API key error (use methods above)
2. ✅ Create `data\` folder and add your CSV files
3. ✅ Update file paths in `streamlit_app.py`
4. ✅ Run the app: `streamlit run streamlit_app.py`
5. ✅ Upload PDFs via the sidebar
6. ✅ Generate questions and responses

## Getting Help

If you're still stuck after trying these solutions:

1. Check what error you're getting (copy full traceback)
2. Verify Python version: `python --version`
3. Verify API key is set: `echo $env:ANTHROPIC_API_KEY`
4. Try running the demo first: `python demo_output.py`
5. Share the specific error message

The most common issue is the API key not being set properly. Make sure you:
- Set the environment variable
- Restart your terminal after setting
- Verify it's set before running the app
