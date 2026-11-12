#!/bin/sh
# 역사 국경 원본 지도 내려받기 (https://github.com/aourednik/historical-basemaps, GPL-3.0)
mkdir -p raw
for y in bc2000 bc500 bc323 bc200 100 600 800 1000 1200 1279 1500 1600 1783 1815 1880 1900 1914 1920 1938 1945 1960 1994; do
  curl -sS -o raw/world_$y.geojson https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_$y.geojson
done
