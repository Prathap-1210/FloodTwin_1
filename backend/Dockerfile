# =========================================================
# FloodTwin AI - Railway Backend
# Python 3.13 + FastAPI + Six ML Models
# =========================================================

FROM python:3.13-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# ---------------------------------------------------------
# 1. Install Python dependencies
# ---------------------------------------------------------

COPY requirements.txt ./

RUN python -m pip install --no-cache-dir -r requirements.txt

# ---------------------------------------------------------
# 2. Copy FloodTwin backend
# ---------------------------------------------------------

COPY app/ ./app/
COPY ml/ ./ml/
COPY models/ ./models/
COPY data/ ./data/
COPY scripts/ ./scripts/

# ---------------------------------------------------------
# 3. Download complete Model 1 from GitHub Release
#    Replaces the 134-byte Git LFS pointer
# ---------------------------------------------------------

RUN python -c "import pathlib,urllib.request,hashlib,sys; p=pathlib.Path('/app/models/model1/flood_depth_model.joblib'); url='https://github.com/Prathap-1210/FloodTwin_1/releases/download/models-v1/flood_depth_model_candidate_80.joblib'; expected='492FC797039D505615C4AE15A82C6035FFD83F27F8B1D243A03CABC8085FA9E3'; print('Downloading FloodTwin Model 1...',flush=True); urllib.request.urlretrieve(url,str(p)); actual=hashlib.sha256(p.read_bytes()).hexdigest().upper(); print('Model size:',p.stat().st_size,'bytes',flush=True); print('SHA256:',actual,flush=True); sys.exit(0 if actual==expected else 'ERROR: Model 1 SHA256 verification failed')"

# ---------------------------------------------------------
# 4. Validate Model 1 size
# ---------------------------------------------------------

RUN python -c "import pathlib; p=pathlib.Path('/app/models/model1/flood_depth_model.joblib'); assert 100_000_000 < p.stat().st_size < 250_000_000, 'Model 1 is missing or incomplete'; print('FloodTwin Model 1 verified successfully')"

# ---------------------------------------------------------
# 5. Start FastAPI
# ---------------------------------------------------------

CMD ["sh", "-c", "exec python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]