from __future__ import annotations


class NotFoundError(Exception):
    """Raised when a requested resource does not exist."""

    def __init__(self, detail: str = "Resource not found") -> None:
        self.detail = detail
        super().__init__(detail)


class ForbiddenError(Exception):
    """Raised when the caller does not have permission to access a resource."""

    def __init__(self, detail: str = "Access forbidden") -> None:
        self.detail = detail
        super().__init__(detail)


class ConflictError(Exception):
    """Raised when an operation would create a duplicate or conflict."""

    def __init__(self, detail: str = "Resource conflict") -> None:
        self.detail = detail
        super().__init__(detail)
