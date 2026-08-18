import axiosClient from '@/api/axiosClient';

export interface CreateTripPayload {
  trip_type: 'MID_MILE_TRANSFER' | 'LAST_MILE_DELIVERY';
  tripType?: 'MID_MILE_TRANSFER' | 'LAST_MILE_DELIVERY';
  planned_tracking_codes: string[];
  plannedTrackingCodes?: string[];
  driver_id?: string | null;
  driverId?: string | null;
  destination_hub_id?: string | null;
  destinationHubId?: string | null;
}

export interface TripResponse {
  success: boolean;
  message: string;
  data: {
    trip_code: string;
    tripCode: string;
    trip_type: string;
    tripType: string;
    status: string;
    planned_count: number;
    plannedCount: number;
    origin_hub_id: string;
    originHubId: string;
    created_at: string;
    createdAt: string;
  };
}

export const tripsApi = {
  createTrip: (payload: CreateTripPayload): Promise<TripResponse> =>
    axiosClient.post<TripResponse>('/trips', payload).then(r => r.data),
};
