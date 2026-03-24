({
  setup(map) {
    var SOURCE = 'ext_monuments_paris_src'
    var CIRCLE = 'ext_monuments_paris_circle'
    var LABEL = 'ext_monuments_paris_label'

    var data = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2.2945, 48.8584] }, properties: { name: 'Tour Eiffel', type: 'Monument' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2.3500, 48.8606] }, properties: { name: 'Musée du Louvre', type: 'Musée' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2.3469, 48.8530] }, properties: { name: 'Notre-Dame', type: 'Cathédrale' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2.3125, 48.8738] }, properties: { name: 'Arc de Triomphe', type: 'Monument' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2.3364, 48.8867] }, properties: { name: 'Sacré-Cœur', type: 'Basilique' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2.3272, 48.8600] }, properties: { name: "Musée d'Orsay", type: 'Musée' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2.3522, 48.8566] }, properties: { name: 'Centre Pompidou', type: 'Musée' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2.3376, 48.8412] }, properties: { name: 'Panthéon', type: 'Monument' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2.3203, 48.8557] }, properties: { name: 'Les Invalides', type: 'Monument' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2.3317, 48.8600] }, properties: { name: 'Conciergerie', type: 'Monument' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2.3268, 48.8618] }, properties: { name: 'Pont Neuf', type: 'Pont' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2.2870, 48.8631] }, properties: { name: 'Palais de Chaillot', type: 'Monument' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2.3200, 48.8660] }, properties: { name: 'Grand Palais', type: 'Monument' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2.3376, 48.8462] }, properties: { name: 'Jardin du Luxembourg', type: 'Jardin' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2.3699, 48.8530] }, properties: { name: 'Place des Vosges', type: 'Place' } },
      ]
    }

    map.addSource(SOURCE, { type: 'geojson', data: data })

    map.addLayer({
      id: CIRCLE,
      type: 'circle',
      source: SOURCE,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 14, 12],
        'circle-color': '#d97706',
        'circle-opacity': 0.9,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fef3c7',
        'circle-stroke-opacity': 0.7
      }
    })

    map.addLayer({
      id: LABEL,
      type: 'symbol',
      source: SOURCE,
      minzoom: 12,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 11,
        'text-offset': [0, 1.5],
        'text-anchor': 'top'
      },
      paint: {
        'text-color': '#fcd34d',
        'text-halo-color': '#0f1117',
        'text-halo-width': 1.5
      }
    })

    map.on('mouseenter', CIRCLE, function() { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', CIRCLE, function() { map.getCanvas().style.cursor = '' })
  },

  teardown(map) {
    if (map.getLayer('ext_monuments_paris_label')) map.removeLayer('ext_monuments_paris_label')
    if (map.getLayer('ext_monuments_paris_circle')) map.removeLayer('ext_monuments_paris_circle')
    if (map.getSource('ext_monuments_paris_src')) map.removeSource('ext_monuments_paris_src')
  }
})
