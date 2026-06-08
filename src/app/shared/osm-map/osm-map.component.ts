import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-osm-map',
  standalone: true,
  template: `<div #mapContainer class="osm-map-container"></div>`,
  styles: [
    `
      .osm-map-container {
        width: 100%;
        height: 100%;
        min-height: 200px;
        border-radius: 16px;
        overflow: hidden;
        z-index: 0;
      }
    `,
  ],
})
export class OsmMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  @Input() latitude: number | null = null;
  @Input() longitude: number | null = null;
  @Input() zoom = 15;
  @Input() draggable = false;
  @Input() markerText = 'Vị trí nhà trọ';

  private map?: L.Map;
  private marker?: L.Marker;

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.map && (changes['latitude'] || changes['longitude'])) {
      this.updateMarker();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initMap(): void {
    const lat = this.latitude ?? 21.0285;
    const lng = this.longitude ?? 105.8542;

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [lat, lng],
      zoom: this.zoom,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    this.marker = L.marker([lat, lng], { icon, draggable: this.draggable }).addTo(this.map);
    this.marker.bindPopup(this.markerText);

    if (this.draggable) {
      this.marker.on('dragend', () => {
        const pos = this.marker!.getLatLng();
        this.latitude = pos.lat;
        this.longitude = pos.lng;
      });
    }

    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  private updateMarker(): void {
    if (!this.map || !this.marker || this.latitude == null || this.longitude == null) return;
    const pos: L.LatLngExpression = [this.latitude, this.longitude];
    this.marker.setLatLng(pos);
    this.map.setView(pos, this.zoom);
  }

  getPosition(): { latitude: number; longitude: number } | null {
    if (this.latitude == null || this.longitude == null) return null;
    return { latitude: this.latitude, longitude: this.longitude };
  }

  setPosition(lat: number, lng: number): void {
    this.latitude = lat;
    this.longitude = lng;
    this.updateMarker();
  }
}
