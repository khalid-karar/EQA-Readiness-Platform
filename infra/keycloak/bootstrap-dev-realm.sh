#!/bin/bash
# Dev-only post-import bootstrap: demo passwords + disable OTP (production enforces MFA).
set -euo pipefail

/opt/keycloak/bin/kcadm.sh config credentials \
  --server "http://keycloak:8080" \
  --realm master \
  --user "${KEYCLOAK_ADMIN:-admin}" \
  --password "${KEYCLOAK_ADMIN_PASSWORD}"

for username in cae.demo audit.demo board.demo; do
  /opt/keycloak/bin/kcadm.sh set-password -r eqa --username "$username" \
    --new-password "${KEYCLOAK_DEMO_USER_PASSWORD}"
  echo "Password set for $username"
done

echo "DEV ONLY: disabling Browser - Conditional OTP (production enforces MFA)..."
OTP_EXEC=$(
  /opt/keycloak/bin/kcadm.sh get authentication/flows/forms/executions -r eqa --fields id,displayName \
    | grep -B1 '"Browser - Conditional OTP"' \
    | grep '"id"' \
    | head -1 \
    | sed 's/.*"id" *: *"\([^"]*\)".*/\1/'
)

if [[ -z "$OTP_EXEC" ]]; then
  echo "WARNING: Browser - Conditional OTP execution not found" >&2
  exit 1
fi

cat > /tmp/disable-otp.json <<EOF
{"id":"${OTP_EXEC}","requirement":"DISABLED"}
EOF

/opt/keycloak/bin/kcadm.sh update authentication/flows/forms/executions -r eqa -f /tmp/disable-otp.json
echo "OTP disabled ($OTP_EXEC)"
