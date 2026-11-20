#!/usr/bin/env bash
# Runs from an uploaded release directory. Existing sites and their data stay independent.
set -euo pipefail
release_dir="$(pwd -P)"
case "$release_dir" in /opt/fanjin/releases/*) ;; *) echo 'Run from /opt/fanjin/releases/<release>.' >&2; exit 1;; esac
test -f dist/index.html
test -f data/catalog/daxue.json
mkdir -p /opt/fanjin/shared
chmod 700 /opt/fanjin/shared
if [ ! -f /opt/fanjin/shared/app.env ]; then
  python3 - <<'PY'
from pathlib import Path
import secrets,os
target=Path('/opt/fanjin/shared/app.env')
password=secrets.token_urlsafe(30)
target.write_text('ADMIN_NAME=梵烬管理员\nADMIN_PASSWORD='+password+'\nCORS_ORIGINS=https://fanjin.curatix.tech\nTRUST_PROXY=1\nSEED_DEMO=0\n',encoding='utf-8')
os.chmod(target,0o600)
access=Path('/opt/fanjin/shared/admin-access.txt')
access.write_text('网站：https://fanjin.curatix.tech/auth\n管理员：梵烬管理员\n初始密码：'+password+'\n首次登录后请更换密码并生成个人恢复码。\n',encoding='utf-8')
os.chmod(access,0o600)
PY
fi
if [ ! -e .env ]; then ln -s /opt/fanjin/shared/app.env .env; fi
compose=(sudo docker compose -f compose.yaml -f deploy/compose.tokyo.yaml)
if sudo docker ps --format '{{.Names}}' | grep -qx 'fanjin-app-1'; then
  "${compose[@]}" exec -T app npm run backup
fi
"${compose[@]}" config --quiet
"${compose[@]}" build app
"${compose[@]}" up -d app
for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3007/api/health; then break; fi
  if [ "$attempt" = 30 ]; then echo 'Application health failed.' >&2; exit 1; fi
  sleep 2
done
"${compose[@]}" exec -T app node --import tsx scripts/import-catalog.mjs --published --only-missing
"${compose[@]}" up -d gateway
"${compose[@]}" exec -T gateway caddy validate --config /etc/caddy/Caddyfile
sudo python3 - <<'PY'
from pathlib import Path
import shutil,subprocess,time
path=Path('/etc/nginx/stream.d/sni.conf')
old=path.read_text()
needle='fanjin.curatix.tech'
if needle not in old:
    if 'map $ssl_preread_server_name $sni_backend {' not in old:
        raise SystemExit('Unexpected existing SNI layout. No changes made.')
    backup=Path(str(path)+'.before-fanjin-'+str(int(time.time())))
    shutil.copy2(path,backup)
    new=old.replace('map $ssl_preread_server_name $sni_backend {','map $ssl_preread_server_name $sni_backend {\n        fanjin.curatix.tech 127.0.0.1:8543;',1)
    path.write_text(new)
    checked=subprocess.run(['nginx','-t'],capture_output=True,text=True)
    if checked.returncode:
        path.write_text(old)
        raise SystemExit('Nginx validation failed; original config restored.')
    subprocess.run(['systemctl','reload','nginx'],check=True)
PY
ln -sfn "$release_dir" /opt/fanjin/current
"${compose[@]}" exec -T app npm run backup
sudo install -m 644 deploy/fanjin-backup.service /etc/systemd/system/fanjin-backup.service
sudo install -m 644 deploy/fanjin-backup.timer /etc/systemd/system/fanjin-backup.timer
sudo systemctl daemon-reload
sudo systemctl enable --now fanjin-backup.timer
"${compose[@]}" ps
echo 'Application, independent gateway, catalog and initial backup prepared.'
