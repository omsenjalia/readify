git reset --hard origin/main
cd backend && python3 -m uvicorn main:app --reload --port 4890 --host 0.0.0.0
