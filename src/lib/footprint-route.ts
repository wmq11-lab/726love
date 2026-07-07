export interface FootprintMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  records: Array<{ record_date: string }>;
}

export interface FootprintWaypoint {
  order: number;
  locationId: string;
  name: string;
  latitude: number;
  longitude: number;
  recordDate: string;
}

/** 按记忆时间排序，相邻同地点合并，生成足迹路线 */
export function buildFootprintRoute(markers: FootprintMarker[]): {
  waypoints: FootprintWaypoint[];
  path: [number, number][];
} {
  const stops = markers.flatMap((marker) =>
    marker.records.map((record) => ({
      locationId: marker.id,
      name: marker.name,
      latitude: marker.latitude,
      longitude: marker.longitude,
      recordDate: record.record_date,
      time: new Date(record.record_date).getTime(),
    })),
  );

  stops.sort((a, b) => a.time - b.time);

  const waypoints: FootprintWaypoint[] = [];
  for (const stop of stops) {
    const last = waypoints[waypoints.length - 1];
    if (last?.locationId === stop.locationId) continue;
    waypoints.push({
      order: waypoints.length + 1,
      locationId: stop.locationId,
      name: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      recordDate: stop.recordDate,
    });
  }

  const path = waypoints.map((w) => [w.longitude, w.latitude] as [number, number]);
  return { waypoints, path };
}
