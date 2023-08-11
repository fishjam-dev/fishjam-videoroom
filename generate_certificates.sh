#/bin/sh

script_path=$( dirname -- "$( readlink -f -- "$0"; )"; )
cd $script_path
openssl genpkey -algorithm RSA -out private.key
openssl req -new -x509 -key private.key -out certificate.pem -days 365 -subj "/C=US"
openssl rsa -in private.key -out privkey.pem
openssl x509 -in certificate.pem -out fullchain.pem -trustout
LOCAL_SSL_CERTIFICATE=$script_path/certbot/conf/live/$DOMAIN/fullchain.pem
LOCAL_SSL_CERTIFICATE_KEY=$script_path/certbot/conf/live/$DOMAIN/privkey.pem
mkdir -p $(dirname $LOCAL_SSL_CERTIFICATE)
mkdir -p $(dirname $LOCAL_SSL_CERTIFICATE_KEY)
mv privkey.pem $LOCAL_SSL_CERTIFICATE_KEY
mv fullchain.pem $LOCAL_SSL_CERTIFICATE
rm private.key
rm certificate.pem