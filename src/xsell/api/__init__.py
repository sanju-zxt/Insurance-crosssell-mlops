"""Serving layer: FastAPI app factory and request/response contract."""

from __future__ import annotations

__all__ = ["create_app"]


def create_app(*args, **kwargs):
    """Lazy re-export so importing the package stays cheap."""
    from xsell.api.main import create_app as _create_app

    return _create_app(*args, **kwargs)
