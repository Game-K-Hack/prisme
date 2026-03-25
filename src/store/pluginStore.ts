import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { FranceDataPlugin } from '@/plugins/index'

export interface SelectedFeature {
  pluginId: string
  properties: Record<string, unknown>
}

// ─── Système de recherche POI ────────────────────────────────────────────────

export interface POICategory {
  label: string
  tag: string       // Filtre Overpass (ex: '["amenity"="bench"]')
  group: string     // Groupe parent pour l'affichage
  icon?: string     // Nom d'icône Lucide
}

const POI_CATEGORIES: POICategory[] = [
  // Restauration
  { label: 'Restaurant',          tag: '["amenity"="restaurant"]',     group: 'Restauration', icon: 'UtensilsCrossed' },
  { label: 'Café',                tag: '["amenity"="cafe"]',           group: 'Restauration', icon: 'Coffee' },
  { label: 'Fast-food',           tag: '["amenity"="fast_food"]',      group: 'Restauration', icon: 'Sandwich' },
  { label: 'Bar',                 tag: '["amenity"="bar"]',            group: 'Restauration', icon: 'Beer' },
  { label: 'Pub',                 tag: '["amenity"="pub"]',            group: 'Restauration', icon: 'Beer' },
  { label: 'Glacier',             tag: '["amenity"="ice_cream"]',      group: 'Restauration', icon: 'IceCreamCone' },

  // Santé
  { label: 'Hôpital',             tag: '["amenity"="hospital"]',       group: 'Santé', icon: 'Hospital' },
  { label: 'Pharmacie',           tag: '["amenity"="pharmacy"]',       group: 'Santé', icon: 'Pill' },
  { label: 'Clinique',            tag: '["amenity"="clinic"]',         group: 'Santé', icon: 'Building2' },
  { label: 'Médecin',             tag: '["amenity"="doctors"]',        group: 'Santé', icon: 'Stethoscope' },
  { label: 'Dentiste',            tag: '["amenity"="dentist"]',        group: 'Santé', icon: 'SmilePlus' },
  { label: 'Vétérinaire',         tag: '["amenity"="veterinary"]',     group: 'Santé', icon: 'PawPrint' },

  // Éducation
  { label: 'École',               tag: '["amenity"="school"]',         group: 'Éducation', icon: 'School' },
  { label: 'Université',          tag: '["amenity"="university"]',     group: 'Éducation', icon: 'GraduationCap' },
  { label: 'Bibliothèque',        tag: '["amenity"="library"]',        group: 'Éducation', icon: 'BookOpen' },
  { label: 'Collège / Lycée',     tag: '["amenity"="college"]',        group: 'Éducation', icon: 'School' },

  // Services financiers
  { label: 'Banque',              tag: '["amenity"="bank"]',           group: 'Finances', icon: 'Landmark' },
  { label: 'Distributeur',        tag: '["amenity"="atm"]',            group: 'Finances', icon: 'CreditCard' },
  { label: 'Bureau de poste',     tag: '["amenity"="post_office"]',    group: 'Finances', icon: 'Mail' },

  // Transports
  { label: 'Parking',             tag: '["amenity"="parking"]',        group: 'Transports', icon: 'ParkingSquare' },
  { label: 'Parking vélos',       tag: '["amenity"="bicycle_parking"]', group: 'Transports', icon: 'Bike' },
  { label: 'Borne de recharge',   tag: '["amenity"="charging_station"]', group: 'Transports', icon: 'Plug' },
  { label: 'Station-service',     tag: '["amenity"="fuel"]',           group: 'Transports', icon: 'Fuel' },
  { label: 'Gare routière',       tag: '["amenity"="bus_station"]',    group: 'Transports', icon: 'Bus' },
  { label: 'Arrêt de bus',        tag: '["highway"="bus_stop"]',       group: 'Transports', icon: 'BusFront' },
  { label: 'Gare',                tag: '["railway"="station"]',        group: 'Transports', icon: 'TrainFront' },
  { label: 'Taxi',                tag: '["amenity"="taxi"]',           group: 'Transports', icon: 'Car' },
  { label: 'Vélo en libre-service', tag: '["amenity"="bicycle_rental"]', group: 'Transports', icon: 'Bike' },

  // Services publics
  { label: 'Police',              tag: '["amenity"="police"]',         group: 'Services publics', icon: 'ShieldAlert' },
  { label: 'Pompiers',            tag: '["amenity"="fire_station"]',   group: 'Services publics', icon: 'Siren' },
  { label: 'Mairie',              tag: '["amenity"="townhall"]',       group: 'Services publics', icon: 'Landmark' },
  { label: 'Tribunal',            tag: '["amenity"="courthouse"]',     group: 'Services publics', icon: 'Scale' },

  // Équipements
  { label: 'Toilettes',           tag: '["amenity"="toilets"]',        group: 'Équipements', icon: 'DoorOpen' },
  { label: 'Eau potable',         tag: '["amenity"="drinking_water"]', group: 'Équipements', icon: 'Droplets' },
  { label: 'Banc',                tag: '["amenity"="bench"]',          group: 'Équipements', icon: 'Armchair' },
  { label: 'Abri',                tag: '["amenity"="shelter"]',        group: 'Équipements', icon: 'Tent' },
  { label: 'Fontaine',            tag: '["amenity"="fountain"]',       group: 'Équipements', icon: 'Waves' },
  { label: 'Poubelle',            tag: '["amenity"="waste_basket"]',   group: 'Équipements', icon: 'Trash2' },
  { label: 'Recyclage',           tag: '["amenity"="recycling"]',      group: 'Équipements', icon: 'Recycle' },
  { label: 'Téléphone public',    tag: '["amenity"="telephone"]',      group: 'Équipements', icon: 'Phone' },

  // Culture & Loisirs
  { label: 'Cinéma',              tag: '["amenity"="cinema"]',         group: 'Culture', icon: 'Clapperboard' },
  { label: 'Théâtre',             tag: '["amenity"="theatre"]',        group: 'Culture', icon: 'Drama' },
  { label: 'Salle de concert',    tag: '["amenity"="music_venue"]',    group: 'Culture', icon: 'Music' },
  { label: 'Centre culturel',     tag: '["amenity"="arts_centre"]',    group: 'Culture', icon: 'Palette' },
  { label: 'Lieu de culte',       tag: '["amenity"="place_of_worship"]', group: 'Culture', icon: 'Church' },

  // Commerces
  { label: 'Supermarché',         tag: '["shop"="supermarket"]',       group: 'Commerces', icon: 'ShoppingCart' },
  { label: 'Boulangerie',         tag: '["shop"="bakery"]',            group: 'Commerces', icon: 'Croissant' },
  { label: 'Boucherie',           tag: '["shop"="butcher"]',           group: 'Commerces', icon: 'Beef' },
  { label: 'Primeur',             tag: '["shop"="greengrocer"]',       group: 'Commerces', icon: 'Salad' },
  { label: 'Caviste',             tag: '["shop"="wine"]',              group: 'Commerces', icon: 'Wine' },
  { label: 'Épicerie',            tag: '["shop"="convenience"]',       group: 'Commerces', icon: 'Store' },
  { label: 'Fleuriste',           tag: '["shop"="florist"]',           group: 'Commerces', icon: 'Flower2' },
  { label: 'Coiffeur',            tag: '["shop"="hairdresser"]',       group: 'Commerces', icon: 'Scissors' },
  { label: 'Opticien',            tag: '["shop"="optician"]',          group: 'Commerces', icon: 'Glasses' },
  { label: 'Librairie',           tag: '["shop"="books"]',             group: 'Commerces', icon: 'BookOpen' },
  { label: 'Presse',              tag: '["shop"="newsagent"]',         group: 'Commerces', icon: 'Newspaper' },
  { label: 'Vêtements',           tag: '["shop"="clothes"]',           group: 'Commerces', icon: 'Shirt' },
  { label: 'Chaussures',          tag: '["shop"="shoes"]',             group: 'Commerces', icon: 'Footprints' },
  { label: 'Bricolage',           tag: '["shop"="doityourself"]',      group: 'Commerces', icon: 'Hammer' },
  { label: 'Informatique',        tag: '["shop"="computer"]',          group: 'Commerces', icon: 'Laptop' },
  { label: 'Téléphonie',          tag: '["shop"="mobile_phone"]',      group: 'Commerces', icon: 'Smartphone' },
  { label: 'Sport',               tag: '["shop"="sports"]',            group: 'Commerces', icon: 'Trophy' },
  { label: 'Vélociste',           tag: '["shop"="bicycle"]',           group: 'Commerces', icon: 'Bike' },
  { label: 'Laverie',             tag: '["shop"="laundry"]',           group: 'Commerces', icon: 'WashingMachine' },
  { label: 'Cadeaux',             tag: '["shop"="gift"]',              group: 'Commerces', icon: 'Gift' },
  { label: 'Friperie',            tag: '["shop"="second_hand"]',       group: 'Commerces', icon: 'Shirt' },
  { label: 'Auto-réparation',     tag: '["shop"="car_repair"]',        group: 'Commerces', icon: 'Wrench' },
  { label: 'Pneus',               tag: '["shop"="tyres"]',             group: 'Commerces', icon: 'Circle' },

  // Tourisme
  { label: 'Hôtel',               tag: '["tourism"="hotel"]',          group: 'Tourisme', icon: 'Hotel' },
  { label: 'Chambre d\'hôte',     tag: '["tourism"="guest_house"]',    group: 'Tourisme', icon: 'BedDouble' },
  { label: 'Auberge de jeunesse', tag: '["tourism"="hostel"]',         group: 'Tourisme', icon: 'Home' },
  { label: 'Camping',             tag: '["tourism"="camp_site"]',      group: 'Tourisme', icon: 'Tent' },
  { label: 'Musée',               tag: '["tourism"="museum"]',         group: 'Tourisme', icon: 'Landmark' },
  { label: 'Galerie d\'art',      tag: '["tourism"="gallery"]',        group: 'Tourisme', icon: 'Frame' },
  { label: 'Zoo',                 tag: '["tourism"="zoo"]',            group: 'Tourisme', icon: 'PawPrint' },
  { label: 'Point de vue',        tag: '["tourism"="viewpoint"]',      group: 'Tourisme', icon: 'Eye' },
  { label: 'Aire de pique-nique', tag: '["tourism"="picnic_site"]',    group: 'Tourisme', icon: 'TreePine' },
  { label: 'Info tourisme',       tag: '["tourism"="information"]',    group: 'Tourisme', icon: 'Info' },

  // Loisirs
  { label: 'Parc',                tag: '["leisure"="park"]',           group: 'Loisirs', icon: 'TreePine' },
  { label: 'Aire de jeux',        tag: '["leisure"="playground"]',     group: 'Loisirs', icon: 'Baby' },
  { label: 'Piscine',             tag: '["leisure"="swimming_pool"]',  group: 'Loisirs', icon: 'Waves' },
  { label: 'Centre sportif',      tag: '["leisure"="sports_centre"]',  group: 'Loisirs', icon: 'Dumbbell' },
  { label: 'Salle de fitness',    tag: '["leisure"="fitness_centre"]', group: 'Loisirs', icon: 'Dumbbell' },
  { label: 'Terrain de sport',    tag: '["leisure"="pitch"]',          group: 'Loisirs', icon: 'CircleDot' },
  { label: 'Stade',               tag: '["leisure"="stadium"]',        group: 'Loisirs', icon: 'Trophy' },
  { label: 'Golf',                tag: '["leisure"="golf_course"]',    group: 'Loisirs', icon: 'Flag' },
  { label: 'Bowling',             tag: '["leisure"="bowling_alley"]',  group: 'Loisirs', icon: 'Target' },
  { label: 'Patinoire',           tag: '["leisure"="ice_rink"]',       group: 'Loisirs', icon: 'Snowflake' },
  { label: 'Parc aquatique',      tag: '["leisure"="water_park"]',     group: 'Loisirs', icon: 'Waves' },
  { label: 'Jardin',              tag: '["leisure"="garden"]',         group: 'Loisirs', icon: 'Flower' },
  { label: 'Parc pour chiens',    tag: '["leisure"="dog_park"]',       group: 'Loisirs', icon: 'Dog' },
  { label: 'Escape game',         tag: '["leisure"="escape_game"]',    group: 'Loisirs', icon: 'KeyRound' },
  { label: 'Centre équestre',     tag: '["leisure"="horse_riding"]',   group: 'Loisirs', icon: 'Heart' },
  { label: 'Réserve naturelle',   tag: '["leisure"="nature_reserve"]', group: 'Loisirs', icon: 'Leaf' },

  // Urgence & Sécurité
  { label: 'Défibrillateur',      tag: '["emergency"="defibrillator"]',  group: 'Urgence', icon: 'HeartPulse' },
  { label: 'Borne incendie',      tag: '["emergency"="fire_hydrant"]',   group: 'Urgence', icon: 'Flame' },
  { label: 'Poste de secours',    tag: '["emergency"="first_aid"]',      group: 'Urgence', icon: 'Cross' },
  { label: 'Sirène',              tag: '["emergency"="siren"]',          group: 'Urgence', icon: 'Bell' },
  { label: 'Extincteur',          tag: '["emergency"="fire_extinguisher"]', group: 'Urgence', icon: 'Flame' },

  // Infrastructure & Réseaux
  { label: 'Boîte aux lettres',   tag: '["amenity"="post_box"]',         group: 'Infrastructure', icon: 'Mailbox' },
  { label: 'Antenne télécom',     tag: '["man_made"="mast"]["tower:type"="communication"]', group: 'Infrastructure', icon: 'Radio' },
  { label: 'Éolienne',            tag: '["generator:source"="wind"]',    group: 'Infrastructure', icon: 'Wind' },
  { label: 'Panneau solaire',     tag: '["generator:source"="solar"]',   group: 'Infrastructure', icon: 'Sun' },
  { label: 'Château d\'eau',      tag: '["man_made"="water_tower"]',     group: 'Infrastructure', icon: 'Construction' },
  { label: 'Sous-station élec.',  tag: '["power"="substation"]',         group: 'Infrastructure', icon: 'Zap' },
  { label: 'Station de mesure',   tag: '["man_made"="monitoring_station"]', group: 'Infrastructure', icon: 'BarChart3' },
  { label: 'Caméra surveillance', tag: '["man_made"="surveillance"]',    group: 'Infrastructure', icon: 'Camera' },

  // Nature & Environnement
  { label: 'Arbre remarquable',   tag: '["natural"="tree"]["denotation"="natural_monument"]', group: 'Nature', icon: 'TreePine' },
  { label: 'Source d\'eau',       tag: '["natural"="spring"]',           group: 'Nature', icon: 'Droplet' },
  { label: 'Sommet',              tag: '["natural"="peak"]',             group: 'Nature', icon: 'Mountain' },
  { label: 'Grotte',              tag: '["natural"="cave_entrance"]',    group: 'Nature', icon: 'CircleDot' },
  { label: 'Cascade',             tag: '["waterway"="waterfall"]',       group: 'Nature', icon: 'Droplets' },
  { label: 'Plage',               tag: '["natural"="beach"]',            group: 'Nature', icon: 'Umbrella' },

  // Patrimoine
  { label: 'Monument historique', tag: '["heritage"]',                   group: 'Patrimoine', icon: 'Castle' },
  { label: 'Ruine',               tag: '["historic"="ruins"]',           group: 'Patrimoine', icon: 'Building' },
  { label: 'Château',             tag: '["historic"="castle"]',          group: 'Patrimoine', icon: 'Castle' },
  { label: 'Mémorial',            tag: '["historic"="memorial"]',        group: 'Patrimoine', icon: 'Milestone' },
  { label: 'Site archéologique',  tag: '["historic"="archaeological_site"]', group: 'Patrimoine', icon: 'Landmark' },
  { label: 'Moulin',              tag: '["man_made"="windmill"]',        group: 'Patrimoine', icon: 'Wheat' },
  { label: 'Phare',               tag: '["man_made"="lighthouse"]',      group: 'Patrimoine', icon: 'Lighthouse' },
]

