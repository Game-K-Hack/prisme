({
  // ─── State ────────────────────────────────────────────────────────────────
  _map: null,
  _pollTimer: null,
  _rafId: null,
  _abortCtrl: null,

  _vehicles: null,  // Map<id, { lng, lat, bearing, speedMs, lastApiTime, lineNumber, fillColor, textColor, posType, recordedAt }>
  _rendered: null,  // Map<id, { lng, lat, bearing }>
  _networks: null,  // Map<networkId, { name, authority, color, textColor, logoHref }>

  _moveHandler: null,
  _clickHandler: null,
  _enterHandler: null,
  _leaveHandler: null,

  _SRC: 'bt-src',
  _ROUTE_SRC: 'bt-route-src',

  // ─── Setup ────────────────────────────────────────────────────────────────
  setup(map) {
    this._map = map
    this._vehicles = new Map()
    this._rendered = new Map()
    this._networks = new Map()

    this._addVehicleImage(map)

    map.addSource(this._SRC, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    })
    map.addSource(this._ROUTE_SRC, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    })

    // ── Trajet passé (pointillés atténués) ──
    map.addLayer({
      id: 'bt-route-past',
      type: 'line',
      source: this._ROUTE_SRC,
      filter: ['==', ['get', 'seg'], 'past'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 3,
        'line-opacity': 0.6,
        'line-dasharray': [2, 2]
      }
    })

    // ── Trajet à venir (trait plein) ──
    map.addLayer({
      id: 'bt-route-future',
      type: 'line',
      source: this._ROUTE_SRC,
      filter: ['==', ['get', 'seg'], 'future'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 4,
        'line-opacity': 0.9
      }
    })

    // ── Arrêts passés ──
    map.addLayer({
      id: 'bt-stops-past',
      type: 'circle',
      source: this._ROUTE_SRC,
      filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'st'], 'past']],
      paint: {
        'circle-radius': 3,
        'circle-color': 'transparent',
        'circle-stroke-width': 1.5,
        'circle-stroke-color': ['get', 'color'],
        'circle-opacity': 0.35,
        'circle-stroke-opacity': 0.35
      }
    })

    // ── Arrêts à venir ──
    map.addLayer({
      id: 'bt-stops-future',
      type: 'circle',
      source: this._ROUTE_SRC,
      filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'st'], 'future']],
      paint: {
        'circle-radius': 5,
        'circle-color': '#ffffff',
        'circle-stroke-width': 2.5,
        'circle-stroke-color': ['get', 'color']
      }
    })

    // ── Icônes véhicules SDF (teardrop orienté) ──
    map.addLayer({
      id: 'bt-icons',
      type: 'symbol',
      source: this._SRC,
      layout: {
        'icon-image': 'bt-vehicle',
        'icon-rotate': ['get', 'bearing'],
        'icon-rotation-alignment': 'map',
        'icon-pitch-alignment': 'map',
        'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.45, 14, 0.85],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      },
      paint: {
        'icon-color': ['get', 'fillColor'],
        'icon-halo-color': 'rgba(0,0,0,0.55)',
        'icon-halo-width': 1.2
      }
    })

    // ── Numéro de ligne ──
    map.addLayer({
      id: 'bt-text',
      type: 'symbol',
      source: this._SRC,
      minzoom: 11,
      layout: {
        'text-field': ['coalesce', ['get', 'lineNumber'], ''],
        'text-size': 8,
        'text-font': ['Noto Sans Bold'],
        'text-anchor': 'center',
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': ['get', 'textColor'],
        'text-halo-color': ['get', 'fillColor'],
        'text-halo-width': 0.5
      }
    })

    // ── Event handlers ──
    this._moveHandler  = () => this._fetch()
    this._clickHandler = (e) => this._onClick(e)
    this._enterHandler = () => { map.getCanvas().style.cursor = 'pointer' }
    this._leaveHandler = () => { map.getCanvas().style.cursor = '' }

    map.on('moveend',   this._moveHandler)
    map.on('click',     this._clickHandler)
    map.on('mouseenter', 'bt-icons', this._enterHandler)
    map.on('mouseleave', 'bt-icons', this._leaveHandler)

    window.__PRISME_REGISTER_ACTION__('bus_tracker', 'refresh', () => this._fetch())

    this._loadNetworks()
    this._fetch()
    this._startAnimation()
    this._pollTimer = setInterval(() => this._fetch(), 5000)
  },

  // ─── Icône SDF teardrop ────────────────────────────────────────────────────
  _addVehicleImage(map) {
    var size = 32, cx = size / 2
    var canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    var ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.beginPath()
    // Pointe en haut = avant du véhicule
    ctx.moveTo(cx, 2)
    ctx.bezierCurveTo(cx + 11, 3, cx + 11, 16, cx + 9, 26)
    ctx.quadraticCurveTo(cx, 31, cx - 9, 26)
    ctx.bezierCurveTo(cx - 11, 16, cx - 11, 3, cx, 2)
    ctx.closePath()
    ctx.fill()
    var d = ctx.getImageData(0, 0, size, size)
    map.addImage('bt-vehicle', { width: size, height: size, data: new Uint8Array(d.data.buffer) }, { sdf: true })
  },

  // ─── Chargement des réseaux ───────────────────────────────────────────────
  async _loadNetworks() {
    try {
      var res = await fetch('https://bus-tracker.fr/api/networks')
      if (!res.ok) return
      var list = await res.json()
      for (var n of list) {
        this._networks.set(n.id, {
          name: n.name,
          authority: n.authority || null,
          color: n.color ? ('#' + n.color).replace('##', '#') : null,
          textColor: n.textColor ? ('#' + n.textColor).replace('##', '#') : null,
          // Les URLs sont déjà absolues (Google Cloud Storage)
          logoHref: n.darkModeLogoHref || n.logoHref || null
        })
      }
    } catch (e) {
      console.warn('[bus_tracker] networks:', e)
    }
  },

  // ─── Fetch des marqueurs ──────────────────────────────────────────────────
  async _fetch() {
    var map = this._map
    if (!map) return

    if (this._abortCtrl) this._abortCtrl.abort()
    this._abortCtrl = new AbortController()

    var b = map.getBounds()
    var params = new URLSearchParams({
      swLat: b.getSouth().toFixed(6),
      swLon: b.getWest().toFixed(6),
      neLat: b.getNorth().toFixed(6),
      neLon: b.getEast().toFixed(6)
    })

    if (window.__PRISME_GET_SETTING__('bus_tracker', 'showComputed') === false) {
      params.set('excludeScheduled', 'true')
    }

    try {
      var res = await fetch(
        'https://bus-tracker.fr/api/vehicle-journeys/markers?' + params,
        { signal: this._abortCtrl.signal }
      )
      if (!res.ok) return
      var json = await res.json()
      var now = Date.now()

      for (var item of (json.items || [])) {
        var id = item.id
        var lng = item.position.longitude
        var lat = item.position.latitude
        var bearing = item.position.bearing != null ? item.position.bearing : 0

        var prev = this._vehicles.get(id)
        var speedMs = 0

        if (prev && prev.lastApiTime) {
          var dt = now - prev.lastApiTime
          if (dt > 500 && dt < 30000) {
            var R = 6371000
            var f1 = prev.lat * Math.PI / 180, f2 = lat * Math.PI / 180
            var df = (lat - prev.lat) * Math.PI / 180
            var dl = (lng - prev.lng) * Math.PI / 180
            var a = Math.sin(df/2)*Math.sin(df/2) + Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)*Math.sin(dl/2)
            var dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
            speedMs = Math.min(dist / (dt / 1000), 44.4)  // cap 160 km/h
          } else {
            speedMs = prev.speedMs || 0
          }
        }

        this._vehicles.set(id, {
          lng, lat, bearing, speedMs,
          lastApiTime: now,
          lineNumber: item.lineNumber || '',
          fillColor:  item.fillColor || '#3b82f6',
          textColor:  item.color     || '#ffffff',
          posType:    item.position.type,
          recordedAt: item.position.recordedAt
        })

        if (!this._rendered.has(id)) {
          this._rendered.set(id, { lng, lat, bearing })
        }
      }

      // Purger les véhicules hors viewport
      var ids = new Set((json.items || []).map(function(i) { return i.id }))
      for (var vid of this._vehicles.keys()) {
        if (!ids.has(vid)) { this._vehicles.delete(vid); this._rendered.delete(vid) }
      }

      window.__PRISME_SET_PLUGIN_DATA__('bus_tracker', 'count',      this._vehicles.size)
      window.__PRISME_SET_PLUGIN_DATA__('bus_tracker', 'lastUpdate', now)
    } catch (e) {
      if (e && e.name !== 'AbortError') console.warn('[bus_tracker] fetch:', e)
    }
  },

  // ─── Boucle d'animation (dead reckoning + lerp) ───────────────────────────
  _startAnimation() {
    var self = this
    var last = Date.now()

    function frame() {
      if (!self._map) return
      self._rafId = requestAnimationFrame(frame)
      var now = Date.now()
      last = now

      var LERP = 0.10
      var features = []

      for (var id of self._vehicles.keys()) {
        var t = self._vehicles.get(id)
        var r = self._rendered.get(id) || { lng: t.lng, lat: t.lat, bearing: t.bearing }

        // Dead reckoning sur le cap
        var goalLng = t.lng, goalLat = t.lat
        var elapsed = (now - t.lastApiTime) / 1000
        if (t.speedMs > 0.5 && elapsed < 12) {
          var bRad = t.bearing * Math.PI / 180
          var dm   = t.speedMs * elapsed
          var lRad = t.lat * Math.PI / 180
          goalLat = t.lat + (dm * Math.cos(bRad)) / 111000
          goalLng = t.lng + (dm * Math.sin(bRad)) / (111000 * Math.cos(lRad))
        }

        // Lerp position + bearing (wrap 360°)
        var newLng     = r.lng + (goalLng - r.lng) * LERP
        var newLat     = r.lat + (goalLat - r.lat) * LERP
        var db         = t.bearing - (r.bearing || 0)
        if (db > 180) db -= 360
        if (db < -180) db += 360
        var newBearing = (r.bearing || 0) + db * LERP

        self._rendered.set(id, { lng: newLng, lat: newLat, bearing: newBearing })

        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [newLng, newLat] },
          properties: {
            id:         id,
            lineNumber: t.lineNumber,
            fillColor:  t.fillColor,
            textColor:  t.textColor,
            bearing:    newBearing,
            posType:    t.posType,
            recordedAt: t.recordedAt
          }
        })
      }

      var src = self._map.getSource(self._SRC)
      if (src) src.setData({ type: 'FeatureCollection', features: features })
    }

    this._rafId = requestAnimationFrame(frame)
  },

  // ─── Clic sur un véhicule ─────────────────────────────────────────────────
  async _onClick(e) {
    var map = this._map
    if (!map) return

    var hits = map.queryRenderedFeatures(e.point, { layers: ['bt-icons'] })
    if (!hits.length) return

    var props = hits[0].properties

    // Affichage immédiat pendant le chargement
    window.__PRISME_SELECT_FEATURE__('bus_tracker', {
      id:         props.id,
      lineNumber: props.lineNumber,
      fillColor:  props.fillColor,
      color:      props.textColor,
      posType:    props.posType,
      recordedAt: props.recordedAt,
      _loading:   true
    })

    try {
      // Chargement parallèle : détails du trajet
      var journeyRes = await fetch(
        'https://bus-tracker.fr/api/vehicle-journeys/' + encodeURIComponent(props.id)
      )
      if (!journeyRes.ok) return
      var journey = await journeyRes.json()

      var net       = this._networks.get(journey.networkId) || null
      var vehicleId = journey.vehicle ? journey.vehicle.id : null

      // Charger le tracé et les infos véhicule en parallèle
      var pathPromise    = journey.pathRef
        ? fetch('https://bus-tracker.fr/api/paths/' + encodeURIComponent(journey.pathRef)).then(function(r) { return r.ok ? r.json() : null }).catch(function() { return null })
        : Promise.resolve(null)

      var vehiclePromise = vehicleId
        ? fetch('https://bus-tracker.fr/api/vehicles/' + vehicleId).then(function(r) { return r.ok ? r.json() : null }).catch(function() { return null })
        : Promise.resolve(null)

      var results   = await Promise.all([pathPromise, vehiclePromise])
      var pathData  = results[0]
      var vehicleFull = results[1]

      // Couleur réseau : l'API renvoie sans '#' parfois
      var netColor = net && net.color ? net.color : props.fillColor

      window.__PRISME_SELECT_FEATURE__('bus_tracker', {
        id:            props.id,
        lineNumber:    props.lineNumber,
        fillColor:     props.fillColor,
        color:         props.textColor,
        posType:       props.posType,
        recordedAt:    props.recordedAt,
        destination:   journey.destination  || null,
        direction:     journey.direction    || null,
        occupancy:     journey.occupancy    || null,
        vehicleNumber: journey.vehicle      ? journey.vehicle.number : null,
        networkId:     journey.networkId    || null,
        networkName:   net ? net.name       : null,
        networkAuth:   net ? net.authority  : null,
        networkColor:  netColor,
        networkLogo:   net ? net.logoHref   : null,
        calls:         journey.calls        ? JSON.stringify(journey.calls.slice(0, 25)) : null,
        updatedAt:     journey.updatedAt    || null,
        tcId:          vehicleFull          ? (vehicleFull.tcId || null) : null,
        _loading:      false
      })

      // Tracé avec la vraie géométrie
      var vehicleDist = journey.position ? (journey.position.distanceTraveled || 0) : 0
      if (pathData && pathData.p && pathData.p.length > 1) {
        this._drawRouteFromPath(pathData.p, journey.calls || [], vehicleDist, netColor)
      } else if (journey.calls && journey.calls.length > 0) {
        this._drawRouteFromCalls(journey.calls, vehicleDist, netColor)
      }
    } catch (e) {
      console.warn('[bus_tracker] detail:', e)
    }
  },

  // ─── Tracé depuis /api/paths (géométrie exacte) ───────────────────────────
  // Format: { p: [[lat, lng, distanceMeters], ...] }
  _drawRouteFromPath(p, calls, vehicleDist, color) {
    var map = this._map
    if (!map) return

    var features = []

    // Convertir [lat, lng, dist] → { coord: [lng, lat], dist }
    var pts = p.map(function(pt) {
      return { coord: [pt[1], pt[0]], dist: pt[2] || 0 }
    })

    // Trouver l'index de fracture (position du véhicule sur le tracé)
    var splitIdx = 0
    for (var i = 0; i < pts.length - 1; i++) {
      if (pts[i].dist <= vehicleDist && pts[i + 1].dist > vehicleDist) {
        splitIdx = i
        break
      }
      if (pts[i].dist > vehicleDist) { splitIdx = Math.max(0, i - 1); break }
      splitIdx = i
    }

    // Interpolation linéaire pour le point exact du véhicule
    var interp = pts[splitIdx].coord
    if (splitIdx < pts.length - 1) {
      var a = pts[splitIdx], b = pts[splitIdx + 1]
      var span = b.dist - a.dist
      var t = span > 0 ? Math.min(1, (vehicleDist - a.dist) / span) : 0
      interp = [
        a.coord[0] + (b.coord[0] - a.coord[0]) * t,
        a.coord[1] + (b.coord[1] - a.coord[1]) * t
      ]
    }

    // Segment passé
    var pastCoords = pts.slice(0, splitIdx + 1).map(function(pt) { return pt.coord })
    pastCoords.push(interp)
    if (pastCoords.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: pastCoords },
        properties: { seg: 'past', color: color }
      })
    }

    // Segment à venir
    var futureCoords = [interp].concat(pts.slice(splitIdx + 1).map(function(pt) { return pt.coord }))
    if (futureCoords.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: futureCoords },
        properties: { seg: 'future', color: color }
      })
    }

    // Points d'arrêt depuis les calls
    for (var c of calls) {
      if (!c.coordinates || c.coordinates.length < 2) continue
      if (c.callStatus === 'SKIPPED') continue
      var isPast = (c.distanceTraveled != null) ? (c.distanceTraveled <= vehicleDist) : false
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [c.coordinates[0], c.coordinates[1]] },
        properties: { st: isPast ? 'past' : 'future', stopName: c.stopName || '', color: color }
      })
    }

    var src = map.getSource(this._ROUTE_SRC)
    if (src) src.setData({ type: 'FeatureCollection', features: features })
  },

  // ─── Tracé fallback depuis les coordonnées des calls ─────────────────────
  _drawRouteFromCalls(calls, vehicleDist, color) {
    var map = this._map
    if (!map) return

    var features = []
    var valid = calls.filter(function(c) { return c.coordinates && c.coordinates.length >= 2 })

    // Séparation passé / futur par distanceTraveled
    var splitIdx = 0
    for (var i = 0; i < valid.length; i++) {
      if (valid[i].distanceTraveled != null && valid[i].distanceTraveled <= vehicleDist) {
        splitIdx = i
      } else {
        break
      }
    }

    var toCoord = function(c) { return [c.coordinates[0], c.coordinates[1]] }

    if (splitIdx > 0) {
      var past = valid.slice(0, splitIdx + 1).map(toCoord)
      if (past.length >= 2) features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: past }, properties: { seg: 'past', color: color } })
    }
    if (splitIdx < valid.length - 1) {
      var future = valid.slice(splitIdx).map(toCoord)
      if (future.length >= 2) features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: future }, properties: { seg: 'future', color: color } })
    }

    for (var c of valid) {
      if (c.callStatus === 'SKIPPED') continue
      var isPast = c.distanceTraveled != null ? c.distanceTraveled <= vehicleDist : false
      features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: toCoord(c) }, properties: { st: isPast ? 'past' : 'future', stopName: c.stopName || '', color: color } })
    }

    var src = map.getSource(this._ROUTE_SRC)
    if (src) src.setData({ type: 'FeatureCollection', features: features })
  },

  // ─── Teardown ─────────────────────────────────────────────────────────────
  teardown(map) {
    if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null }
    if (this._rafId)     { cancelAnimationFrame(this._rafId); this._rafId = null }
    if (this._abortCtrl) { this._abortCtrl.abort(); this._abortCtrl = null }
    if (this._moveHandler)  { map.off('moveend',   this._moveHandler);  this._moveHandler  = null }
    if (this._clickHandler) { map.off('click',      this._clickHandler); this._clickHandler = null }
    if (this._enterHandler) { map.off('mouseenter', 'bt-icons', this._enterHandler); this._enterHandler = null }
    if (this._leaveHandler) { map.off('mouseleave', 'bt-icons', this._leaveHandler); this._leaveHandler = null }

    var layers = ['bt-text', 'bt-icons', 'bt-stops-future', 'bt-stops-past', 'bt-route-future', 'bt-route-past']
    for (var id of layers) {
      if (map.getLayer(id)) map.removeLayer(id)
    }
    if (map.getSource(this._SRC))       map.removeSource(this._SRC)
    if (map.getSource(this._ROUTE_SRC)) map.removeSource(this._ROUTE_SRC)
    if (map.hasImage('bt-vehicle'))     map.removeImage('bt-vehicle')

    this._vehicles = null
    this._rendered = null
    this._networks = null
    this._map = null
  }
})
