FROM prom/prometheus:v2.22.0

ARG JELLYFISH_TARGETS
ARG NODE_TARGETS

COPY ./prometheus.yaml /etc/prometheus/prometheus.yml

RUN sed -i 's/$JELLYFISH_TARGETS/'"$JELLYFISH_TARGETS"'/' /etc/prometheus/prometheus.yml
RUN sed -i 's/$NODE_TARGETS/'"$NODE_TARGETS"'/' /etc/prometheus/prometheus.yml