FROM prom/prometheus:v2.22.0

ARG PROM_FISHJAM_TARGETS
ARG PROM_NODE_TARGETS

COPY ./prometheus.yaml /etc/prometheus/prometheus.yml

RUN sed -i 's/$PROM_FISHJAM_TARGETS/'"$PROM_FISHJAM_TARGETS"'/' /etc/prometheus/prometheus.yml
RUN sed -i 's/$PROM_NODE_TARGETS/'"$PROM_NODE_TARGETS"'/' /etc/prometheus/prometheus.yml