// Filtres de propriétés OSM pour la recherche avancée
// Syntaxe utilisateur : "propriété:valeur" (ex: "wheelchair:yes", "brand:Leclerc")
const PROPERTY_FILTERS: Record<string, string> = {
  'wheelchair':   'wheelchair',
  'accessible':   'wheelchair',
  'pmr':          'wheelchair',
  'brand':        'brand',
  'marque':       'brand',
  'phone':        'phone',
  'téléphone':    'phone',
  'tel':          'phone',
  'email':        'email',
  'mail':         'email',
  'website':      'website',
  'site':         'website',
  'wifi':         'internet_access',
  'internet':     'internet_access',
  'cuisine':      'cuisine',
  'ouvert':       'opening_hours',
  'horaires':     'opening_hours',
  'drive':        'drive_through',
  'bio':          'organic',
  'vegan':        'diet:vegan',
  'végétarien':   'diet:vegetarian',
  'halal':        'diet:halal',
  'casher':       'diet:kosher',
  'fumeur':       'smoking',
  'terrasse':     'outdoor_seating',
  'livraison':    'delivery',
}

// Filtres rapides : overlays utilitaires en un clic
export interface QuickFilter {
  id: string
  label: string
  icon: string
  category: string  // Label dans POI_CATEGORIES
  color: string
}

