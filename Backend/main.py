import os
import time
import urllib.parse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv
from starlette.requests import Request
from starlette.responses import RedirectResponse

from logger import logger

# Import your existing banking and AI logic
import bank_logic
from bank_logic import Bank, Auth
import agent_logic
import rag_agent
import weather
import weather_agent
import crypto
import crypto_agent
import email_agent
import tavily_agent
import image_agent
import email_reader_agent
import calendar_agent
import google_oauth

# Load the Gemini API key from the .env file
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

# Initialize the FastAPI application
app = FastAPI(title="AI Banking CRM API")


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """Log API method/path/status/duration without request bodies."""
    started = time.perf_counter()
    try:
        response = await call_next(request)
        duration_ms = (time.perf_counter() - started) * 1000
        logger.info(
            "HTTP %s %s -> %s (%.1f ms)",
            request.method, request.url.path, response.status_code, duration_ms
        )
        return response
    except Exception:
        duration_ms = (time.perf_counter() - started) * 1000
        logger.exception(
            "Unhandled exception during %s %s (%.1f ms)",
            request.method, request.url.path, duration_ms
        )
        raise


# Configure CORS so the React frontend can talk to this backend
app.add_middleware(
    CORSMiddleware,
  allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the Bank and Auth classes
bank = Bank()
auth = Auth()

# New modular AI agents. They read configuration from environment variables
# but do not perform network calls until their endpoints are used.
tavily_search_agent = tavily_agent.TavilySearchAgent()
image_generation_agent = image_agent.ImageGenerationAgent()
email_reader = email_reader_agent.EmailReaderAgent()
calendar_agent_instance = calendar_agent.CalendarAgent()

# ==========================================
# 📦 PYDANTIC MODELS (Data Validation)
# ==========================================
class UserCredentials(BaseModel):
    email: str
    password: str

class AccountCreate(BaseModel):
    name: str
    email: str
    starting_balance: float = 0.0

class Transaction(BaseModel):
    account_id: int
    amount: float
    email: str  # <--- NEW: Requires email for verification

class Transfer(BaseModel):
    from_account_id: int
    to_account_id: int
    amount: float
    email: str  # <--- NEW: Requires email for verification

class RAGQuery(BaseModel):
    question: str

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    text: str


class WeatherAgentMessage(BaseModel):
    user_text: str
    history: List[ChatMessage] = []

class CryptoAgentMessage(BaseModel):
    user_text: str
    history: List[ChatMessage] = []

class AgentChat(BaseModel):
    user_text: str
    history: List[ChatMessage] = []
    email: str  # <--- Added to receive the email from the frontend


class EmailDraftRequest(BaseModel):
    prompt: str
    user_email: str


class EmailSendRequest(BaseModel):
    recipient: str
    subject: str
    body: str
    user_email: str

class WebSearchRequest(BaseModel):
    query: str
    max_results: int = 5

class ImageGenerationRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "1:1"
    image_size: str = "1K"

class EmailReaderRequest(BaseModel):
    question: str
    limit: int = 10
    user_email: str

class CalendarEventRequest(BaseModel):
    summary: str
    start: str
    end: str
    timezone: str = "Asia/Karachi"
    description: str = ""
    location: str = ""
    user_email: str


class CalendarAgentMessage(BaseModel):
    user_text: str
    history: List[ChatMessage] = []
    user_email: str

# ==========================================
# 🔐 AUTHENTICATION ENDPOINTS
# ==========================================
@app.post("/api/signup")
def signup(req: UserCredentials):
    try:
        auth.signup(req.email, req.password)
        logger.info("AUTH signup successful")
        return {"message": "Account created"}
    except ValueError as e:
        logger.warning("AUTH signup failed")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/login")
def login(req: UserCredentials):
    try:
        email = auth.login(req.email, req.password)
        logger.info("AUTH login successful")
        return {"email": email}
    except ValueError as e:
        logger.warning("AUTH login failed")
        raise HTTPException(status_code=401, detail=str(e))


@app.get("/api/me")
def get_current_user(user_email: str):
    """Return the logged-in Apex user's profile and Google connection status."""
    email = (user_email or "").strip().lower()
    if not email:
        raise HTTPException(status_code=401, detail="User is not authenticated.")

    try:
        conn = bank_logic.get_connection()
        user = conn.execute(
            "SELECT user_id, email, created_at FROM users WHERE LOWER(email) = LOWER(?)",
            (email,),
        ).fetchone()
        conn.close()

        if not user:
            raise HTTPException(status_code=401, detail="User session is invalid.")

        gmail = google_oauth.get_connection_status(email, "gmail")
        calendar = google_oauth.get_connection_status(email, "calendar")

        return {
            "user_id": user["user_id"],
            "email": user["email"],
            "created_at": user["created_at"],
            "google": {"gmail": gmail, "calendar": calendar},
            "is_google_connected": gmail["connected"] or calendar["connected"],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("AUTH current-user lookup failed")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 🏦 BANKING ENDPOINTS
# ==========================================
@app.get("/api/accounts")
def get_accounts():
    accounts = bank.list_accounts()
    return [
        {
            "account_id": a.account_id, 
            "account_number": a.account_number, 
            "name": a.name, 
            "balance": a.balance
        } 
        for a in accounts
    ]

@app.get("/api/accounts/{account_id}")
def get_account(account_id: int, email: str):
    acc = bank.find_account(account_id)
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
        
    # 🔒 SECURITY CHECK: Ensure account belongs to logged-in user
    if (acc.email or '').strip().lower() != (email or '').strip().lower():
        raise HTTPException(status_code=403, detail="Permission Denied: You can only view your own account balance.")
        
    return {"account_id": acc.account_id, "account_number": acc.account_number, "name": acc.name, "balance": acc.balance}

@app.get("/api/accounts/{account_id}/transactions")
def get_transactions(account_id: str, email: str):
    acc = bank.find_account(account_id)
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
        
    if (acc.email or '').strip().lower() != (email or '').strip().lower():
        raise HTTPException(status_code=403, detail="Permission Denied: You can only view your own transaction history.")
        
    # Since bank_logic.py already formats this as a list of dictionaries,
    # we can safely return it directly to the frontend!
    history = bank.get_transaction_history(account_id)
    return history


@app.post("/api/accounts")
def create_account(req: AccountCreate):
    try:
        acc = bank.create_account(req.name, req.starting_balance, req.email)
        logger.info("BANK account created successfully")
        return {"message": "Success", "account_id": acc.account_id, "balance": acc.balance, "account_number": acc.account_number}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/deposit")
def deposit(req: Transaction):
    try:
        acc = bank.find_account(req.account_id)
        if not acc:
            raise HTTPException(status_code=404, detail="Account not found")
            
        # 🔒 SECURITY CHECK: Compare email to email!
        if (acc.email or '').strip().lower() != (req.email or '').strip().lower():
            raise HTTPException(status_code=403, detail="Permission Denied: You can only deposit into your own account.")
            
        acc = bank.deposit(req.account_id, req.amount)
        logger.info("BANK deposit completed successfully")
        return {"message": "Success", "new_balance": acc.balance, "name": acc.name}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@app.post("/api/withdraw")
def withdraw(req: Transaction):
    try:
        # 🚨 FIX 1: Removed req.email from the arguments
        acc = bank.find_account(req.account_id)
        if not acc:
            raise HTTPException(status_code=404, detail="Account not found")
            
        # 🚨 FIX 2: Compare email to email!
        if (acc.email or '').strip().lower() != (req.email or '').strip().lower():
            raise HTTPException(status_code=403, detail="Permission Denied: You can only withdraw from your own account.")

        acc = bank.withdraw(req.account_id, req.amount)
        logger.info("BANK withdrawal completed successfully")
        return {"message": "Success", "new_balance": acc.balance, "name": acc.name}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/transfer")
def transfer(req: Transfer):
    try:
        # 🚨 FIX 3: Removed req.email from the arguments
        sender = bank.find_account(req.from_account_id)
        if not sender:
            raise HTTPException(status_code=404, detail="Sender account not found")
            
        # 🚨 FIX 4: Compare email to email!
        if (sender.email or '').strip().lower() != (req.email or '').strip().lower():
            raise HTTPException(status_code=403, detail="Permission Denied: You can only transfer funds out of your own account.")

        sender, receiver = bank.transfer(req.from_account_id, req.to_account_id, req.amount)
        logger.info("BANK transfer completed successfully")
        return {
            "message": "Success", 
            "from_account": {"name": sender.name, "balance": sender.balance},
            "to_account": {"name": receiver.name, "balance": receiver.balance}
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    
# ==========================================
# 🤖 AI AGENT ENDPOINTS
# ==========================================
@app.post("/api/rag/ask")
def ask_policy(req: RAGQuery):
    try:
        logger.info("AI policy assistant request received")
        answer = rag_agent.ask_bank_policy(req.question)
        logger.info("AI policy assistant response generated")
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agent/chat")
def chat_with_agent(req: AgentChat):
    try:
        formatted_history = [(msg.role, msg.text) for msg in req.history]
        
        # 🔒 SECURITY LOCK: Find the user's specific account number based on their email
        current_user_account_number = None
        for acc in bank.list_accounts():
            if acc.email == req.email:
                # 🚨 THE FIX: Pass the 6-digit account_number, not the internal account_id!
                current_user_account_number = acc.account_number
                break
        
        logger.info("AI banking assistant request received")
        response = agent_logic.send_message(
            bank=bank, 
            api_key=API_KEY, 
            history=formatted_history, 
            user_text=req.user_text,
            user_account_id=current_user_account_number  # Now passes the 6-digit number (e.g., 229161)
        )
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    


# ==========================================
# ✉️ AI EMAIL AGENT ENDPOINTS
# ==========================================
@app.post("/api/email/draft")
def create_email_draft(req: EmailDraftRequest):
    try:
        logger.info("AI email draft request received")
        draft = email_agent.create_draft(req.prompt, API_KEY)
        logger.info("AI email draft generated")
        return draft
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("AI email draft failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/email/send")
def send_email(req: EmailSendRequest):
    try:
        email_agent.send_email(req.user_email, req.recipient, req.subject, req.body)
        logger.info("EMAIL sent successfully")
        return {"message": "Email sent successfully."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("EMAIL send failed")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 🔐 GOOGLE CONNECTIONS
# ==========================================
@app.get("/api/google/connect")
def google_connect(provider: str, user_email: str):
    try:
        return {"authorization_url": google_oauth.create_authorization_url(user_email, provider)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("GOOGLE connect URL creation failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/google/callback")
def google_callback(code: str, state: str):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    try:
        result = google_oauth.finish_authorization(code, state)
        provider = result["provider"]
        user_email = result["user_email"]  # Grab the email from the result
        return RedirectResponse(
            url=(
                f"{frontend_url}/dashboard"
                f"?google_connected=true"
                f"&provider={urllib.parse.quote(provider)}"
                f"&user_email={urllib.parse.quote(user_email)}" # Pass it to the frontend
            )
        )
    except Exception as e:
        logger.exception("GOOGLE OAuth callback failed")
        return RedirectResponse(
            url=(
                f"{frontend_url}/dashboard"
                f"?google_error={urllib.parse.quote(str(e))}"
            )
        )

@app.get("/api/google/status")
def google_status(provider: str, user_email: str):
    try:
        return google_oauth.get_connection_status(user_email, provider)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/google/status")
def google_disconnect(provider: str, user_email: str):
    try:
        google_oauth.disconnect(user_email, provider)
        return {"message": "Google connection removed."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 🧩 MODULAR AI AGENTS
# ==========================================
@app.post("/api/agent/web-search")
def web_search_agent(req: WebSearchRequest):
    try:
        return tavily_search_agent.search(req.query, req.max_results)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("WEB SEARCH agent failed")
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/api/agent/image")
def image_generation(req: ImageGenerationRequest):
    try:
        return image_generation_agent.generate(prompt=req.prompt, aspect_ratio=req.aspect_ratio, image_size=req.image_size)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("IMAGE generation agent failed")
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/api/email/read")
def read_emails(req: EmailReaderRequest):
    try:
        return email_reader.answer_question(req.user_email, req.question, req.limit)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        # google_oauth.get_credentials() raises RuntimeError when the user
        # hasn't connected Gmail yet (or the stored token can't be decrypted).
        # That's an expected "please connect Google" state, not a server
        # failure - report it as 400 so the frontend can show a clear
        # "Connect Google" prompt instead of a generic error.
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("EMAIL reader agent failed")
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/api/calendar/events")
def get_calendar_events(limit: int = 10, user_email: str = ""):
    try:
        return {"events": calendar_agent_instance.upcoming_events(user_email, limit)}
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("CALENDAR read failed")
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/api/calendar/events")
def create_calendar_event(req: CalendarEventRequest):
    try:
        return calendar_agent_instance.create_event(
            req.user_email, req.summary, req.start, req.end, req.timezone, req.description, req.location
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("CALENDAR create failed")
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/api/calendar/ask")
def ask_calendar_agent(req: CalendarAgentMessage):
    try:
        history = [
            {"role": message.role, "text": message.text}
            for message in req.history
        ]
        response = calendar_agent_instance.ask(
            user_email=req.user_email,
            user_text=req.user_text,
            history=history,
            api_key=API_KEY,
        )
        return {"response": response}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("CALENDAR AI agent failed")
        raise HTTPException(status_code=502, detail=str(e))


# ==========================================
# 🌤️ WEATHER ENDPOINTS
# ==========================================
@app.get("/api/weather/cities")
def get_weather_cities():
    """Return live weather for the five supported cities."""
    try:
        logger.info("WEATHER live data request for all supported cities")
        return {"cities": weather.get_all_weather()}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/api/weather/{city}")
def get_weather_city(city: str):
    """Return live weather and a five-day forecast for one supported city."""
    try:
        logger.info("WEATHER live data request for one city")
        return weather.get_weather(city)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/api/weather/ask")
def ask_weather_agent(req: WeatherAgentMessage):
    """Answer a weather question using live data through the Gemini weather agent."""
    try:
        history = [{"role": msg.role, "text": msg.text} for msg in req.history]
        logger.info("AI weather assistant request received")
        response = weather_agent.ask_weather(
            user_text=req.user_text,
            history=history,
            api_key=API_KEY,
        )
        return {"response": response}
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# ₿ CRYPTO ENDPOINTS
# ==========================================
@app.get("/api/crypto/currencies")
def get_crypto_currencies():
    """Return live market data for the five supported cryptocurrencies."""
    try:
        logger.info("CRYPTO live market data request for all supported assets")
        return {"currencies": crypto.get_all_crypto()}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/api/crypto/{asset}")
def get_crypto_asset(asset: str):
    """Return live 24-hour market data for one supported cryptocurrency."""
    try:
        logger.info("CRYPTO live market data request for one asset")
        return crypto.get_crypto(asset)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/api/crypto/ask")
def ask_crypto_agent(req: CryptoAgentMessage):
    """Answer a crypto question using live market data through the Gemini agent."""
    try:
        history = [{"role": msg.role, "text": msg.text} for msg in req.history]
        logger.info("AI crypto assistant request received")
        response = crypto_agent.ask_crypto(
            user_text=req.user_text,
            history=history,
            api_key=API_KEY,
        )
        return {"response": response}
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 🏃‍♂️ SERVER RUNNER
# ==========================================
if __name__ == "__main__":
    import uvicorn
    # Runs the FastAPI server on port 8000
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)