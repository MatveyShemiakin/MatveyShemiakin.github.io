# Satellite events globe

Goal: Replace the schematic land texture with real satellite imagery, progressively load more detailed imagery and city/road labels when zooming, and retain mobile gestures and event links in both languages.

Architecture: Existing vanilla canvas globe plus a lazy, bounded WMTS tile pyramid, using EOxCloudless 2016/2017 (CC BY 4.0) and EOX/OSM bright labels. No account, API key, new framework, geolocation, build pipeline or authored inline styles. Visible attribution and imagery date. Native Canvas works on devices without WebGL. City markers remain approximate city-centre locations. Provider errors retain accessible city/event lists.

Alternatives: Google/Esri require account/key/licensing; newer EOX imagery is non-commercial. Existing open CC BY satellite layer fits this personal site's deployment without introducing a subscription. Terrain/3D buildings are outside this request.

Tasks:
- [x] Verify official source licence, WMTS endpoints and CORS.
- [x] Test LOD, date-line wrap, polar clamp, inverse projection, raster horizon, bounded concurrent requests and error retry suppression.
- [x] Add lazy satellite raster tile loading, parent fallback, bounded cache and zoom-dependent labels.
- [x] Retain touch rotation/pinch, keyboard, event filters/details; allow city-level zoom and reset.
- [ ] Run required shared-header/calendar checks; publish and inspect live RU/EN desktop/mobile globe and city view.

Review focus: failed provider must not flood requests; in-flight loads cannot duplicate on repaint; date-line/poles must remain valid; city selection must retain events; mobile must retain zero horizontal overflow.

Official references: https://maps.eox.at/ ; https://cloudless.eox.at/license-non-commercial ; WMTS capabilities https://tiles.maps.eox.at/wmts/1.0.0/WMTSCapabilities.xml .