export const QUICK_FILTERS: QuickFilter[] = [
  { id: 'qf_defib',     label: 'Défibrillateurs',   icon: 'HeartPulse',  category: 'Défibrillateur',    color: '#ef4444' },
  { id: 'qf_charging',  label: 'Bornes recharge',   icon: 'Plug',        category: 'Borne de recharge', color: '#22c55e' },
  { id: 'qf_water',     label: 'Eau potable',       icon: 'Droplets',    category: 'Eau potable',       color: '#06b6d4' },
  { id: 'qf_toilets',   label: 'Toilettes',         icon: 'DoorOpen',    category: 'Toilettes',         color: '#a855f7' },
  { id: 'qf_bench',     label: 'Bancs',             icon: 'Armchair',    category: 'Banc',              color: '#f59e0b' },
  { id: 'qf_hydrant',   label: 'Bornes incendie',   icon: 'Flame',       category: 'Borne incendie',    color: '#f43f5e' },
  { id: 'qf_postbox',   label: 'Boîtes aux lettres', icon: 'Mailbox',    category: 'Boîte aux lettres', color: '#eab308' },
  { id: 'qf_monument',  label: 'Patrimoine',        icon: 'Castle',      category: 'Monument historique', color: '#d97706' },
  { id: 'qf_viewpoint', label: 'Points de vue',     icon: 'Eye',         category: 'Point de vue',      color: '#0ea5e9' },
  { id: 'qf_peak',      label: 'Sommets',           icon: 'Mountain',    category: 'Sommet',            color: '#64748b' },
  { id: 'qf_pharmacy',  label: 'Pharmacies',        icon: 'Pill',        category: 'Pharmacie',         color: '#16a34a' },
  { id: 'qf_wifi',      label: 'WiFi gratuit',      icon: 'Wifi',        category: 'wifi_custom',       color: '#6366f1' },
]

