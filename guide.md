
---

# Deployment Guide: Clone Repository on Ubuntu VPS with Nginx

## Prerequisites

* **Ubuntu VPS** (e.g., 20.04 LTS)
* **Root or sudo access**
* **Git**
* **Node.js** (v18+ recommended) and **npm** (or Yarn)
* **Database** (PostgreSQL or MySQL – adjust commands for your choice)
* **Nginx**
* **PM2** (optional, for managing the Node process)

---

## 1. Update System & Install Essentials

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential

```

## 2. Install Node.js (using NodeSource)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

```

**Verify installation:**

```bash
node -v
npm -v

```

## 3. (Optional) Install Yarn

```bash
npm install -g yarn

```

## 4. Install Database Server

### PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres createuser --interactive   # create a DB user
sudo -u postgres createdb your_db_name

```

### MySQL

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation

```

**Create DB & user:**

```bash
sudo mysql -e "CREATE DATABASE your_db_name; CREATE USER 'your_user'@'localhost' IDENTIFIED BY 'your_password'; GRANT ALL PRIVILEGES ON your_db_name.* TO 'your_user'@'localhost'; FLUSH PRIVILEGES;"

```

## 5. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

```

## 6. Clone the Repository

```bash
# Choose a directory, e.g., /var/www
sudo mkdir -p /var/www/yourapp && sudo chown $USER:$USER /var/www/yourapp
cd /var/www/yourapp
git clone https://github.com/yourusername/your-repo.git .

```

## 7. Install Project Dependencies

```bash
# If the project uses npm
npm install

# Or Yarn
# yarn install

```

## 8. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env with your values (DB credentials, secret keys, etc.)
nano .env

```

> **Tip:** Ensure the `.env` file is not committed to version control.

## 9. Run Database Migrations / Seed

*(Adjust to your framework)*

```bash
# Example for a typical Node/ORM setup
npm run migrate    # or npx prisma migrate deploy, etc.

# Optional seed
npm run seed

```

## 10. Build the Application (if applicable)

```bash
npm run build    # creates production assets

```

## 11. Set Up Process Manager (PM2)

*(Optional but highly recommended)*

```bash
sudo npm install -g pm2
pm2 start npm --name "yourapp" -- start
pm2 save
pm2 startup systemd

```

## 12. Configure Nginx as a Reverse Proxy

Create a new server block:

```bash
sudo nano /etc/nginx/sites-available/yourapp.conf

```

Paste the following configuration (**adjust `server_name` and `proxy_pass` port**):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;  # replace with your domain or IP

    location / {
        proxy_pass http://127.0.0.1:3000;   # port your Node app listens on
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Optional: serve static files directly (if built assets are in /public)
    # location /static/ {
    #     alias /var/www/yourapp/public/;
    # }
}

```

**Enable the site and test configuration:**

```bash
sudo ln -s /etc/nginx/sites-available/yourapp.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

```

## 13. Secure with HTTPS (Let’s Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

```

*Follow the prompts; Certbot will automatically obtain and install the certificate.*

## 14. Verify Deployment

* Open `http://yourdomain.com` (or `https://` after cert installation) in a browser.
* **Check logs:** `pm2 logs yourapp` or `journalctl -u nginx`.

## 15. Maintenance Tips

* **Update code:** `git pull && npm install && npm run build && pm2 restart yourapp`
* **Backup DB:** Schedule regular dumps (`pg_dump` or `mysqldump`).
* **Renew SSL:** Certbot auto-renews, but you can test with `sudo certbot renew --dry-run`.

---

*This guide assumes a typical Node.js web app. Adjust commands for other stacks (e.g., Python/Django, Ruby on Rails) accordingly.*

---