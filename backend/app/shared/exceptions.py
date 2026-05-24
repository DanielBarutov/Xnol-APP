class DomainError(Exception):
    """Base for all domain-level errors."""


class NotFoundError(DomainError):
    def __init__(self, entity: str, identifier: str) -> None:
        super().__init__(f"{entity} not found: {identifier}")


class AlreadyExistsError(DomainError):
    def __init__(self, entity: str, identifier: str) -> None:
        super().__init__(f"{entity} already exists: {identifier}")


class AuthenticationError(DomainError):
    def __init__(self, message: str = "Invalid credentials") -> None:
        super().__init__(message)


class AuthorizationError(DomainError):
    def __init__(self, message: str = "Access denied") -> None:
        super().__init__(message)


class ConflictError(DomainError):
    def __init__(self, message: str) -> None:
        super().__init__(message)
