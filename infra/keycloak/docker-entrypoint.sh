#!/bin/bash
set -euo pipefail

REALM_TEMPLATE="/opt/keycloak/realm-templates/eqa-realm.json"
REALM_FILE="/opt/keycloak/data/import/eqa-realm.json"

if [[ -n "${EQA_WEB_CLIENT_SECRET:-}" ]]; then
  sed "s|__EQA_WEB_CLIENT_SECRET__|${EQA_WEB_CLIENT_SECRET}|g" "$REALM_TEMPLATE" > "$REALM_FILE"
else
  cp "$REALM_TEMPLATE" "$REALM_FILE"
fi

exec /opt/keycloak/bin/kc.sh "$@"
