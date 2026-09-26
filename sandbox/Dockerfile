FROM node:24-alpine

RUN mkdir -p /opt/strix /workspace \
  && chown node:node /workspace

COPY reporter.cjs /opt/strix/reporter.cjs
COPY entrypoint.sh /opt/strix/entrypoint.sh
RUN chmod 755 /opt/strix/entrypoint.sh

USER node
WORKDIR /workspace
ENTRYPOINT ["/opt/strix/entrypoint.sh"]
