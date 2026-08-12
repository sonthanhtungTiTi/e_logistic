import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, LocateFixed, MapPin, Search, CheckCircle, RefreshCw, X } from 'lucide-react';

interface WarehouseMapPickerProps {
  latitude: string;
  longitude: string;
  onChange: (lat: string, lng: string, addressHint?: string) => void;
  darkTheme?: boolean;
  initialAddressQuery?: string;
}

interface SearchResultItem {
  id: string;
  lat: string;
  lng: string;
  displayName: string;
  source: string;
}

// Marker Pin Icon định vị kho vận nổi bật
const createPinIcon = () =>
  L.divIcon({
    className: 'custom-warehouse-pin',
    html: `
      <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 42px; height: 42px; background: rgba(6, 182, 212, 0.4); border-radius: 50%; animation: pulse 1.8s infinite;"></div>
        <div style="position: relative; width: 32px; height: 32px; background: #ef4444; border: 3px solid #ffffff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 18px rgba(0,0,0,0.65);">
          <div style="width: 10px; height: 10px; background: #ffffff; border-radius: 50%; transform: rotate(45deg);"></div>
        </div>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 42],
    popupAnchor: [0, -42],
  });

export const WarehouseMapPicker: React.FC<WarehouseMapPickerProps> = ({
  latitude,
  longitude,
  onChange,
  darkTheme = true,
  initialAddressQuery = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState(initialAddressQuery);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>('');

  const numLat = parseFloat(latitude) || 10.812569;
  const numLng = parseFloat(longitude) || 106.668425;

  // Reverse Geocode qua OpenStreetMap Nominatim API khi chấm vị trí
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.display_name) {
          setSelectedAddress(data.display_name);
          return data.display_name;
        }
      }
    } catch (err) {
      console.warn('Reverse geocode warning:', err);
    }
    return '';
  };

  // 1. Khởi tạo Leaflet Map khi component mounted
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Tránh khởi tạo lại

    const map = L.map(mapContainerRef.current, {
      center: [numLat, numLng],
      zoom: 16,
      zoomControl: true,
    });

    // Tile Layer: Sử dụng OpenStreetMap Standard Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors | E-Logistic GIS',
    }).addTo(map);

    // Tạo Pin Marker
    const marker = L.marker([numLat, numLng], {
      icon: createPinIcon(),
      draggable: true,
    }).addTo(map);

    marker.bindPopup(`<b>Kho Hàng E-Logistic</b><br/>Tọa độ: ${numLat.toFixed(6)}, ${numLng.toFixed(6)}`).openPopup();

    markerRef.current = marker;
    mapInstanceRef.current = map;

    // Sự kiện khi KÉO GHIM (Drag end)
    marker.on('dragend', async () => {
      const pos = marker.getLatLng();
      const newLat = pos.lat.toFixed(6);
      const newLng = pos.lng.toFixed(6);
      const addr = await reverseGeocode(pos.lat, pos.lng);
      marker.setPopupContent(`<b>Vị Trí Đã Chọn</b><br/>${newLat}, ${newLng}`).openPopup();
      onChange(newLat, newLng, addr);
    });

    // Sự kiện khi CHẤM VỊ TRÍ TRÊN BẢN ĐỒ (Click event)
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const newLat = lat.toFixed(6);
      const newLng = lng.toFixed(6);

      marker.setLatLng([lat, lng]);
      const addr = await reverseGeocode(lat, lng);
      marker.setPopupContent(`<b>Kho Hàng Chấm Vị Trí</b><br/>${newLat}, ${newLng}`).openPopup();

      map.panTo([lat, lng], { animate: true });
      onChange(newLat, newLng, addr);
    });

    // Invalidate map size sau render để định hình đúng chiều rộng/cao
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Cập nhật vị trí Marker khi Props latitude / longitude từ ngoài thay đổi
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const curPos = markerRef.current.getLatLng();
      if (Math.abs(curPos.lat - numLat) > 0.0001 || Math.abs(curPos.lng - numLng) > 0.0001) {
        markerRef.current.setLatLng([numLat, numLng]);
        mapInstanceRef.current.panTo([numLat, numLng], { animate: true });
        markerRef.current.setPopupContent(`<b>Kho Hàng Đã Đặt</b><br/>${numLat.toFixed(6)}, ${numLng.toFixed(6)}`);
      }
    }
  }, [latitude, longitude]);

  // 3. Xử lý Lấy GPS Hiện Tại của Thiết Bị
  const handleGetCurrentGPS = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ Geolocation API');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setIsLocating(false);

        if (mapInstanceRef.current && markerRef.current) {
          const latNum = parseFloat(lat);
          const lngNum = parseFloat(lng);
          markerRef.current.setLatLng([latNum, lngNum]);
          mapInstanceRef.current.flyTo([latNum, lngNum], 17, { animate: true });
        }

        const addr = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        onChange(lat, lng, addr);
      },
      (err) => {
        setIsLocating(false);
        console.error(err);
        alert('Không thể lấy vị trí hiện tại. Vui lòng cấp quyền vị trí cho trình duyệt.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 4. Tìm kiếm Địa Điểm Đa Nguồn (Photon Komoot + OpenStreetMap Nominatim)
  const executeSearch = async (queryText: string) => {
    if (!queryText || queryText.trim().length < 2) return;

    setIsSearching(true);
    const results: SearchResultItem[] = [];

    // Nguồn 1: Photon Geocoding API (Rất nhanh, hỗ trợ gõ tìm kiếm không dấu/có dấu ở VN)
    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(queryText)}&limit=5&lang=default`;
      const photonRes = await fetch(photonUrl);
      if (photonRes.ok) {
        const photonData = await photonRes.json();
        if (photonData.features && photonData.features.length > 0) {
          photonData.features.forEach((feat: any, idx: number) => {
            const [lng, lat] = feat.geometry.coordinates;
            const props = feat.properties;
            const parts = [
              props.name,
              props.street,
              props.housenumber,
              props.district || props.city,
              props.state || props.country,
            ].filter(Boolean);

            const label = parts.length > 0 ? parts.join(', ') : queryText;

            results.push({
              id: `photon-${idx}-${lat}-${lng}`,
              lat: lat.toFixed(6),
              lng: lng.toFixed(6),
              displayName: label,
              source: 'Photon GIS',
            });
          });
        }
      }
    } catch (e) {
      console.warn('Photon geocoding fallback:', e);
    }

    // Nguồn 2: Nominatim API (Mở rộng nếu kết quả ít)
    if (results.length < 3) {
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          queryText
        )}&countrycodes=vn&limit=5&accept-language=vi`;
        const nomRes = await fetch(nomUrl);
        if (nomRes.ok) {
          const nomData = await nomRes.json();
          nomData.forEach((item: any, idx: number) => {
            const latStr = parseFloat(item.lat).toFixed(6);
            const lngStr = parseFloat(item.lon).toFixed(6);
            // Tránh trùng lắp tọa độ gần
            if (!results.some((r) => Math.abs(parseFloat(r.lat) - parseFloat(latStr)) < 0.001)) {
              results.push({
                id: `nom-${idx}-${item.place_id}`,
                lat: latStr,
                lng: lngStr,
                displayName: item.display_name,
                source: 'OpenStreetMap',
              });
            }
          });
        }
      } catch (e) {
        console.warn('Nominatim geocoding fallback:', e);
      }
    }

    setIsSearching(false);
    setSearchResults(results);
    setShowDropdown(true);

    // Nếu chỉ bấm Tìm Kiếm và có kết quả đầu tiên -> Tự động Di chuyển bản đồ luôn
    if (results.length > 0) {
      selectLocationResult(results[0]);
    } else {
      alert(`Không tìm thấy địa điểm: "${queryText}". Vui lòng thử nhập tên đường, tòa nhà hoặc Tỉnh/Thành cụ thể hơn.`);
    }
  };

  // Select một kết quả từ danh sách gợi ý
  const selectLocationResult = (item: SearchResultItem) => {
    const latNum = parseFloat(item.lat);
    const lngNum = parseFloat(item.lng);

    setSelectedAddress(item.displayName);
    setShowDropdown(false);

    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([latNum, lngNum]);
      mapInstanceRef.current.flyTo([latNum, lngNum], 17, { animate: true, duration: 1.5 });
      markerRef.current.setPopupContent(`<b>${item.displayName}</b><br/>Tọa độ: ${item.lat}, ${item.lng}`).openPopup();
    }

    onChange(item.lat, item.lng, item.displayName);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(searchQuery);
  };

  return (
    <div className="space-y-3">
      {/* Ô Tìm Kiếm Địa Điểm & Tự Động Định Vị GPS */}
      <div className="relative z-30">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.length >= 3) {
                  const handler = setTimeout(() => {
                    executeSearch(e.target.value);
                  }, 600);
                  return () => clearTimeout(handler);
                } else {
                  setShowDropdown(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  executeSearch(searchQuery);
                }
              }}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true);
              }}
              placeholder="Nhập địa chỉ, tên đường hoặc tòa nhà (VD: 12 Nguyễn Văn Bảo, Gò Vấp)..."
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-10 pr-28 py-2.5 text-xs focus:outline-none focus:border-cyan-400 transition shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowDropdown(false);
                }}
                className="absolute right-20 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => executeSearch(searchQuery)}
              disabled={isSearching}
              className="absolute right-1.5 top-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[11px] font-bold rounded-lg transition shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1"
            >
              {isSearching ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Tìm Vị Trí'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleGetCurrentGPS}
            disabled={isLocating}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <LocateFixed className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
            {isLocating ? 'Đang xác định...' : 'GPS Hiện Tại'}
          </button>
        </div>

        {/* Dropdown Danh Sách Kết Quả Gợi Ý Đọc Địa Điểm */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-50 divide-y divide-slate-800">
            {searchResults.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectLocationResult(item)}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-800/80 transition flex items-start gap-3 group cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 group-hover:scale-110 transition" />
                <div className="space-y-0.5">
                  <p className="text-xs text-slate-100 font-semibold leading-snug group-hover:text-cyan-300 transition">
                    {item.displayName}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Lat: {item.lat} | Lng: {item.lng} • <span className="text-cyan-500">{item.source}</span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Thẻ Hướng Dẫn Chấm Vị Trí */}
      <div className="flex items-center justify-between text-[11px] text-cyan-300 bg-cyan-950/40 border border-cyan-500/20 px-3 py-2 rounded-xl">
        <span className="flex items-center gap-1.5 font-medium">
          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          Bấm <strong>"Tìm Vị Trí"</strong> hoặc <strong>chấm trực tiếp trên bản đồ</strong> để xác định tọa độ kho.
        </span>
        <span className="hidden sm:inline-block font-mono text-[10px] text-slate-400">
          GIS Engine: Leaflet WGS84
        </span>
      </div>

      {/* Khung Khởi Tạo Leaflet Map Interactive */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950">
        <div
          ref={mapContainerRef}
          className="w-full h-72 sm:h-80 z-10"
          style={{ cursor: 'crosshair' }}
        />

        {/* Badge Tọa Độ Đã Chọn Trực Quan trên góc Map */}
        <div className="absolute bottom-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-2 rounded-xl text-xs space-y-0.5 shadow-xl max-w-sm">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
            <CheckCircle className="w-3.5 h-3.5" />
            Tọa Độ GPS Kho Đã Chấm
          </div>
          <div className="font-mono text-cyan-300 font-bold">
            Lat: {latitude || '10.812569'} | Lng: {longitude || '106.668425'}
          </div>
          {selectedAddress && (
            <div className="text-[10px] text-slate-300 truncate font-normal">
              {selectedAddress}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