// Catégories de couches carte pour contrôler la visibilité
export interface MapLayerControl {
  id: string
  label: string
  icon: string
  /** Fonction de test : retourne true si un layer MapLibre appartient à cette catégorie */
  match: (layerId: string, layerType: string) => boolean
}

export const MAP_LAYER_CONTROLS: MapLayerControl[] = [
  {
    id: 'labels',
    label: 'Noms des lieux',
    icon: 'Tag',
    match: (_id, type) => type === 'symbol',
  },
  {
    id: 'buildings',
    label: 'Bâtiments',
    icon: 'Building2',
    match: (id, type) => (type === 'fill' || type === 'fill-extrusion') && /building/i.test(id),
  },
  {
    id: 'roads',
    label: 'Routes',
    icon: 'Route',
    match: (id, type) => type === 'line' && /road|highway|street|bridge|tunnel|path|track|motorway|trunk|primary|secondary|tertiary/i.test(id),
  },
  {
    id: 'water',
    label: 'Eau & rivières',
    icon: 'Droplet',
    match: (id, type) => (type === 'fill' || type === 'line') && /water|river|lake|ocean|sea|stream|canal/i.test(id),
  },
  {
    id: 'landuse',
    label: 'Espaces verts',
    icon: 'Leaf',
    match: (id, type) => type === 'fill' && /land|park|forest|wood|grass|garden|green|nature|scrub|farm/i.test(id),
  },
  {
    id: 'boundaries',
    label: 'Frontières',
    icon: 'MapPinned',
    match: (id, type) => type === 'line' && /boundary|border|admin/i.test(id),
  },
  {
    id: 'transit',
    label: 'Transport',
    icon: 'Train',
    match: (id, type) => (type === 'line' || type === 'symbol') && /rail|transit|ferry|subway|tram/i.test(id),
  },
]

