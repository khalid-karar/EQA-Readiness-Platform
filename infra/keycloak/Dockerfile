FROM quay.io/keycloak/keycloak:26.0.7

# Baked at image build so runtime does not run the memory-heavy Quarkus rebuild.
ENV KC_DB=postgres
ENV KC_CACHE=local
ENV KC_SPI_USER_SESSIONS_INFINISPAN_PERSISTENT_USER_SESSIONS_ENABLED=false
ENV KC_HEALTH_ENABLED=true
ENV KC_HTTP_ENABLED=true
ENV KC_PROXY_HEADERS=xforwarded

COPY eqa-realm.json /opt/keycloak/realm-templates/eqa-realm.json
COPY fresh-demo-partial-import.json /opt/keycloak/realm-templates/fresh-demo-partial-import.json
COPY docker-entrypoint.sh /opt/keycloak/docker-entrypoint.sh
COPY set-demo-passwords.sh /opt/keycloak/set-demo-passwords.sh

USER root
RUN mkdir -p /opt/keycloak/data/import /opt/keycloak/realm-templates \
  && chmod +x /opt/keycloak/docker-entrypoint.sh /opt/keycloak/set-demo-passwords.sh \
  && sed -i 's/\r$//' /opt/keycloak/docker-entrypoint.sh /opt/keycloak/set-demo-passwords.sh \
  && chown -R keycloak:root /opt/keycloak/data/import /opt/keycloak/realm-templates \
    /opt/keycloak/docker-entrypoint.sh /opt/keycloak/set-demo-passwords.sh \
  && chmod 775 /opt/keycloak/data/import

USER 1000
RUN /opt/keycloak/bin/kc.sh build

ENTRYPOINT ["/opt/keycloak/docker-entrypoint.sh"]
CMD ["start", "--optimized", "--import-realm"]
