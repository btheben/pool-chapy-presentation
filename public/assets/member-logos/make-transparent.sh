#!/usr/bin/env bash

set -e

if [ $# -lt 3 ]; then
  echo "Usage: $0 fichier.png \"Description\" \"Thème\""
  echo "Exemple: $0 puces.png \"Les puces\" \"Insectes\""
  exit 1
fi

FILE="$1"
DISPLAY_NAME="$2"
THEME="$3"

if [ ! -f "$FILE" ]; then
  echo "Erreur: fichier introuvable: $FILE"
  exit 1
fi

if [[ "$FILE" != *.png ]]; then
  echo "Erreur: le fichier doit être un .png"
  exit 1
fi

TMP_FILE="${FILE%.png}-tmp-transparent.png"

magick "$FILE" \
  -fuzz 8% \
  -transparent "#ffffff" \
  -transparent "#f2f2f2" \
  -transparent "#eeeeee" \
  "$TMP_FILE"

mv "$TMP_FILE" "$FILE"

# Escape des apostrophes pour SQL
SQL_FILE="${FILE//\'/\'\'}"
SQL_DISPLAY_NAME="${DISPLAY_NAME//\'/\'\'}"
SQL_THEME="${THEME//\'/\'\'}"

echo ""
echo "✅ Background blanc rendu transparent: $FILE"
echo ""
echo "Requête SQL:"
echo ""
echo "INSERT INTO public.logo_asset (code, display_name, logo_url, source_type, theme, is_active) VALUES"
echo "  ('$SQL_FILE', '$SQL_DISPLAY_NAME', '/assets/member-logos/$SQL_FILE', 'CUSTOM', '$SQL_THEME', true);"
