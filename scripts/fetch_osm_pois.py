#!/usr/bin/env python3
"""Fetch real, named shops around each market from OpenStreetMap via Overpass.
Writes data/osm-pois.json (compact) and commits it back to the repo.
Run from .github/workflows/osm-poi-fetch.yml (sandbox proxy blocks Overpass).
"""
import json, time, urllib.request, urllib.parse, os, sys

MARKETS = [
  ("aminabad-market-lucknow", 26.85300000, 80.91300000),
  ("bada-bazaar-udaipur", 24.58600000, 73.68900000),
  ("bahrisons-books-khan-market", 28.59930000, 77.22860000),
  ("bapu-bazaar-jaipur", 26.91460000, 75.81220000),
  ("begum-bazaar-hyderabad", 17.38500000, 78.48700000),
  ("big-bazaar-gorakhpur-rapti", 26.78000000, 83.39000000),
  ("biz-express-avenue-chn", 13.05680000, 80.26410000),
  ("biz-hazratganj-market-luc", 26.84670000, 80.94620000),
  ("biz-hitech-city-hyd", 17.45040000, 78.38070000),
  ("biz-jaipur-gems-jai", 26.91240000, 75.82360000),
  ("biz-phoenix-marketcity-pun", 18.55920000, 73.92340000),
  ("biz-phoenix-palladium-mum", 18.99480000, 72.82880000),
  ("biz-sector18-market-noi", 28.57090000, 77.32180000),
  ("biz-select-citywalk-nd", 28.52740000, 77.21960000),
  ("biz-south-city-mall-kol", 22.49200000, 88.37560000),
  ("biz-ub-city-blr", 12.97160000, 77.59460000),
  ("bowbazar-kolkata", 22.56500000, 88.35800000),
  ("broadway-market-kochi", 9.96900000, 76.24400000),
  ("chalai-market-thiruvananthapuram", 8.48600000, 76.95000000),
  ("chandni-chowk-market-delhi", 28.65060000, 77.22980000),
  ("chandpole-bazaar-jaipur", 26.92900000, 75.81100000),
  ("chaura-bazaar-ludhiana", 30.91200000, 75.85300000),
  ("chickpet-market-bengaluru", 12.96900000, 77.57700000),
  ("chowk-lucknow", 26.85700000, 80.90800000),
  ("clock-tower-market-jodhpur", 26.29500000, 73.02500000),
  ("colaba-causeway-market-mumbai", 18.92370000, 72.83340000),
  ("college-street-kolkata", 22.57300000, 88.35300000),
  ("commercial-street-bengaluru", 12.97960000, 77.60100000),
  ("connaught-place-market", 28.63150000, 77.21670000),
  ("crawford-market-mumbai", 18.93980000, 72.83550000),
  ("crossword-bookstores-mumbai", 18.96710000, 72.80960000),
  ("crown-interiorz-mall-faridabad", 28.40890000, 77.29210000),
  ("decathlon-marathahalli-bangalore", 12.95670000, 77.70090000),
  ("devaraja-market-mysuru", 12.30600000, 76.64400000),
  ("dilli-haat-ina-delhi", 28.56940000, 77.20680000),
  ("fashion-street-mumbai", 18.93380000, 72.83260000),
  ("gariahat-market-kolkata", 22.51880000, 88.36610000),
  ("general-bazaar-secunderabad", 17.43800000, 78.49700000),
  ("godowlia-market-varanasi", 25.31200000, 83.00700000),
  ("great-india-place-noida", 28.57050000, 77.32190000),
  ("hall-bazaar-amritsar", 31.62600000, 74.87400000),
  ("hatibagan-market-kolkata", 22.59600000, 88.37500000),
  ("hazratganj-market-lucknow", 26.84820000, 80.94410000),
  ("hill-road-market-mumbai", 19.05430000, 72.83270000),
  ("hindmata-market-mumbai", 19.01780000, 72.84070000),
  ("hong-kong-lane-pune", 18.50900000, 73.84000000),
  ("janpath-market-delhi", 28.62990000, 77.21830000),
  ("jayanagar-4th-block-bengaluru", 12.92500000, 77.59300000),
  ("johari-bazaar-jaipur", 26.91950000, 75.82460000),
  ("khan-market-delhi", 28.60030000, 77.22740000),
  ("khan-market-delhi-main", 28.59930000, 77.22860000),
  ("laad-bazaar-hyderabad", 17.36160000, 78.47470000),
  ("lajpat-nagar-central-market", 28.57030000, 77.23640000),
  ("law-garden-market-ahmedabad", 23.03300000, 72.55900000),
  ("laxmi-nagar-wholesale-market", 28.63080000, 77.27930000),
  ("laxmi-road-pune", 18.51900000, 73.85500000),
  ("linking-road-market-mumbai", 19.05600000, 72.83120000),
  ("malabar-gold-kamla-nagar", 28.66600000, 77.20830000),
  ("malleshwaram-8th-cross-bengaluru", 13.00200000, 77.56900000),
  ("manek-chowk-ahmedabad", 23.02200000, 72.58500000),
  ("mangaldas-market-mumbai", 18.94970000, 72.83500000),
  ("maurya-lok-complex-patna", 25.60900000, 85.13900000),
  ("mi-road-jaipur", 26.91500000, 75.80900000),
  ("moazzam-jahi-market-hyderabad", 17.38200000, 78.47700000),
  ("mohammed-ali-road-mumbai", 18.95500000, 72.83200000),
  ("nalli-silks-tnagar", 13.04220000, 80.23300000),
  ("new-market-kolkata", 22.56500000, 88.35250000),
  ("pacific-mall-dwarka-s10", 28.59000000, 77.04000000),
  ("pari-chowk-alpha-mall-gn", 28.46720000, 77.50320000),
  ("phoenix-palladium-mumbai", 19.00160000, 72.82960000),
  ("pondy-bazaar-chennai", 13.04180000, 80.23410000),
  ("pothys-tnagar", 13.04200000, 80.23450000),
  ("ranganathan-street-chennai", 13.04100000, 80.23300000),
  ("ring-road-textile-market-surat", 21.20300000, 72.83900000),
  ("ritchie-street-chennai", 13.07800000, 80.26800000),
  ("sadar-bazaar-agra", 27.15500000, 78.03600000),
  ("sadar-bazaar-delhi", 28.65620000, 77.21800000),
  ("sadar-bazar-agra", 27.18330000, 78.00720000),
  ("sarafa-bazaar-indore", 22.71900000, 75.85800000),
  ("sarojini-nagar-market-delhi", 28.57930000, 77.19170000),
  ("seasons-mall-pune", 18.50240000, 73.93900000),
  ("select-citywalk-saket-delhi", 28.52910000, 77.21650000),
  ("shivajinagar-market-bengaluru", 12.98200000, 77.60400000),
  ("sitabuldi-main-road-nagpur", 21.15000000, 79.08800000),
  ("sowcarpet-market-chennai", 13.09100000, 80.28400000),
  ("sultan-bazaar-hyderabad", 17.38600000, 78.49300000),
  ("thatheri-bazaar-varanasi", 25.31100000, 83.00400000),
  ("tt-nagar-new-market-bhopal", 23.22400000, 77.43700000),
  ("tulsi-baug-pune", 18.51800000, 73.85600000),
  ("ub-city-mall-bangalore", 12.97310000, 77.59640000),
  ("vishwanath-gali-varanasi", 25.31090000, 83.01040000),
  ("world-trade-park-jaipur", 26.86440000, 75.80720000),
  ("zaveri-bazaar-mumbai", 18.95300000, 72.83420000)
]

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

