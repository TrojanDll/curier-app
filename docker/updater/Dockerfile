# Minimal self-update sidecar: Docker CLI + Compose plugin + a poll loop.
# Built and published by CI as ghcr.io/trojandll/curier-updater.
FROM docker:27-cli

# docker:27-cli ships the engine CLI; add the Compose v2 plugin explicitly.
RUN apk add --no-cache docker-cli-compose

COPY update-loop.sh /usr/local/bin/update-loop.sh
RUN chmod +x /usr/local/bin/update-loop.sh

ENTRYPOINT ["/usr/local/bin/update-loop.sh"]
