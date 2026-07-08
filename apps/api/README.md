# FastAPI Backend

Feature-first modular monolith. See `.cursor/rules/backend/`.

## Run

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health: http://localhost:8000/health

## Structure

```
app/
├── main.py
├── core/
└── features/
    └── <feature>/
        ├── presentation/
        ├── application/
        ├── domain/
        └── infrastructure/
```
