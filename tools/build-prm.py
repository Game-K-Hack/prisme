#!/usr/bin/env python3
"""
Prisme Plugin Builder — Génère un fichier .prm à partir d'un dossier plugin.

Usage:
  python build-prm.py <dossier>
  python build-prm.py <dossier>/manifest.json

Le dossier doit contenir au minimum :
  - manifest.json  (métadonnées du plugin)
  - plugin.js      (code du plugin)
"""

import sys
import os
import json
import zipfile
import io

# Forcer UTF-8 sur Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')  # type: ignore

REQUIRED_FIELDS = ['id', 'label', 'icon', 'color']
OPTIONAL_FIELDS = ['description', 'version', 'author', 'settings']
SETTING_TYPES   = ['boolean', 'select', 'range', 'color']

def error(msg: str) -> None:
    print(f"\033[91m✗ Erreur :\033[0m {msg}")
    sys.exit(1)


def warn(msg: str) -> None:
    print(f"\033[93m⚠ Attention :\033[0m {msg}")


def ok(msg: str) -> None:
    print(f"\033[92m✓\033[0m {msg}")


def validate_manifest(data: dict) -> None:
    """Valide le manifest.json et affiche les erreurs/warnings."""

    # Champs requis
    for field in REQUIRED_FIELDS:
        if field not in data or not isinstance(data[field], str) or not data[field].strip():
            error(f"Champ requis manquant ou vide : '{field}'")

    ok(f"id: {data['id']}")
    ok(f"label: {data['label']}")
    ok(f"icon: {data['icon']}")
    ok(f"color: {data['color']}")

    # Vérifier le format couleur
    color = data['color']
    if not color.startswith('#') or len(color) not in (4, 7):
        warn(f"Couleur '{color}' — format attendu : #RGB ou #RRGGBB")

    # Champs optionnels
    if 'description' in data:
        ok(f"description: {data['description'][:60]}{'...' if len(data.get('description', '')) > 60 else ''}")
    else:
        warn("Pas de description — recommandé pour l'affichage dans l'interface")

    if 'version' in data:
        ok(f"version: {data['version']}")

    if 'author' in data:
        ok(f"author: {data['author']}")

    # Vérifier les settings
    if 'settings' in data:
        settings = data['settings']
        if not isinstance(settings, list):
            error("'settings' doit être un tableau")

        for i, setting in enumerate(settings):
            prefix = f"settings[{i}]"

            if not isinstance(setting, dict):
                error(f"{prefix} doit être un objet")

            for req in ['key', 'label', 'type', 'default']:
                if req not in setting:
                    error(f"{prefix} — champ requis manquant : '{req}'")

            if setting['type'] not in SETTING_TYPES:
                error(f"{prefix} — type invalide '{setting['type']}'. "
                      f"Valeurs possibles : {', '.join(SETTING_TYPES)}")

            if setting['type'] == 'select':
                if 'options' not in setting or not isinstance(setting['options'], list):
                    error(f"{prefix} — type 'select' nécessite un tableau 'options'")
                for j, opt in enumerate(setting['options']):
                    if not isinstance(opt, dict) or 'value' not in opt or 'label' not in opt:
                        error(f"{prefix}.options[{j}] — doit contenir 'value' et 'label'")

            if setting['type'] == 'range':
                for field in ['min', 'max']:
                    if field not in setting:
                        error(f"{prefix} — type 'range' nécessite '{field}'")

            ok(f"setting: {setting['key']} ({setting['type']})")

    # Champs inconnus
    known = set(REQUIRED_FIELDS + OPTIONAL_FIELDS)
    for key in data:
        if key not in known:
            warn(f"Champ inconnu dans le manifest : '{key}'")


def build_prm(folder: str) -> None:
    """Construit un .prm à partir d'un dossier."""

    print(f"\n\033[1mPrisme Plugin Builder\033[0m")
    print(f"Dossier : {os.path.abspath(folder)}\n")

    # Vérifier les fichiers requis
    manifest_path = os.path.join(folder, 'manifest.json')
    plugin_path = os.path.join(folder, 'plugin.js')

    if not os.path.isfile(manifest_path):
        error(f"manifest.json introuvable dans {folder}")

    if not os.path.isfile(plugin_path):
        error(f"plugin.js introuvable dans {folder}")

    # Lire et valider le manifest
    print("── Validation du manifest ──")
    try:
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
    except json.JSONDecodeError as e:
        error(f"manifest.json invalide — {e}")

    validate_manifest(manifest)

    # Vérifier plugin.js
    print("\n── Validation du plugin ──")
    with open(plugin_path, 'r', encoding='utf-8') as f:
        plugin_code = f.read()

    if not plugin_code.strip():
        error("plugin.js est vide")

    if 'setup' not in plugin_code:
        warn("plugin.js ne semble pas contenir de fonction 'setup'")

    if 'teardown' not in plugin_code:
        warn("plugin.js ne contient pas de 'teardown' — recommandé pour le nettoyage")

    ok(f"plugin.js : {len(plugin_code)} caractères")

    # Lister tous les fichiers à inclure
    all_files = []
    for name in os.listdir(folder):
        filepath = os.path.join(folder, name)
        if os.path.isfile(filepath):
            all_files.append((name, filepath))

    print(f"\n── Construction du .prm ──")
    print(f"Fichiers inclus : {', '.join(n for n, _ in all_files)}")

    # Créer le ZIP en mémoire
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for name, filepath in all_files:
            zf.write(filepath, name)

    zip_bytes = zip_buffer.getvalue()

    # Vérifier le magic ZIP
    if zip_bytes[:2] != bytes([0x50, 0x4B]):
        error("Erreur interne — données ZIP invalides")

    # Construire le .prm : PRISME + ZIP sans PK + BY KÉLIAN
    zip_payload = zip_bytes[2:]  # Retirer "PK"
    prm_data = bytes([0x50, 0x52, 0x49, 0x53, 0x4D, 0x45]) + zip_payload + bytes([0x42, 0x59, 0x20, 0x4B, 0xC9, 0x4C, 0x49, 0x41, 0x4E])

    # Écrire le fichier
    plugin_id = manifest['id']
    output_name = f"{plugin_id}.prm"
    output_path = os.path.join(os.path.dirname(folder.rstrip('/\\')), output_name)

    with open(output_path, 'wb') as f:
        f.write(prm_data)

    ok(f"Fichier généré : {output_path}")
    print(f"   Taille : {len(prm_data):,} octets")
    print(f"\n\033[92m✓ Plugin '{manifest['label']}' prêt à être importé dans Prisme !\033[0m\n")


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage : python build-prm.py <dossier>")
        print("        python build-prm.py <dossier>/manifest.json")
        sys.exit(1)

    path = sys.argv[1]

    # Si on pointe vers manifest.json, prendre le dossier parent
    if os.path.basename(path) == 'manifest.json':
        path = os.path.dirname(path)

    if not os.path.isdir(path):
        error(f"'{path}' n'est pas un dossier valide")

    build_prm(path)


if __name__ == '__main__':
    main()
