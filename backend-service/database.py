"""
database.py — SQLAlchemy engine and session configuration.

To switch to PostgreSQL, replace DATABASE_URL with:
  postgresql://user:password@localhost:5432/traffic_db
and install: pip install psycopg2-binary
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# ─── Database URL ──────────────────────────────────────────────────────────
# SQLite for local dev — swap to PostgreSQL for production
DATABASE_URL = "sqlite:///./traffic.db"
# DATABASE_URL = "postgresql://user:password@localhost:5432/traffic_db"

# ─── Engine ────────────────────────────────────────────────────────────────
# connect_args is required only for SQLite (thread-safety)
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # Remove for PostgreSQL
)

# ─── Session Factory ───────────────────────────────────────────────────────
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ─── Declarative Base ──────────────────────────────────────────────────────
Base = declarative_base()


# ─── Dependency ────────────────────────────────────────────────────────────
def get_db():
    """FastAPI dependency that provides a DB session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
