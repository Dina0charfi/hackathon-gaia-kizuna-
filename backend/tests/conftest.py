"""Tests never use the private backend/.env (gaia.main loads it at import): no real email, no spent quota, no real key.

A variable set to "" wins over the file in gaia.main (setdefault) and counts as missing everywhere else."""
import os
import tempfile
from pathlib import Path

for _k in ("GAIA_SMTP_HOST", "GAIA_SMTP_PORT", "GAIA_SMTP_USER", "GAIA_SMTP_PASSWORD", "GAIA_SMTP_FROM", "GAIA_WA_TOKEN", "GAIA_WA_PHONE_ID",
           "PLANTNET_API_KEY", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "GAIA_LLM_PROVIDER", "GAIA_LLM_API_KEY", "GAIA_LLM_BASE_URL",
           "GAIA_LLM_OPENAI_MODEL", "GAIA_LLM_LEAF_MODEL", "GAIA_LLM_FALLBACK_MODELS", "GAIA_FREE_MODEL", "GAIA_HF_TOKEN"):
    os.environ[_k] = ""
os.environ["GAIA_ENV_FILE"] = str(Path(tempfile.gettempdir()) / "gaia-tests-no.env")
os.environ["GAIA_MONITOR"] = "0"
