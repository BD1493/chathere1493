FROM php:8.2-apache

RUN a2enmod rewrite

COPY . /var/www/html/

WORKDIR /var/www/html/

# ensure data folder exists and is writable
RUN mkdir -p /var/www/html/data && chmod -R 777 /var/www/html/data

EXPOSE 80

CMD ["apache2-foreground"]
