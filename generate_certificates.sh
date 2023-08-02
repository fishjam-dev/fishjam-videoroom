#/bin/sh


script_path=$( dirname -- "$( readlink -f -- "$0"; )"; )

openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout privkey.pem -out fullchain.pem # -config 
mkdir -p $script_path/certbot/conf/live/$DOMAIN
mv privkey.pem $script_path/certbot/conf/live/$DOMAIN/privkey.pem
mv fullchain.pem $script_path/certbot/conf/live/$DOMAIN/fullchain.pem
