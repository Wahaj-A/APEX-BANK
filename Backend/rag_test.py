from langchain_text_splitters import RecursiveCharacterTextSplitter
import os
from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS

# 1. Read the text from your saved file
with open("hbl_terms.txt", "r", encoding="utf-8") as file:
    pdf_text = file.read()

# 2. Set up the "meat cleaver" to chop the text
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000, 
    chunk_overlap=200, 
    length_function=len,
)

# 3. Actually chop the text
chunks = text_splitter.split_text(pdf_text)

# 4. See the results!
print(f"I chopped the document into {len(chunks)} separate chunks.")
print("--- Here is what the first chunk looks like: ---")
print(chunks[0])

print("\n--- Starting Step 3: Embeddings ---")

# 5. Load your Gemini API key from the .env file
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

# 6. Set up the Google Embedding model
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",  # <-- The brand new 2026 model name!
    google_api_key=api_key
)

# 7. Convert all 40 chunks into numbers and store them in a FAISS vector database
print("Converting text to numbers and saving to database... (this might take a few seconds)")
vector_database = FAISS.from_texts(chunks, embeddings)

# 8. Let's test the search! 
test_question = "What happens to the account if it is inoperative for 10 years?"
print(f"\nSearching database for: '{test_question}'")

# Search the database for the 2 chunks that mathematically match the question best
best_matches = vector_database.similarity_search(test_question, k=2)

print("\n--- Best Matching Chunk Found ---")
print(best_matches[0].page_content)