package com.spironet.chargecore.service;

import com.spironet.chargecore.dto.Location;
import com.spironet.chargecore.dto.ServiceCenter;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ServiceCenterService {

    private final Map<String, ServiceCenter> serviceCenters = new ConcurrentHashMap<>();

    public ServiceCenterService() {
        initializeServiceCenters();
    }

    private void initializeServiceCenters() {

        serviceCenters.put("svc_001", ServiceCenter.builder()
                .id("svc_001")
                .stationId("station_001")
                .name("Nairobi Electrical Hub")
                .location(new Location(-1.286389, 36.817223))
                .specialization("ELECTRICAL")
                .services(List.of("MOTOR_REPAIR", "SPARES"))
                .technicianAvailable(true)
                .waitTime(10)
                .build());

        serviceCenters.put("svc_002", ServiceCenter.builder()
                .id("svc_002")
                .stationId("station_002")
                .name("Mombasa Garage")
                .location(new Location(-4.043477, 39.668206))
                .specialization("MECHANICAL")
                .services(List.of("TYRE_REPAIR", "BRAKES_REPAIR"))
                .technicianAvailable(false)
                .waitTime(25)
                .build());

        serviceCenters.put("svc_003", ServiceCenter.builder()
                .id("svc_003")
                .stationId("station_003")
                .name("Kisumu Full Service")
                .location(new Location(-0.091702, 34.767956))
                .specialization("FULL_SERVICE")
                .services(List.of("TYRE_REPAIR", "BRAKES_REPAIR", "MOTOR_REPAIR", "SPARES"))
                .technicianAvailable(true)
                .waitTime(5)
                .build());
    }

    public List<ServiceCenter> getAllServiceCenters() {
        return new ArrayList<>(serviceCenters.values());
    }

    public Optional<ServiceCenter> getById(String id) {
        return Optional.ofNullable(serviceCenters.get(id));
    }

    public Optional<ServiceCenter> getByStationId(String stationId) {
        return serviceCenters.values().stream()
                .filter(sc -> sc.getStationId().equals(stationId))
                .findFirst();
    }

    public List<ServiceCenter> getBySpecialization(String specialization) {
        return serviceCenters.values().stream()
                .filter(sc -> specialization.equalsIgnoreCase(sc.getSpecialization()))
                .toList();
    }

    public List<ServiceCenter> getByService(String serviceType) {
        return serviceCenters.values().stream()
                .filter(sc -> sc.getServices().contains(serviceType.toUpperCase()))
                .toList();
    }
}
