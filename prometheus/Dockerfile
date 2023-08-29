FROM prom/prometheus:v2.22.0

ARG TARGETS

COPY ./prometheus.yaml /etc/prometheus/prometheus.yml

RUN sed -i 's/$TARGETS/'"$TARGETS"'/' /etc/prometheus/prometheus.yml