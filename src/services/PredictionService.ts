import type {
  PredictionInput,
  CongestionPrediction,
  SubwayArrival,
  TrafficSegment,
} from '../types'

export interface IPredictionService {
  predict(input: PredictionInput): Promise<CongestionPrediction>
}

export interface ISubwayDataService {
  fetchArrivals(stationName: string): Promise<SubwayArrival[]>
}

export interface ITrafficDataService {
  fetchTrafficNear(lat: number, lng: number, radiusKm: number): Promise<TrafficSegment[]>
}
