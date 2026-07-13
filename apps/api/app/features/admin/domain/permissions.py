"""Admin RBAC role → permission mapping."""

from typing import Final

ROLE_PERMISSIONS: Final[dict[str, frozenset[str]]] = {
    "superadmin": frozenset(
        {
            "admin:read",
            "catalog:write",
            "inventory:write",
            "orders:write",
            "customers:read",
            "customers:write",
        }
    ),
    "viewer": frozenset({"admin:read"}),
}


def permissions_for_role(role: str) -> frozenset[str]:
    return ROLE_PERMISSIONS.get(role, frozenset())
