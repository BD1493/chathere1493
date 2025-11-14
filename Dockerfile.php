# 1. Base Image: Use a PHP-FPM base that includes necessary tools
FROM php:8.2-fpm-alpine

# 2. Install Nginx and required PHP extensions
RUN apk add --no-cache nginx \ 
    php-cli \
    php-json \
    php-pdo \
    php-fpm \
    php-gd \
    php-curl \
    # Clean up cache
    && rm -rf /var/cache/apk/*

# 3. Set the application root directory
WORKDIR /var/www/html

# 4. Copy the Nginx configuration file
# IMPORTANT: This assumes you have created a 'docker' folder and placed nginx.conf inside it.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# 5. Copy all your application files (index.html, api.php, etc.)
COPY . .

# 6. Set proper permissions for the web server user
RUN chown -R www-data:www-data /var/www/html

# 7. Expose the web server port
EXPOSE 8080

# 8. Define the command to start both PHP-FPM (the PHP runtime) and Nginx (the web server)
CMD sh -c "php-fpm && nginx -g 'daemon off;'"
