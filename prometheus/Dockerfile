FROM prom/prometheus:v2.22.0

ARG PROM_JELLYFISH_TARGETS
ARG PROM_NODE_TARGETS

COPY ./prometheus.yaml /etc/prometheus/prometheus.yml

RUN sed -i 's/$PROM_JELLYFISH_TARGETS/'"$PROM_JELLYFISH_TARGETS"'/' /etc/prometheus/prometheus.yml
RUN sed -i 's/$PROM_NODE_TARGETS/'"$PROM_NODE_TARGETS"'/' /etc/prometheus/prometheus.yml