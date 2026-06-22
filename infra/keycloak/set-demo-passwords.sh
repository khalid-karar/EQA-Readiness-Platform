#!/bin/bash
# Run inside the Keycloak service after deploy (password from Railway secret, not committed):
#   railway run --service keycloak bash /opt/keycloak/set-demo-passwords.sh
set -euo pipefail

if [[ -z "${KEYCLOAK_DEMO_USER_PASSWORD:-}" ]]; then
  echo "KEYCLOAK_DEMO_USER_PASSWORD is required" >&2
  exit 1
fi

/opt/keycloak/bin/kcadm.sh config credentials \
  --server "http://127.0.0.1:8080" \
  --realm master \
  --user "${KEYCLOAK_ADMIN:-admin}" \
  --password "${KEYCLOAK_ADMIN_PASSWORD}"

for username in cae.demo audit.demo board.demo fresh.demo; do
  /opt/keycloak/bin/kcadm.sh set-password -r eqa --username "$username" \
    --new-password "$KEYCLOAK_DEMO_USER_PASSWORD"
  echo "Password set for $username"
done
