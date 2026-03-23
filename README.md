# Prisme — Dashboard National

Application desktop modulaire de données françaises en temps réel.
Stack : **Tauri 2.0** + **Rust** · **Vue 3** + **TypeScript** · **MapLibre GL JS** · **Tailwind CSS**

## Démarrage rapide

```bash
# 1. Installer les dépendances Node
npm install

# 2. Lancer en développement (Tauri + Vite)
npm run tauri dev

# 3. Build production
npm run tauri build
```

## Prérequis

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) ≥ 18
- Dépendances Tauri : voir [Prerequisites](https://tauri.app/start/prerequisites/)

## Architecture des plugins

Chaque plugin implémente `FranceDataPlugin` (`src/plugins/index.ts`) :

```typescript
interface FranceDataPlugin {
  id: string           // Identifiant unique
  label: string        // Nom affiché dans la sidebar
  icon: string         // Nom d'icône Lucide
  color: string        // Couleur principale (hex)
  description?: string // Tooltip dans la sidebar
  setup(map, store): void      // Injection sources/layers MapLibre
  teardown?(map, store): void  // Nettoyage à la désactivation
}
```

### Créer un nouveau plugin

```typescript
// src/plugins/myPlugin.ts
import type { FranceDataPlugin } from '@/plugins/index'

export const myPlugin: FranceDataPlugin = {
  id: 'my_plugin',
  label: 'Mon Plugin',
  icon: 'Train',       // Icône Lucide
  color: '#6366f1',
  description: 'Description courte',

  setup(map, store) {
    map.addSource('my_source', { type: 'geojson', data: { ... } })
    map.addLayer({ id: 'my_layer', type: 'circle', source: 'my_source', ... })
  },

  teardown(map) {
    if (map.getLayer('my_layer')) map.removeLayer('my_layer')
    if (map.getSource('my_source')) map.removeSource('my_source')
  },
}
```

Puis enregistrez-le dans `src/App.vue` :

```typescript
pluginStore.registerPlugin(myPlugin)
```

## Structure du projet

```
prisme/
├── src/
│   ├── App.vue                 # Layout principal (sidebar + carte)
│   ├── main.ts                 # Point d'entrée Vue
│   ├── style.css               # Tailwind + MapLibre CSS
│   ├── components/
│   │   └── MapEngine.vue       # Initialisation MapLibre (France)
│   ├── store/
│   │   └── pluginStore.ts      # Store Pinia : registre & toggle plugins
│   └── plugins/
│       ├── index.ts            # Interface FranceDataPlugin
│       └── fuelPlugin.ts       # Plugin exemple : prix carburant
├── src-tauri/
│   ├── src/
│   │   ├── main.rs             # Point d'entrée Rust
│   │   └── lib.rs              # Configuration Tauri (fenêtre, plugins HTTP)
│   ├── capabilities/
│   │   └── default.json        # Permissions Tauri 2.0
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── vite.config.ts
└── tailwind.config.js
```