// Couleurs cycliques pour différencier les recherches simultanées
const POI_COLORS = [
  '#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b',
  '#10b981', '#f43f5e', '#3b82f6', '#a855f7',
]

export interface POISearchResult {
  id: string            // Identifiant unique (timestamp)
  query: string         // Requête d'origine
  icon: string          // Emoji de la catégorie
  color: string         // Couleur de la couche
  count: number         // Nombre de résultats
  sourceId: string      // ID source MapLibre
  circleLayerId: string // ID layer cercle
  labelLayerId: string  // ID layer label
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const usePluginStore = defineStore('plugins', () => {
  // ─── Plugins ───────────────────────────────────────────────────────────────
  const registry = ref<Map<string, FranceDataPlugin>>(new Map())
  const activeIds = ref<Set<string>>(new Set())
  const externalPluginIds = ref<Set<string>>(new Set())
  const mapInstance = ref<MapLibreMap | null>(null)
  const selectedFeature = ref<SelectedFeature | null>(null)

  // ─── Plugin settings ──────────────────────────────────────────────────────
  const PSETTINGS_KEY = 'prisme-plugin-settings'
  const pluginSettings = ref<Record<string, Record<string, unknown>>>(
    (() => { try { return JSON.parse(localStorage.getItem(PSETTINGS_KEY) ?? '{}') } catch { return {} } })()
  )

  function savePluginSettings(): void {
    localStorage.setItem(PSETTINGS_KEY, JSON.stringify(pluginSettings.value))
  }

  function getPluginSetting<T = unknown>(pluginId: string, key: string): T {
    const plugin = registry.value.get(pluginId)
    const saved = pluginSettings.value[pluginId]?.[key]
    if (saved !== undefined) return saved as T
    const desc = plugin?.settingsDescriptors?.find(d => d.key === key)
    return (desc?.default ?? null) as T
  }

  function setPluginSetting(pluginId: string, key: string, value: unknown): void {
    if (!pluginSettings.value[pluginId]) pluginSettings.value[pluginId] = {}
    pluginSettings.value[pluginId][key] = value
    savePluginSettings()

    // Si le plugin est actif, le redémarrer pour appliquer le changement
    if (activeIds.value.has(pluginId)) {
      deactivatePlugin(pluginId)
      activatePlugin(pluginId)
    }
  }

  function initPluginDefaults(plugin: FranceDataPlugin): void {
    if (!plugin.settingsDescriptors) return
    if (!pluginSettings.value[plugin.id]) pluginSettings.value[plugin.id] = {}
    for (const desc of plugin.settingsDescriptors) {
      if (pluginSettings.value[plugin.id][desc.key] === undefined) {
        pluginSettings.value[plugin.id][desc.key] = desc.default
      }
    }
    savePluginSettings()
  }

  // ─── Contrôles carte ───────────────────────────────────────────────────────
  const labelsVisible = ref(true)
  const poiLoading = ref(false)
  const poiSearches = ref<POISearchResult[]>([])
  const poiWarning = ref('')
  let poiAbortController: AbortController | null = null

  // Visibilité des couches carte (toutes visibles par défaut)
  const mapLayerVisibility = ref<Record<string, boolean>>(
    Object.fromEntries(MAP_LAYER_CONTROLS.map(c => [c.id, true]))
  )

  // Quick filters actifs (id du filtre → id dans poiSearches)
  const activeQuickFilters = ref<Map<string, string>>(new Map())

  // ─── Computed ──────────────────────────────────────────────────────────────
  const plugins = computed<FranceDataPlugin[]>(() =>
    Array.from(registry.value.values())
  )
  const isActive = (id: string): boolean => activeIds.value.has(id)

  /** Catégories regroupées par section */
  const poiGroups = computed(() => {
    const groups = new Map<string, POICategory[]>()
    for (const cat of POI_CATEGORIES) {
      const list = groups.get(cat.group) ?? []
      list.push(cat)
      groups.set(cat.group, list)
    }
    return groups
  })

  /** Toutes les catégories (labels) pour recherche rapide */
  const poiCategories = POI_CATEGORIES.map(c => c.label)

  // ─── Actions plugins ───────────────────────────────────────────────────────

  function registerPlugin(plugin: FranceDataPlugin, isExternal = false): void {
    if (registry.value.has(plugin.id)) return
    registry.value.set(plugin.id, plugin)
    if (isExternal) externalPluginIds.value.add(plugin.id)
    initPluginDefaults(plugin)
    saveInstalledIds()
  }

  function unregisterPlugin(id: string): void {
    if (activeIds.value.has(id)) deactivatePlugin(id)
    registry.value.delete(id)
    externalPluginIds.value.delete(id)
    saveInstalledIds()
  }

  function isExternalPlugin(id: string): boolean {
    return externalPluginIds.value.has(id)
  }

  /** Persiste la liste des IDs installés dans localStorage */
  function saveInstalledIds(): void {
    const ids = Array.from(registry.value.keys())
    localStorage.setItem('prisme-installed-plugins', JSON.stringify(ids))
  }

  /** Charge la liste des IDs installés depuis localStorage */
  function getInstalledIds(): string[] {
    try {
      const raw = localStorage.getItem('prisme-installed-plugins')
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return []
  }

  function setMap(map: MapLibreMap): void {
    mapInstance.value = map
  }

  function selectFeature(feature: SelectedFeature | null): void {
    selectedFeature.value = feature
  }

  // Bridge pour les plugins externes (window globals)
  const w = window as unknown as Record<string, unknown>
  w.__PRISME_SELECT_FEATURE__ =
    (pluginId: string, properties: Record<string, unknown>) => {
      selectFeature({ pluginId, properties })
    }
  w.__PRISME_CLEAR_FEATURE__ =
    (pluginId: string) => {
      if (selectedFeature.value?.pluginId === pluginId) selectFeature(null)
    }
  w.__PRISME_GET_SETTING__ =
    (pluginId: string, key: string) => {
      return getPluginSetting(pluginId, key)
    }

  function activatePlugin(id: string): void {
    const plugin = registry.value.get(id)
    if (!plugin || activeIds.value.has(id)) return
    const map = mapInstance.value
    if (!map) return
    try {
      plugin.setup(map, usePluginStore())
      activeIds.value.add(id)
    } catch (err) {
      console.error(`[Prisme] Erreur setup() plugin "${id}":`, err)
    }
  }

  function deactivatePlugin(id: string): void {
    const plugin = registry.value.get(id)
    if (!plugin || !activeIds.value.has(id)) return
    const map = mapInstance.value
    if (map && plugin.teardown) {
      try { plugin.teardown(map, usePluginStore()) } catch (err) {
        console.error(`[Prisme] Erreur teardown() plugin "${id}":`, err)
      }
    }
    if (selectedFeature.value?.pluginId === id) selectedFeature.value = null
    activeIds.value.delete(id)
  }

  function togglePlugin(id: string): void {
    activeIds.value.has(id) ? deactivatePlugin(id) : activatePlugin(id)
  }

  // ─── Actions carte ─────────────────────────────────────────────────────────

  /** Toggle la visibilité d'une catégorie de couches carte */
  function toggleMapLayer(categoryId: string): void {
    const map = mapInstance.value
    if (!map) return
    const control = MAP_LAYER_CONTROLS.find(c => c.id === categoryId)
    if (!control) return

    const newState = !mapLayerVisibility.value[categoryId]
    mapLayerVisibility.value[categoryId] = newState
    if (categoryId === 'labels') labelsVisible.value = newState

    const style = map.getStyle()
    if (!style?.layers) return
    const vis = newState ? 'visible' : 'none'
    for (const layer of style.layers) {
      if (layer.id.startsWith('prisme_')) continue
      if (control.match(layer.id, layer.type)) {
        map.setLayoutProperty(layer.id, 'visibility', vis)
      }
    }
  }

  // Compat : garde toggleLabels comme raccourci
  function toggleLabels(): void {
    toggleMapLayer('labels')
  }

  /** Toggle un filtre rapide (ajoute ou retire la couche POI) */
  function toggleQuickFilter(filterId: string): void {
    const qf = QUICK_FILTERS.find(f => f.id === filterId)
    if (!qf) return

    const existingSearchId = activeQuickFilters.value.get(filterId)
    if (existingSearchId) {
      // Désactiver : retirer la couche
      clearPOI(existingSearchId)
      activeQuickFilters.value.delete(filterId)
    } else {
      // Activer : lancer la recherche
      // On traite "wifi_custom" à part
      const query = qf.category === 'wifi_custom' ? 'wifi:yes' : qf.category
      searchPOI(query).then(() => {
        // Retrouver le dernier résultat ajouté pour l'associer au quick filter
        const last = poiSearches.value[poiSearches.value.length - 1]
        if (last) activeQuickFilters.value.set(filterId, last.id)
      })
    }
  }

  function isQuickFilterActive(filterId: string): boolean {
    return activeQuickFilters.value.has(filterId)
  }

  /** Supprime une recherche spécifique ou toutes */
  function clearPOI(searchId?: string): void {
    const map = mapInstance.value
    if (!map) return

    const toRemove = searchId
      ? poiSearches.value.filter(s => s.id === searchId)
      : [...poiSearches.value]

    for (const s of toRemove) {
      if (map.getLayer(s.labelLayerId)) map.removeLayer(s.labelLayerId)
      if (map.getLayer(s.circleLayerId)) map.removeLayer(s.circleLayerId)
      if (map.getSource(s.sourceId)) map.removeSource(s.sourceId)
    }

    if (searchId) {
      poiSearches.value = poiSearches.value.filter(s => s.id !== searchId)
    } else {
      poiSearches.value = []
    }
    poiWarning.value = ''
  }

  /**
   * Analyse la requête et construit le filtre Overpass adapté.
   *
   * Syntaxes supportées :
   *   - Catégorie connue : "Boulangerie" → tag OSM direct
   *   - Propriété:valeur  : "wheelchair:yes" → filtre par propriété OSM
   *   - Texte libre       : "Leclerc" → recherche par nom
   *   - Combiné           : "restaurant wheelchair:yes" → restaurants accessibles
   */
  function buildOverpassFilter(query: string): { tag: string; icon: string } {
    const parts = query.trim().split(/\s+/)
    const tagParts: string[] = []
    const textParts: string[] = []
    let icon = 'MapPin'

    for (const part of parts) {
      // Vérifie si c'est un filtre propriété:valeur
      const colonIdx = part.indexOf(':')
      if (colonIdx > 0) {
        const key = part.slice(0, colonIdx).toLowerCase()
        const val = part.slice(colonIdx + 1)
        const osmKey = PROPERTY_FILTERS[key]
        if (osmKey) {
          tagParts.push(`["${osmKey}"="${val}"]`)
          continue
        }
      }
      textParts.push(part)
    }

    const textQuery = textParts.join(' ')

    // Vérifie si le texte correspond à une catégorie connue
    if (textQuery) {
      const lowerText = textQuery.toLowerCase()
      const match = POI_CATEGORIES.find(c => c.label.toLowerCase() === lowerText)
      if (match) {
        tagParts.unshift(match.tag)
        icon = match.icon ?? '📍'
      } else {
        // Recherche par nom en texte libre
        tagParts.unshift(`["name"~"${textQuery}",i]`)
      }
    }

    return { tag: tagParts.join(''), icon }
  }

  // Bbox France métropolitaine pour fallback
  const FRANCE_BBOX = '41.3,-5.2,51.1,9.6'
  const MAX_VIEWPORT_AREA = 25 // degrés² — au-delà on prévient l'utilisateur

  async function searchPOI(query: string): Promise<void> {
    const map = mapInstance.value
    if (!map || !query.trim()) return

    // Vérifier si cette requête existe déjà
    if (poiSearches.value.some(s => s.query.toLowerCase() === query.toLowerCase())) return

    poiAbortController = new AbortController()
    poiLoading.value = true
    poiWarning.value = ''

    const bounds = map.getBounds()
    const viewportArea =
      (bounds.getNorth() - bounds.getSouth()) * (bounds.getEast() - bounds.getWest())

    let bbox: string
    if (viewportArea > MAX_VIEWPORT_AREA) {
      bbox = FRANCE_BBOX
      poiWarning.value = 'Vue trop large — recherche limitée à la France métropolitaine. Zoomez pour des résultats locaux.'
    } else {
      bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`
    }

    const { tag, icon } = buildOverpassFilter(query)
    const searchId = `poi_${Date.now()}`
    const color = POI_COLORS[poiSearches.value.length % POI_COLORS.length]
    const sourceId = `prisme_${searchId}_src`
    const circleLayerId = `prisme_${searchId}_circle`
    const labelLayerId = `prisme_${searchId}_label`

    const overpassQuery =
      `[out:json][timeout:25];(node${tag}(${bbox});way${tag}(${bbox}););out center 500;`

    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(overpassQuery)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: poiAbortController.signal,
      })
      const data = await res.json()

      type OverpassElement = {
        lon?: number; lat?: number
        center?: { lon: number; lat: number }
        tags?: Record<string, string>
      }

      const features: GeoJSON.Feature[] = data.elements
        .filter((el: OverpassElement) => el.lat != null || el.center != null)
        .map((el: OverpassElement) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [el.lon ?? el.center!.lon, el.lat ?? el.center!.lat],
          },
          properties: {
            name: el.tags?.name ?? query,
            brand: el.tags?.brand ?? '',
            wheelchair: el.tags?.wheelchair ?? '',
            phone: el.tags?.phone ?? '',
            website: el.tags?.website ?? '',
            opening_hours: el.tags?.opening_hours ?? '',
          },
        }))

      map.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      })

      map.addLayer({
        id: circleLayerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 3, 10, 6, 14, 10],
          'circle-color': color,
          'circle-opacity': 0.85,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.6,
        },
      })

      map.addLayer({
        id: labelLayerId,
        type: 'symbol',
        source: sourceId,
        minzoom: 12,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 10,
          'text-offset': [0, 1.3],
          'text-anchor': 'top',
          'text-max-width': 8,
        },
        paint: {
          'text-color': '#ddd6fe',
          'text-halo-color': '#0f1117',
          'text-halo-width': 1.2,
        },
      })

      poiSearches.value.push({
        id: searchId,
        query,
        icon,
        color,
        count: features.length,
        sourceId,
        circleLayerId,
        labelLayerId,
      })

      // Auto-zoom sur les résultats
      if (features.length > 0) {
        let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
        for (const f of features) {
          const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates
          if (lng < minLng) minLng = lng
          if (lng > maxLng) maxLng = lng
          if (lat < minLat) minLat = lat
          if (lat > maxLat) maxLat = lat
        }
        map.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]],
          { padding: 80, maxZoom: 15, duration: 800 }
        )
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      console.error('[Prisme] Erreur recherche POI:', err)
    } finally {
      poiAbortController = null
      poiLoading.value = false
    }
  }

  function cancelPOISearch(): void {
    if (poiAbortController) {
      poiAbortController.abort()
      poiAbortController = null
      poiLoading.value = false
      poiWarning.value = ''
    }
  }

  return {
    // Plugins
    registry, activeIds, mapInstance, selectedFeature,
    plugins, isActive,
    setMap, selectFeature, registerPlugin, unregisterPlugin, isExternalPlugin, getInstalledIds,
    activatePlugin, deactivatePlugin, togglePlugin,
    // Plugin settings
    pluginSettings, getPluginSetting, setPluginSetting,
    // Carte — POI
    poiLoading, poiSearches, poiWarning,
    poiGroups, poiCategories,
    searchPOI, clearPOI, cancelPOISearch,
    // Carte — Quick filters
    activeQuickFilters,
    toggleQuickFilter, isQuickFilterActive,
    // Carte — Couches
    labelsVisible, mapLayerVisibility,
    toggleLabels, toggleMapLayer,
  }
})
