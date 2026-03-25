({
  // ─── Config ──────────────────────────────────────────────────────────────

  _SOURCE: 'ext_fuel_source',
  _ICON_LAYER: 'ext_fuel_icon',
  _LABEL_LAYER: 'ext_fuel_label',
  _IMAGE: 'ext-fuel-pump-sdf',
  _API: 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/exports/csv?use_labels=true',
  _CACHE_KEY: 'prisme-fuel-ext-cache',
  _CACHE_TTL: 24 * 60 * 60 * 1000,
  _SVG_SIZE: 48,
  _COLOR: '#3b82f6',

  _SVG: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="white">'
    + '<path d="M3 22V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v17H3z"/>'
    + '<path d="M14 8h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2V7l-3-3" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<circle cx="20" cy="7" r="1" fill="white"/>'
    + '</svg>',

  _click: null,
  _bgClick: null,

  // ─── Helpers ─────────────────────────────────────────────────────────────

  _loadImage: function(map) {
    var self = this
    return new Promise(function(resolve, reject) {
      var img = new Image(self._SVG_SIZE, self._SVG_SIZE)
      img.onload = function() {
        if (!map.hasImage(self._IMAGE)) map.addImage(self._IMAGE, img, { sdf: true })
        resolve()
      }
      img.onerror = reject
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(self._SVG)
    })
  },

  _loadCache: function() {
    try {
      var raw = localStorage.getItem(this._CACHE_KEY)
      if (!raw) return null
      var entry = JSON.parse(raw)
      if (Date.now() - entry.fetchedAt < this._CACHE_TTL) return entry.csv
    } catch(e) {}
    return null
  },

  _saveCache: function(csv) {
    try { localStorage.setItem(this._CACHE_KEY, JSON.stringify({ csv: csv, fetchedAt: Date.now() })) }
    catch(e) {}
  },

  _getCachedFetchedAt: function() {
    try {
      var raw = localStorage.getItem(this._CACHE_KEY)
      if (!raw) return null
      return JSON.parse(raw).fetchedAt || null
    } catch(e) { return null }
  },

  _fetchCSV: function() {
    var self = this
    var cached = this._loadCache()
    if (cached) return Promise.resolve(cached)
    return fetch(this._API).then(function(res) {
      if (!res.ok) throw new Error('API error: ' + res.status)
      return res.text()
    }).then(function(csv) {
      self._saveCache(csv)
      return csv
    })
  },

  _parseCsvLine: function(line, sep) {
    var fields = [], current = '', inQ = false
    for (var i = 0; i < line.length; i++) {
      var ch = line[i]
      if (inQ) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++ }
          else inQ = false
        } else current += ch
      } else {
        if (ch === '"') inQ = true
        else if (ch === sep) { fields.push(current); current = '' }
        else current += ch
      }
    }
    fields.push(current)
    return fields
  },

  _parseStations: function(csv) {
    var lines = csv.split('\n')
    if (lines.length < 2) return []
    var headers = this._parseCsvLine(lines[0], ';')
    var idx = function(n) { return headers.indexOf(n) }

    var iGeom = idx('geom'), iAddr = idx('Adresse'), iVille = idx('Ville')
    var iCp = idx('Code postal'), iId = idx('id')
    var iDept = idx('Département'), iRegion = idx('Région')
    var iAuto = idx('Automate 24-24 (oui/non)')
    var iSvc = idx('Services proposés')
    var iGaz  = idx('Prix Gazole'),  iSp95 = idx('Prix SP95')
    var iSp98 = idx('Prix SP98'),    iE10  = idx('Prix E10')
    var iE85  = idx('Prix E85'),     iGplc = idx('Prix GPLc')
    // Colonnes de date de mise à jour par carburant
    var iDGaz  = idx('Prix Gazole mis à jour le'),  iDSp95 = idx('Prix SP95 mis à jour le')
    var iDSp98 = idx('Prix SP98 mis à jour le'),    iDE10  = idx('Prix E10 mis à jour le')
    var iDE85  = idx('Prix E85 mis à jour le'),     iDGplc = idx('Prix GPLc mis à jour le')

    var stations = []
    for (var i = 1; i < lines.length; i++) {
      var line = lines[i].trim()
      if (!line) continue
      var c = this._parseCsvLine(line, ';')
      var geom = c[iGeom]
      if (!geom || geom.indexOf(',') < 0) continue
      var parts = geom.split(',')
      var lat = parseFloat(parts[0]), lng = parseFloat(parts[1])
      if (isNaN(lat) || isNaN(lng) || lat < 41 || lat > 52 || lng < -6 || lng > 10) continue

      var p = function(v) { var n = parseFloat(v); return (v && !isNaN(n)) ? n : null }
      // Normalise une date ISO optionnelle → timestamp ms ou null
      var d = function(v) {
        if (!v || !v.trim()) return null
        var t = Date.parse(v.trim())
        return isNaN(t) ? null : t
      }

      stations.push({
        id: c[iId] || ('s' + i), lat: lat, lng: lng,
        adresse: c[iAddr] || '', ville: c[iVille] || '',
        cp: c[iCp] || '', dept: c[iDept] || '', region: c[iRegion] || '',
        automate: (c[iAuto] || '').toLowerCase() === 'oui',
        services: c[iSvc] || '',
        gazole: p(c[iGaz]),  sp95: p(c[iSp95]), sp98: p(c[iSp98]),
        e10:    p(c[iE10]),  e85:  p(c[iE85]),  gplc: p(c[iGplc]),
        // Dates de mise à jour par carburant (timestamp ms)
        d_gazole: d(c[iDGaz]),  d_sp95: d(c[iDSp95]), d_sp98: d(c[iDSp98]),
        d_e10:    d(c[iDE10]),  d_e85:  d(c[iDE85]),  d_gplc: d(c[iDGplc]),
      })
    }
    return stations
  },

  _getPrice: function(s, type) {
    if (type === 'best') return s.e10 || s.sp95 || s.sp98 || s.gazole || null
    return s[type] || null
  },

  _computeAvg: function(stations, type) {
    var sum = 0, count = 0
    for (var i = 0; i < stations.length; i++) {
      var p = this._getPrice(stations[i], type)
      if (p) { sum += p; count++ }
    }
    return count > 0 ? sum / count : 1.85
  },

  _priceColor: function(price, avg) {
    var ratio = Math.min(1, Math.max(0, (price - (avg - 0.30)) / 0.60))
    if (ratio < 0.5) {
      var t = ratio * 2
      return 'rgb(' + Math.round(34 + 215*t) + ',' + Math.round(197 - 82*t) + ',' + Math.round(94 - 72*t) + ')'
    }
    var t2 = (ratio - 0.5) * 2
    return 'rgb(' + Math.round(249 - 10*t2) + ',' + Math.round(115 - 47*t2) + ',' + Math.round(22 + 46*t2) + ')'
  },

  // Retourne la date de mise à jour pour le type de carburant actif
  _getDate: function(s, fuelType) {
    if (fuelType === 'best') {
      // Pour "best", on prend la date du carburant dont le prix est affiché
      var keys = ['e10', 'sp95', 'sp98', 'gazole', 'e85', 'gplc']
      for (var i = 0; i < keys.length; i++) {
        if (s[keys[i]]) return s['d_' + keys[i]] || null
      }
      return null
    }
    return s['d_' + fuelType] || null
  },

  _computeStats: function(stations, fuelType) {
    var minPrice = Infinity, maxPrice = -Infinity
    var minStation = null, maxStation = null
    var sum = 0, count = 0
    var latestDataDate = null  // date la plus récente dans les données
    for (var i = 0; i < stations.length; i++) {
      var s = stations[i]
      var p = this._getPrice(s, fuelType)
      if (!p) continue
      sum += p; count++
      if (p < minPrice) { minPrice = p; minStation = s }
      if (p > maxPrice) { maxPrice = p; maxStation = s }
      // Suivre la date de mise à jour la plus récente du dataset
      var dt = this._getDate(s, fuelType)
      if (dt && (latestDataDate === null || dt > latestDataDate)) latestDataDate = dt
    }
    return {
      count: count,
      avg: count > 0 ? sum / count : 0,
      latestDataDate: latestDataDate,  // date la plus récente des prix dans les données
      min: minStation ? {
        price: minPrice, ville: minStation.ville,
        adresse: minStation.adresse, dept: minStation.dept,
        date: this._getDate(minStation, fuelType)
      } : null,
      max: maxStation ? {
        price: maxPrice, ville: maxStation.ville,
        adresse: maxStation.adresse, dept: maxStation.dept,
        date: this._getDate(maxStation, fuelType)
      } : null,
    }
  },

  _buildGeoJSON: function(stations, fuelType, colorByPrice) {
    var self = this
    var avg = colorByPrice ? self._computeAvg(stations, fuelType) : 0
    var features = []
    for (var i = 0; i < stations.length; i++) {
      var s = stations[i]
      var price = self._getPrice(s, fuelType)
      if (!price) continue
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        properties: {
          id: s.id, ville: s.ville, adresse: s.adresse, cp: s.cp,
          departement: s.dept, region: s.region,
          automate: s.automate, services: s.services,
          gazole: s.gazole, sp95: s.sp95, sp98: s.sp98,
          e10: s.e10, e85: s.e85, gplc: s.gplc,
          // Dates de mise à jour par carburant (timestamp ms, null si absent)
          d_gazole: s.d_gazole, d_sp95: s.d_sp95, d_sp98: s.d_sp98,
          d_e10: s.d_e10, d_e85: s.d_e85, d_gplc: s.d_gplc,
          best_price: price,
          color: colorByPrice ? self._priceColor(price, avg) : self._COLOR
        }
      })
    }
    return { type: 'FeatureCollection', features: features }
  },

  // ─── Setup ───────────────────────────────────────────────────────────────

  setup: function(map) {
    var self = this
    self._map = map  // conserver la ref pour le handler sync
    if (map.getSource(self._SOURCE)) return

    // Lire les paramètres depuis le store Prisme
    var getSetting = window.__PRISME_GET_SETTING__
    var colorByPrice = getSetting ? getSetting('fuel', 'colorByPrice') : true
    var fuelType = getSetting ? getSetting('fuel', 'fuelType') : 'best'

    return self._loadImage(map).then(function() {
      return self._fetchCSV()
    }).then(function(csv) {
      var stations = self._parseStations(csv)
      if (stations.length === 0) return

      // Stocker les stats et le timestamp pour le panneau détail
      var setData = window.__PRISME_SET_PLUGIN_DATA__
      if (setData) {
        setData('fuel', 'stats', self._computeStats(stations, fuelType))
        setData('fuel', 'fuelType', fuelType)
        setData('fuel', 'fetchedAt', self._getCachedFetchedAt() || Date.now())
      }

      map.addSource(self._SOURCE, {
        type: 'geojson',
        data: self._buildGeoJSON(stations, fuelType, colorByPrice)
      })

      map.addLayer({
        id: self._ICON_LAYER,
        type: 'symbol',
        source: self._SOURCE,
        layout: {
          'icon-image': self._IMAGE,
          'icon-size': ['interpolate', ['linear'], ['zoom'], 5, 0.15, 8, 0.25, 11, 0.45, 14, 0.7],
          'icon-allow-overlap': false,
          'icon-padding': 2
        },
        paint: {
          'icon-color': ['get', 'color'],
          'icon-opacity': 0.9
        }
      })

      map.addLayer({
        id: self._LABEL_LAYER,
        type: 'symbol',
        source: self._SOURCE,
        minzoom: 11,
        layout: {
          'text-field': ['concat', ['to-string', ['get', 'best_price']], ' €'],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 10,
          'text-offset': [0, 2],
          'text-anchor': 'top',
          'text-allow-overlap': false
        },
        paint: {
          'text-color': '#f1f5f9',
          'text-halo-color': '#0f1117',
          'text-halo-width': 1.5
        }
      })

      // Clic station → détail
      self._click = function(e) {
        if (!e.features || !e.features.length) return
        e.preventDefault()
        // On utilise window.__PRISME_SELECT_FEATURE__ injecté par le store
        if (window.__PRISME_SELECT_FEATURE__) {
          window.__PRISME_SELECT_FEATURE__('fuel', e.features[0].properties)
        }
      }
      map.on('click', self._ICON_LAYER, self._click)

      self._bgClick = function(e) {
        if (e.defaultPrevented) return
        if (window.__PRISME_CLEAR_FEATURE__) window.__PRISME_CLEAR_FEATURE__('fuel')
      }
      map.on('click', self._bgClick)

      map.on('mouseenter', self._ICON_LAYER, function() { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', self._ICON_LAYER, function() { map.getCanvas().style.cursor = '' })

      // Enregistrer l'action "sync" : vide le cache et recharge
      if (window.__PRISME_REGISTER_ACTION__) {
        window.__PRISME_REGISTER_ACTION__('fuel', 'sync', function() {
          return new Promise(function(resolve) {
            localStorage.removeItem(self._CACHE_KEY)
            self.teardown(self._map)
            // Petit délai pour laisser le teardown se finaliser
            setTimeout(function() {
              self.setup(self._map).then(resolve).catch(resolve)
            }, 100)
          })
        })
      }
    })
  },

  // ─── Teardown ────────────────────────────────────────────────────────────

  teardown: function(map) {
    if (this._click) { map.off('click', this._ICON_LAYER, this._click); this._click = null }
    if (this._bgClick) { map.off('click', this._bgClick); this._bgClick = null }
    if (map.getLayer(this._LABEL_LAYER)) map.removeLayer(this._LABEL_LAYER)
    if (map.getLayer(this._ICON_LAYER)) map.removeLayer(this._ICON_LAYER)
    if (map.getSource(this._SOURCE)) map.removeSource(this._SOURCE)
    if (map.hasImage(this._IMAGE)) map.removeImage(this._IMAGE)
  }
})
