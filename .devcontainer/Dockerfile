FROM mcr.microsoft.com/devcontainers/typescript-node:22

# Playwright's mobile project uses Chromium device emulation. Install its native
# runtime libraries as root during image creation, not as the remote user.
USER root
RUN npx --yes playwright@1.61.0 install-deps chromium

USER node