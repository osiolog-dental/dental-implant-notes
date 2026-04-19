from __future__ import annotations

import os
import sys

from pydantic_settings import BaseSettings, SettingsConfigDict


def _load_ssm_into_env() -> None:
    """
    In production, if AWS_SSM_PREFIX is set, fetch all SecureString parameters
    under that path from SSM and inject them into os.environ *before*
    pydantic-settings reads them.  This runs once at import time.

    No-ops silently when:
    - ENVIRONMENT != "production"
    - AWS_SSM_PREFIX is not set
    - boto3 is not installed (dev environment)
    """
    if os.environ.get("ENVIRONMENT", "development") != "production":
        return

    ssm_prefix = os.environ.get("AWS_SSM_PREFIX", "")
    if not ssm_prefix:
        return

    try:
        import boto3  # type: ignore[import]
    except ImportError:
        print(
            "[WARN] ENVIRONMENT=production and AWS_SSM_PREFIX is set, "
            "but boto3 is not installed — SSM params not loaded.",
            file=sys.stderr,
        )
        return

    region = os.environ.get("AWS_REGION", "ap-south-1")
    client = boto3.client("ssm", region_name=region)

    paginator = client.get_paginator("get_parameters_by_path")
    pages = paginator.paginate(
        Path=ssm_prefix,
        Recursive=True,
        WithDecryption=True,
    )

    loaded = 0
    # Normalise prefix so we can strip it cleanly (ensure trailing slash)
    prefix = ssm_prefix.rstrip("/") + "/"

    for page in pages:
        for param in page.get("Parameters", []):
            key = param["Name"].replace(prefix, "", 1)
            # Never overwrite a value that was already explicitly set in the environment
            # (lets CI/CD override individual vars without touching SSM)
            if key not in os.environ:
                os.environ[key] = param["Value"]
                loaded += 1

    print(f"[INFO] Loaded {loaded} vars from SSM path: {ssm_prefix}", file=sys.stderr)


# Pull SSM params into env before Settings reads them
_load_ssm_into_env()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database — required; app refuses to start without it
    DATABASE_URL: str = ""

    # Firebase
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""  # full JSON string or path

    # AWS / S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET_NAME: str = ""
    AWS_REGION: str = "ap-south-1"

    # SSM (production only — tells _load_ssm_into_env where to look)
    AWS_SSM_PREFIX: str = ""

    # Push notifications
    VAPID_KEY: str = ""  # Firebase Web Push VAPID key (from Firebase Console > Project Settings > Cloud Messaging)

    # App
    FRONTEND_URL: str = "http://localhost:3000"
    ENVIRONMENT: str = "development"

    def model_post_init(self, __context: object) -> None:  # noqa: ANN001
        if not self.DATABASE_URL:
            print(
                "[FATAL] DATABASE_URL is not set. "
                "Add DATABASE_URL to backend/.env or your environment before starting.",
                file=sys.stderr,
            )
            sys.exit(1)


settings = Settings()
