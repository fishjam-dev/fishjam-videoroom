FROM grafana/promtail:2.9.0

ARG LOKI_ADDRESS

COPY ./promtail-config.yaml /etc/promtail/config.yml

RUN sed -i 's/$LOKI_ADDRESS/'"$LOKI_ADDRESS"'/' /etc/promtail/config.yml
