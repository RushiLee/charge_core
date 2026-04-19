package com.spironet.chargecore.service;

import com.spironet.chargecore.dto.Location;
import com.spironet.chargecore.dto.Station;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class StationService {
    private final Map<String, Station> stations = new ConcurrentHashMap<>();

    public StationService() {
        initializeStations();
    }

    private void initializeStations() {
        // 15 Kenyan stations across major cities
        String[] stationNames = {
                "Nairobi CBD Station", "Mombasa Beach Hub", "Kisumu Lakeside", "Nakuru Town Center",
                "Eldoret Sports Ground", "Thika Road Mall", "Machakos Town", "Malindi Ferry Terminal",
                "Naivasha Geothermal", "Nyeri Central", "Kitale Farmstead", "Garissa Oasis",
                "Kakamega Rainforest", "Meru Market", "Voi Safari Stop"
        };

        // Kenyan coordinates (lat, lng)
        double[][] coordinates = {
                {-1.286389, 36.817223},   // Nairobi
                {-4.043477, 39.668206},   // Mombasa
                {-0.091702, 34.767956},   // Kisumu
                {-0.303099, 36.080026},   // Nakuru
                {0.514311, 35.269779},    // Eldoret
                {-1.162281, 36.971729},   // Thika Road, Nairobi
                {-1.522423, 37.263206},   // Machakos
                {-3.223294, 40.130173},   // Malindi
                {-0.716667, 36.433333},   // Naivasha
                {-0.420000, 36.950000},   // Nyeri
                {1.019091, 35.002296},    // Kitale
                {-0.449444, 39.633333},   // Garissa
                {0.282731, 34.751863},    // Kakamega
                {0.050000, 37.650000},    // Meru
                {-3.352697, 38.514267}    // Voi
        };

        String[] statuses = {
                "operational", "operational", "operational", "maintenance",
                "operational", "operational", "operational", "operational",
                "operational", "maintenance", "operational", "operational",
                "operational", "operational", "operational"
        };

        Random random = new Random();
        Instant baseTime = Instant.parse("2026-04-18T10:30:00Z");

        for (int i = 0; i < 15; i++) {
            String id = String.format("station_%03d", i + 1);
            Location location = new Location(coordinates[i][0], coordinates[i][1]);

            // Random battery availability between 0-12
            int totalBatteries = 12;
            int batteryAvailability = Math.min(totalBatteries, 4 + random.nextInt(9));

            Station station = new Station(
                    id,
                    stationNames[i],
                    location,
                    batteryAvailability,
                    totalBatteries,
                    statuses[i],
                    baseTime
            );

            stations.put(id, station);
        }
    }

    public List<Station> getAllStations() {
        return new ArrayList<>(stations.values());
    }

    public Optional<Station> getStationById(String id) {
        return Optional.ofNullable(stations.get(id));
    }

    public synchronized Station reduceBattery(String stationId) {
        Station station = stations.get(stationId);
        if (station == null) {
            throw new IllegalArgumentException("Station not found with id: " + stationId);
        }

        if (station.getBatteryAvailability() <= 0) {
            throw new IllegalStateException("No battery available at station: " + station.getName());
        }

        station.setBatteryAvailability(station.getBatteryAvailability() - 1);
        station.setLastUpdated(Instant.now());

        // Update status if out of batteries
        if (station.getBatteryAvailability() == 0) {
            station.setStatus("out_of_stock");
        }

        return station;
    }

    // NEW METHOD: Increase batteries (restock)
    public synchronized Station increaseBattery(String stationId, int quantity) {
        Station station = stations.get(stationId);
        if (station == null) {
            throw new IllegalArgumentException("Station not found with id: " + stationId);
        }

        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be positive. Provided: " + quantity);
        }

        int newAvailability = station.getBatteryAvailability() + quantity;

        // Cap at totalBatteries capacity
        if (newAvailability > station.getTotalBatteries()) {
            newAvailability = station.getTotalBatteries();
        }

        int actualAdded = newAvailability - station.getBatteryAvailability();
        station.setBatteryAvailability(newAvailability);
        station.setLastUpdated(Instant.now());

        // Update status if batteries are now available
        if (station.getBatteryAvailability() > 0 && station.getStatus().equals("out_of_stock")) {
            station.setStatus("operational");
        }

        return station;
    }
    // Optional: Get stations by city/region
    public List<Station> getStationsByRegion(String region) {
        Map<String, List<String>> regionMap = Map.of(
                "Nairobi", List.of("station_001", "station_006", "station_007"),
                "Coast", List.of("station_002", "station_008", "station_015"),
                "Lake", List.of("station_003", "station_013"),
                "Rift", List.of("station_004", "station_005", "station_009", "station_011"),
                "Central", List.of("station_010", "station_014"),
                "North Eastern", List.of("station_012")
        );

        List<String> stationIds = regionMap.getOrDefault(region, List.of());
        return stationIds.stream()
                .map(stations::get)
                .filter(Objects::nonNull)
                .toList();
    }
}