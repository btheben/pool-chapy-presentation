import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface PreferenceLogoOption {
  id: number;
  code: string;
  displayName: string;
  logoUrl: string;
  sourceType: string;
  theme: string;
}

export interface MyPreferences {
  seasonMemberId: number;
  displayMode: string;
  logoAssetId: number | null;
  logoUrl: string | null;
  availableLogos: PreferenceLogoOption[];
}

export interface UpdateMyPreferencesRequest {
  displayMode: string;
  logoAssetId: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class PreferencesService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://192.168.2.13:8081/api/preferences';

  getMyPreferences() {
    return this.http.get<MyPreferences>(`${this.baseUrl}/me`, {
      withCredentials: true,
    });
  }

  updateMyPreferences(payload: UpdateMyPreferencesRequest) {
    return this.http.put<MyPreferences>(`${this.baseUrl}/me`, payload, {
      withCredentials: true,
    });
  }
}