QUERY_TMPL = """[out:json][timeout:60];
(
  nwr(around:300,{lat},{lon})[name][shop];
  nwr(around:300,{lat},{lon})[name][amenity~"^(restaurant|cafe|fast_food|bar|pub|ice_cream|food_court|bakery|pharmacy|bank|hospital|clinic|doctors|dentist|fuel|marketplace|atm)$"];
  nwr(around:300,{lat},{lon})[name][tourism~"^(hotel|guest_house|hostel)$"];
  nwr(around:300,{lat},{lon})[name][craft];
  nwr(around:300,{lat},{lon})[name][office~"^(estate_agent|financial|insurance|company)$"];
);
out tags center;"""

def overpass(query, market_slug):
    data = urllib.parse.urlencode({"data": query}).encode()
    last_err = None
    for ep in ENDPOINTS:
        try:
            req = urllib.request.Request(ep, data=data, headers={"User-Agent": "mapsnearme-poi-fetch/1.0"})
            with urllib.request.urlopen(req, timeout=45) as r:
                return json.loads(r.read().decode())
        except Exception as e:
            last_err = e
            time.sleep(1.5)
    print(f"WARN: failed market {market_slug}: {last_err}", flush=True)
    return None

os.makedirs("data", exist_ok=True)
out = []
for i, (slug, lat, lon) in enumerate(MARKETS):
    res = overpass(QUERY_TMPL.format(lat=lat, lon=lon), slug)
    n = 0
    if res and res.get("elements"):
        for el in res["elements"]:
            tags = el.get("tags", {}) or {}
            name = tags.get("name", "").strip()
            if not name or len(name) < 2:
                continue
            if el.get("type") == "node":
                plat, plon = el.get("lat"), el.get("lon")
            else:
                c = el.get("center") or {}
                plat, plon = c.get("lat"), c.get("lon")
            if plat is None or plon is None:
                continue
            keep = {"m": slug, "n": name, "lat": round(plat, 6), "lon": round(plon, 6)}
            for tag in ("shop", "amenity", "tourism", "craft", "office"):
                if tag in tags:
                    keep["t"] = tags[tag]
                    break
            if "t" not in keep:
                continue
            for src, dst in (("phone", "phone"), ("website", "web"), ("opening_hours", "oh"), ("brand", "brand"), ("cuisine", "cuisine"), ("addr:housenumber", "hn"), ("addr:street", "st")):
                if tags.get(src):
                    keep[dst] = tags[src][:120]
            out.append(keep)
            n += 1
    print(f"[{i+1}/{len(MARKETS)}] {slug}: {n} named POIs", flush=True)
    # incremental save so even a partial run keeps data
    with open("data/osm-pois.json", "w") as f:
        json.dump(out, f, ensure_ascii=False)
    time.sleep(2)

print(f"TOTAL: {len(out)} POIs written to data/osm-pois.json", flush=True)
