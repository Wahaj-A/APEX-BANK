"""
BANK LOGIC MODULE
--------------------
Same Account / Transaction / Bank classes as simple_banking_oop_sqlite.py,
with the console menu removed. This file has no print()/input() calls —
it's pure logic, so it can be reused by the console app, the Streamlit
app, or anything else that wants to talk to the same database.
"""

import sqlite3
import random
import hashlib
import os
from datetime import datetime
from logger import logger



DB_FILE = "banking.db"


def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS accounts (
            account_id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_number TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            balance REAL NOT NULL DEFAULT 0,
            email TEXT 
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            balance_after REAL NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (account_id) REFERENCES accounts (account_id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS google_connections (
            connection_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            provider TEXT NOT NULL,
            google_email TEXT NOT NULL,
            token_encrypted TEXT NOT NULL,
            scopes TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(user_email, provider)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS google_oauth_states (
            state TEXT PRIMARY KEY,
            user_id INTEGER,
            user_email TEXT NOT NULL,
            provider TEXT NOT NULL,
            created_at TEXT NOT NULL,
            code_verifier TEXT,
            FOREIGN KEY (user_id) REFERENCES users (user_id)
        )
    """)

    # Backward-compatible migration for databases created before user_id
    # was added to the OAuth-state table.
    columns = {row[1] for row in conn.execute("PRAGMA table_info(google_oauth_states)").fetchall()}
    if "user_id" not in columns:
        conn.execute("ALTER TABLE google_oauth_states ADD COLUMN user_id INTEGER")
    if "code_verifier" not in columns:
        conn.execute("ALTER TABLE google_oauth_states ADD COLUMN code_verifier TEXT")

    # Backfill existing states where possible. Case-insensitive match so
    # accounts created before email normalization still backfill correctly.
    conn.execute("""
        UPDATE google_oauth_states
        SET user_id = (
            SELECT user_id FROM users WHERE LOWER(users.email) = LOWER(google_oauth_states.user_email)
        )
        WHERE user_id IS NULL
    """)

    conn.commit()
    conn.close()


class Auth:
    """Handles user signup/login. Passwords are never stored in plain text —
    each password is combined with a random 'salt' and run through a hashing
    function thousands of times (PBKDF2), which is deliberately slow to make
    password-guessing attacks impractical, even if the database ever leaked."""

    def __init__(self):
        init_db()

    def _hash_password(self, password, salt):
        return hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt),
            100_000  # number of hashing rounds — higher = slower to crack
        ).hex()

    def signup(self, email, password):
        # Normalize to lowercase so "John@Gmail.com" and "john@gmail.com" are
        # always treated as the same account everywhere in the app (Google
        # connection lookups, /api/me, etc. all compare case-insensitively).
        email = email.strip().lower()
        if not email or not password:
            raise ValueError("Email and password are required.")
        if len(password) < 4:
            raise ValueError("Password must be at least 4 characters.")

        conn = get_connection()
        existing = conn.execute(
            "SELECT 1 FROM users WHERE LOWER(email) = LOWER(?)", (email,)
        ).fetchone()
        
        if existing:
            conn.close()
            raise ValueError("That email is already registered.")

        salt = os.urandom(16).hex()
        password_hash = self._hash_password(password, salt)

        conn.execute(
            "INSERT INTO users (email, password_hash, salt, created_at) VALUES (?, ?, ?, ?)",
            (email, password_hash, salt, datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        )
        conn.commit()
        conn.close()
        logger.info("AUTH signup completed")

    def login(self, email, password):
        # Case-insensitive lookup: this also covers any older accounts that
        # were created before emails were normalized to lowercase on signup.
        conn = get_connection()
        row = conn.execute(
            "SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),)
        ).fetchone()
        conn.close()

        if row is None:
            raise ValueError("Invalid email or password.")

        candidate_hash = self._hash_password(password, row["salt"])
        if candidate_hash != row["password_hash"]:
            logger.warning("AUTH invalid credentials")
            raise ValueError("Invalid email or password.")

        logger.info("AUTH credentials verified")
        return row["email"]


class Account:
    def __init__(self, row):
        self.account_id = row["account_id"]
        self.account_number = row["account_number"]
        self.name = row["name"]
        self.balance = row["balance"]
        self.email = row["email"]  # <--- Change this line!

    def __str__(self):
        return (f"ID {self.account_id} | Account #{self.account_number}: "
                f"{self.name} — balance: {self.balance}")

class Transaction:
    def __init__(self, row):
        self.tx_type = row["type"]
        self.amount = row["amount"]
        self.balance_after = row["balance_after"]
        self.timestamp = row["timestamp"]

    def __str__(self):
        return f"[{self.timestamp}] {self.tx_type.upper():<10} {self.amount:<10} (balance after: {self.balance_after})"


class Bank:
    def __init__(self, name="My Bank"):
        self.name = name
        init_db()

    def _generate_account_number(self, conn):
        while True:
            candidate = str(random.randint(10_000, 9_999_999))
            exists = conn.execute(
                "SELECT 1 FROM accounts WHERE account_number = ?", (candidate,)
            ).fetchone()
            if not exists:
                return candidate

    def create_account(self, name, starting_balance=0):
        conn = get_connection()
        account_number = self._generate_account_number(conn)

        cursor = conn.execute(
            "INSERT INTO accounts (account_number, name, balance) VALUES (?, ?, ?)",
            (account_number, name, starting_balance)
        )
        account_id = cursor.lastrowid
        conn.commit()
        conn.close()

        if starting_balance > 0:
            self._log_transaction(account_id, "deposit", starting_balance, starting_balance)

        logger.info("BANK account created")
        return self.find_account(account_id)

    def find_account(self, account_id):
        conn = get_connection()
        row = conn.execute(
            "SELECT * FROM accounts WHERE account_id = ?", (account_id,)
        ).fetchone()
        conn.close()
        return Account(row) if row else None

    # 1. Update find_account to search by the account_number column
    def find_account(self, account_identifier):
        conn = get_connection()
        row = conn.execute(
            "SELECT * FROM accounts WHERE account_number = ?", (str(account_identifier),)
        ).fetchone()
        conn.close()
        return Account(row) if row else None

    # 2. Update create_account so it fetches the new account by its number
    def create_account(self, name: str, starting_balance: float, email: str = ""):
        import random
        account_number = str(random.randint(100000, 999999))
        
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO accounts (account_number, name, balance, email) VALUES (?, ?, ?, ?)",
            (account_number, name, starting_balance, email)
        )
        conn.commit()
        conn.close()
        
        # 🚨 Changed this line so it uses the account_number!
        return self.find_account(account_number)

    def deposit(self, account_identifier, amount: float):
        acc = self.find_account(account_identifier)
        if not acc:
            raise ValueError("Account not found")

        conn = get_connection()
        # 1. Update the account balance
        conn.execute(
            "UPDATE accounts SET balance = balance + ? WHERE account_id = ?",
            (amount, acc.account_id)
        )
        
        # 2. Log the transaction (Matching your exact schema)
        new_balance = acc.balance + amount
        conn.execute(
            "INSERT INTO transactions (account_id, type, amount, balance_after, timestamp) VALUES (?, ?, ?, ?, datetime('now'))",
            (acc.account_id, "Deposit", amount, new_balance)
        )
        
        conn.commit()
        conn.close()
        logger.info("BANK deposit completed")
        return self.find_account(account_identifier)

    def withdraw(self, account_identifier, amount: float):
        acc = self.find_account(account_identifier)
        if not acc or acc.balance < amount:
            raise ValueError("Insufficient funds or account not found")
        
        conn = get_connection()
        # 1. Update the account balance
        conn.execute(
            "UPDATE accounts SET balance = balance - ? WHERE account_id = ?",
            (amount, acc.account_id)
        )
        
        # 2. Log the transaction (Matching your exact schema)
        new_balance = acc.balance - amount
        conn.execute(
            "INSERT INTO transactions (account_id, type, amount, balance_after, timestamp) VALUES (?, ?, ?, ?, datetime('now'))",
            (acc.account_id, "Withdraw", amount, new_balance)
        )
        
        conn.commit()
        conn.close()
        return self.find_account(account_identifier)
    
    # 7. Update transfer (if you have this function in bank_logic.py)
    def transfer(self, from_account_identifier, to_account_identifier, amount: float):
        sender = self.find_account(from_account_identifier)
        receiver = self.find_account(to_account_identifier)
        
        if not sender or sender.balance < amount:
            raise ValueError("Insufficient funds in sender account or account not found")
        if not receiver:
            raise ValueError("Receiver account not found")
            
        conn = get_connection()
        conn.execute("UPDATE accounts SET balance = balance - ? WHERE account_number = ?", (amount, str(from_account_identifier)))
        conn.execute("UPDATE accounts SET balance = balance + ? WHERE account_number = ?", (amount, str(to_account_identifier)))
        conn.commit()
        conn.close()
        
        return self.find_account(from_account_identifier), self.find_account(to_account_identifier)
    def list_accounts(self):
        conn = get_connection()
        rows = conn.execute("SELECT * FROM accounts").fetchall()
        conn.close()
        return [Account(row) for row in rows]

    def get_transaction_history(self, account_identifier):
        acc = self.find_account(account_identifier)
        if not acc:
            return []
            
        conn = get_connection()
        # Fetching based on your schema's account_id and transaction_id
        rows = conn.execute(
            "SELECT * FROM transactions WHERE account_id = ? ORDER BY transaction_id DESC",
            (acc.account_id,)
        ).fetchall()
        conn.close()
        
        # Assuming you return standard dictionaries for FastAPI to parse
        return [dict(row) for row in rows]