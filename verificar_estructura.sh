#!/bin/bash
# Comprueba que la estructura del proyecto está completa antes de hacer commit/push.
# Uso: ejecútalo desde la raíz del repo -> bash verificar_estructura.sh

echo "Comprobando archivos clave del proyecto..."
echo ""

REQUIRED_FILES=(
  ".github/workflows/deploy.yml"
  "sitio-estatico/index.html"
  "sitio-estatico/manifest.json"
  "sitio-estatico/sw.js"
  "sitio-estatico/icons/icon-192.png"
  "sitio-estatico/icons/icon-512.png"
  "apps-script-backend/Codigo.gs"
  "apps-script-backend/appsscript.json"
)

MISSING=0
for f in "${REQUIRED_FILES[@]}"; do
  if [ -f "$f" ]; then
    echo "  OK   $f"
  else
    echo "  FALTA  $f"
    MISSING=1
  fi
done

echo ""
if [ "$MISSING" -eq 0 ]; then
  echo "✅ Todo presente. Ya puedes hacer: git add . && git commit -m \"deploy\" && git push"
else
  echo "❌ Faltan archivos. Vuelve a copiar el contenido del ZIP con:"
  echo "   cp -a /ruta/al/zip/descomprimido/Stock-Salesland-Xiaomi-main/. ."
  echo "   (el '/.' al final es importante: copia también los archivos ocultos como .github)"
fi
