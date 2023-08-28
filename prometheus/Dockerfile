FROM prom/prometheus:v2.22.0

LABEL version="1.0.0"

RUN echo "  - job_name: 'jellyfish2'" >> ./prometheus.yaml
RUN echo "    static_configs:" >> ./prometheus.yaml
RUN echo "      - targets: ['$JELLYFISH2_IP:9568']" >> ./prometheus.yaml

COPY ./prometheus.yaml /etc/prometheus/prometheus.yml

